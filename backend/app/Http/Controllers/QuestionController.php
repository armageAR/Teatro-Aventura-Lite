<?php

namespace App\Http\Controllers;

use App\Models\Play;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, Play $play): JsonResponse
    {
        $query = $play->questions();

        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        } elseif ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Play $play): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'order' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('questions', 'order')->where('play_id', $play->id),
            ],
            'observations' => ['nullable', 'string', 'max:500'],
        ]);

        $question = $play->questions()->create($data)->loadCount('options');

        return response()->json($question, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Question $question): JsonResponse
    {
        return response()->json($question);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Question $question): JsonResponse
    {
        $data = $request->validate([
            'question' => ['sometimes', 'required', 'string'],
            'order' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                Rule::unique('questions', 'order')
                    ->ignore($question->id)
                    ->where('play_id', $question->play_id),
            ],
            'observations' => ['nullable', 'string', 'max:500'],
        ]);

        $question->update($data);

        return response()->json($question->refresh()->loadCount('options'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Question $question): Response
    {
        $question->delete();

        return response()->noContent();
    }

    /**
     * Restore the specified resource from storage.
     */
    public function restore(int $question): JsonResponse
    {
        $question = Question::withTrashed()->findOrFail($question);

        $question->restore();

        return response()->json($question->fresh()->loadCount('options'));
    }
}
