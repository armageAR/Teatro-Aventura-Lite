<?php

namespace App\Http\Controllers;

use App\Models\Performance;
use App\Models\PerformanceQuestion;
use App\Models\Play;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
        ];
    }
}
