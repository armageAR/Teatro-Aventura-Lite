<?php

namespace App\Http\Controllers;

use App\Models\Performance;
use App\Models\PerformanceQuestion;
use App\Models\Play;
use App\Models\Question;
use App\Models\SpectatorSession;
use App\Models\Vote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PerformanceController extends Controller
{
    public function index(Request $request, Play $play): JsonResponse
    {
        $query = $play->performances()->orderBy('scheduled_at');

        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        } elseif ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        return response()->json($query->get());
    }

    public function store(Request $request, Play $play): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['nullable', 'string', 'alpha_num', 'max:32', Rule::unique('performances', 'uid')],
            'scheduled_at' => ['required', 'date'],
            'location' => ['required', 'string', 'max:255'],
            'comment' => ['nullable', 'string', 'max:500'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date'],
        ]);

        $performance = $play->performances()->create($data);

        return response()->json($performance, 201);
    }

    public function show(Performance $performance): JsonResponse
    {
        return response()->json($performance->load('play'));
    }

    public function update(Request $request, Performance $performance): JsonResponse
    {
        $data = $request->validate([
            'uid' => [
                'sometimes',
                'required',
                'string',
                'alpha_num',
                'max:32',
                Rule::unique('performances', 'uid')->ignore($performance->id),
            ],
            'scheduled_at' => ['sometimes', 'required', 'date'],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
            'comment' => ['nullable', 'string', 'max:500'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date'],
        ]);

        $performance->update($data);

        return response()->json($performance->refresh());
    }

    public function destroy(Performance $performance): Response
    {
        $performance->delete();

        return response()->noContent();
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        try {
            $performance = Performance::where('join_token', $data['token'])->first();
        } catch (\Illuminate\Database\QueryException $e) {
            $performance = null;
        }

        if (!$performance) {
            return response()->json(['message' => 'Función no encontrada.'], 404);
        }

        $session = SpectatorSession::create([
            'performance_id' => $performance->id,
        ]);

        $performance->load('play');

        return response()->json([
            'spectator_session_id' => $session->spectator_session_id,
            'performance_id' => $performance->id,
            'performance_status' => $performance->status,
            'play_title' => $performance->play?->title,
        ], 201);
    }

    public function restore(int $performance): JsonResponse
    {
        $performance = Performance::withTrashed()->findOrFail($performance);
        $performance->restore();

        return response()->json($performance->fresh());
    }

    public function qr(Performance $performance): JsonResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', config('app.url')), '/');
        $joinUrl = $frontendUrl . '/join/' . $performance->join_token;

        return response()->json([
            'join_url' => $joinUrl,
            'join_token' => $performance->join_token,
        ]);
    }

    public function start(Performance $performance): JsonResponse
    {
        if ($performance->status === 'live') {
            return response()->json($performance->load('play'));
        }

        if ($performance->status !== 'draft') {
            abort(422, 'Solo se puede iniciar una función en estado borrador.');
        }

        $performance->update([
            'status' => 'live',
            'started_at' => now(),
        ]);

        return response()->json($performance->fresh()->load('play'));
    }

    public function close(Performance $performance): JsonResponse
    {
        if ($performance->status === 'closed') {
            return response()->json($performance->load('play'));
        }

        if ($performance->status !== 'live') {
            abort(422, 'Solo se puede cerrar una función en estado en vivo.');
        }

        $performance->update([
            'status' => 'closed',
            'ended_at' => now(),
        ]);

        return response()->json($performance->fresh()->load('play'));
    }

    public function questions(Performance $performance): JsonResponse
    {
        $performance->load('play.questions.options');

        $play = $performance->play;
        if (!$play) {
            return response()->json([]);
        }

        $performanceQuestions = PerformanceQuestion::where('performance_id', $performance->id)
            ->get()
            ->keyBy('question_id');

        $questions = $play->questions->map(function ($question) use ($performanceQuestions) {
            $pq = $performanceQuestions->get($question->id);
            $status = match (true) {
                $pq && $pq->closed_at !== null => 'closed',
                $pq && $pq->sent_at !== null => 'active',
                default => 'pending',
            };

            return [
                'id' => $question->id,
                'question' => $question->question,
                'order' => $question->order,
                'options' => $question->options,
                'performance_status' => $status,
                'sent_at' => $pq?->sent_at,
                'closed_at' => $pq?->closed_at,
                'winning_answer_option_id' => $pq?->winning_answer_option_id,
            ];
        });

        return response()->json($questions);
    }

    public function sendQuestion(Performance $performance, Question $question): JsonResponse
    {
        if ($performance->status !== 'live') {
            abort(422, 'Solo se pueden enviar preguntas en una función en vivo.');
        }

        if ((int) $question->play_id !== (int) $performance->play_id) {
            abort(422, 'La pregunta no pertenece a esta función.');
        }

        $pq = PerformanceQuestion::firstOrNew([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ]);

        // Idempotent: already active
        if ($pq->exists && $pq->sent_at && !$pq->closed_at) {
            return response()->json($this->buildQuestionStatus($pq, $question));
        }

        // Already closed: cannot re-send
        if ($pq->exists && $pq->closed_at) {
            abort(422, 'La pregunta ya fue cerrada y no puede volver a enviarse.');
        }

        // Enforce at most one active question per performance
        $activeExists = $performance->performanceQuestions()
            ->whereNotNull('sent_at')
            ->whereNull('closed_at')
            ->exists();

        if ($activeExists) {
            abort(422, 'Ya hay una pregunta activa. Ciérrela antes de enviar otra.');
        }

        $pq->sent_at = now();
        $pq->closed_at = null;
        $pq->save();

        return response()->json($this->buildQuestionStatus($pq->fresh(), $question));
    }

    public function closeQuestion(Performance $performance, Question $question): JsonResponse
    {
        if ($performance->status !== 'live') {
            abort(422, 'Solo se pueden cerrar preguntas en una función en vivo.');
        }

        if ((int) $question->play_id !== (int) $performance->play_id) {
            abort(422, 'La pregunta no pertenece a esta función.');
        }

        $pq = PerformanceQuestion::where([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ])->first();

        if (!$pq || !$pq->sent_at) {
            abort(422, 'La pregunta no ha sido enviada.');
        }

        // Idempotent: already closed
        if ($pq->closed_at) {
            return response()->json($this->buildQuestionStatus($pq, $question));
        }

        $pq->update(['closed_at' => now()]);

        return response()->json($this->buildQuestionStatus($pq->fresh(), $question));
    }

    public function live(Performance $performance): JsonResponse
    {
        $performanceQuestions = $performance->performanceQuestions()
            ->whereNotNull('sent_at')
            ->with('question.options')
            ->orderBy('sent_at')
            ->get();

        // Aggregate vote counts per option for each performance question
        $pqIds = $performanceQuestions->pluck('id');
        $voteCounts = Vote::whereIn('performance_question_id', $pqIds)
            ->select('performance_question_id', 'question_option_id', DB::raw('count(*) as cnt'))
            ->groupBy('performance_question_id', 'question_option_id')
            ->get()
            ->groupBy('performance_question_id');

        $questions = $performanceQuestions->map(function ($pq) use ($voteCounts) {
            $question = $pq->question;
            $status = $pq->closed_at !== null ? 'closed' : 'active';

            $pqVotes = $voteCounts->get($pq->id, collect());
            $countsByOption = $pqVotes->pluck('cnt', 'question_option_id');
            $totalVotes = $countsByOption->sum();

            $options = $question->options->map(function ($option) use ($countsByOption, $totalVotes) {
                $count = (int) $countsByOption->get($option->id, 0);
                return [
                    'id' => $option->id,
                    'text' => $option->text,
                    'order' => $option->order,
                    'vote_count' => $count,
                    'vote_percentage' => $totalVotes > 0 ? round(($count / $totalVotes) * 100, 1) : 0.0,
                ];
            });

            return [
                'id' => $question->id,
                'question' => $question->question,
                'order' => $question->order,
                'performance_status' => $status,
                'sent_at' => $pq->sent_at,
                'closed_at' => $pq->closed_at,
                'total_votes' => (int) $totalVotes,
                'options' => $options,
                'winning_answer_option_id' => $pq->winning_answer_option_id,
            ];
        });

        return response()->json([
            'performance_id' => $performance->id,
            'status' => $performance->status,
            'questions' => $questions,
        ]);
    }

    public function setWinner(Performance $performance, Question $question, Request $request): JsonResponse
    {
        if ((int) $question->play_id !== (int) $performance->play_id) {
            abort(422, 'La pregunta no pertenece a esta función.');
        }

        $pq = PerformanceQuestion::where([
            'performance_id' => $performance->id,
            'question_id' => $question->id,
        ])->first();

        if (!$pq || !$pq->closed_at) {
            abort(422, 'La votación de la pregunta debe estar cerrada antes de seleccionar un ganador.');
        }

        $data = $request->validate([
            'answer_option_id' => ['required', 'integer', 'exists:question_options,id'],
        ]);

        // Ensure the option belongs to this question
        $question->loadMissing('options');
        $optionIds = $question->options->pluck('id')->all();
        if (!in_array($data['answer_option_id'], $optionIds, true)) {
            abort(422, 'La opción no pertenece a esta pregunta.');
        }

        $pq->update(['winning_answer_option_id' => $data['answer_option_id']]);

        return response()->json($this->buildQuestionStatus($pq->fresh(), $question));
    }

    public function vote(Performance $performance, Request $request): JsonResponse
    {
        $data = $request->validate([
            'spectator_session_id' => ['required', 'string'],
            'question_option_id'   => ['required', 'integer', 'exists:question_options,id'],
            'client_vote_id'       => ['required', 'string', 'max:64'],
        ]);

        // Idempotency: if this client_vote_id was already used, return the existing vote
        $existing = Vote::where('client_vote_id', $data['client_vote_id'])->first();
        if ($existing) {
            return response()->json([
                'vote_id'            => $existing->id,
                'question_option_id' => $existing->question_option_id,
                'message'            => 'Voto ya registrado.',
            ]);
        }

        // Find the option and derive the question
        $option = \App\Models\QuestionOption::findOrFail($data['question_option_id']);

        // Find the performance_question for this question in this performance
        $pq = PerformanceQuestion::where('performance_id', $performance->id)
            ->where('question_id', $option->question_id)
            ->first();

        if (!$pq || !$pq->sent_at) {
            abort(422, 'La pregunta no está activa en esta función.');
        }

        if ($pq->closed_at) {
            abort(422, 'La votación ya está cerrada.');
        }

        // Check if this spectator already voted on this question
        $existingSpectator = Vote::where('performance_question_id', $pq->id)
            ->where('spectator_token', $data['spectator_session_id'])
            ->first();

        if ($existingSpectator) {
            return response()->json([
                'vote_id'            => $existingSpectator->id,
                'question_option_id' => $existingSpectator->question_option_id,
                'message'            => 'Ya votaste en esta pregunta.',
            ]);
        }

        $vote = Vote::create([
            'performance_question_id' => $pq->id,
            'question_option_id'      => $data['question_option_id'],
            'spectator_token'         => $data['spectator_session_id'],
            'client_vote_id'          => $data['client_vote_id'],
        ]);

        return response()->json([
            'vote_id'            => $vote->id,
            'question_option_id' => $vote->question_option_id,
            'message'            => 'Voto registrado correctamente.',
        ], 201);
    }

    public function current(Performance $performance, Request $request): JsonResponse
    {
        $performance->load('play');

        $spectatorSessionId = $request->query('spectator_session_id');

        // Find the currently active question (sent but not closed)
        $activePq = $performance->performanceQuestions()
            ->whereNotNull('sent_at')
            ->whereNull('closed_at')
            ->with('question.options')
            ->first();

        $activeQuestion = null;
        if ($activePq) {
            $question = $activePq->question;

            $hasVoted = false;
            $votedOptionId = null;

            if ($spectatorSessionId) {
                $vote = Vote::where('performance_question_id', $activePq->id)
                    ->where('spectator_token', $spectatorSessionId)
                    ->first();

                if ($vote) {
                    $hasVoted = true;
                    $votedOptionId = $vote->question_option_id;
                }
            }

            $activeQuestion = [
                'id' => $question->id,
                'question' => $question->question,
                'options' => $question->options->map(fn($o) => [
                    'id' => $o->id,
                    'text' => $o->text,
                    'order' => $o->order,
                ])->values(),
                'has_voted' => $hasVoted,
                'voted_option_id' => $votedOptionId,
            ];
        }

        return response()->json([
            'performance_id' => $performance->id,
            'status' => $performance->status,
            'play_title' => $performance->play?->title,
            'active_question' => $activeQuestion,
        ]);
    }

    private function buildQuestionStatus(PerformanceQuestion $pq, Question $question): array
    {
        $question->loadMissing('options');

        $status = match (true) {
            $pq->closed_at !== null => 'closed',
            $pq->sent_at !== null => 'active',
            default => 'pending',
        };

        return [
            'id' => $question->id,
            'question' => $question->question,
            'order' => $question->order,
            'options' => $question->options,
            'performance_status' => $status,
            'sent_at' => $pq->sent_at,
            'closed_at' => $pq->closed_at,
            'winning_answer_option_id' => $pq->winning_answer_option_id,
        ];
    }
}
