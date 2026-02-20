<?php

namespace App\Http\Controllers;

use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class QuestionOptionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, Question $question): JsonResponse
    {
        $query = $question->options();

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
    public function store(Request $request, Question $question): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'max:255'],
            'order' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('question_options', 'order')->where('question_id', $question->id),
            ],
            'notes' => ['nullable', 'string', 'max:500'],
            'next_question_id' => ['nullable', 'integer', 'exists:questions,id'],
        ]);

        $option = $question->options()->create($data);

        return response()->json($option, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(QuestionOption $option): JsonResponse
    {
        return response()->json($option);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, QuestionOption $option): JsonResponse
    {
        $data = $request->validate([
            'text' => ['sometimes', 'required', 'string', 'max:255'],
            'order' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                Rule::unique('question_options', 'order')
                    ->ignore($option->id)
                    ->where('question_id', $option->question_id),
            ],
            'notes' => ['nullable', 'string', 'max:500'],
            'next_question_id' => ['nullable', 'integer', 'exists:questions,id'],
        ]);

        $option->update($data);

        return response()->json($option->refresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(QuestionOption $option): Response
    {
        $option->delete();

        return response()->noContent();
    }

    /**
     * Restore the specified resource from storage.
     */
    public function restore(int $option): JsonResponse
    {
        $option = QuestionOption::withTrashed()->findOrFail($option);

        $option->restore();

        return response()->json($option->fresh());
    }
}
