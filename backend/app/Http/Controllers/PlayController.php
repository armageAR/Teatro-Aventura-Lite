<?php

namespace App\Http\Controllers;

use App\Models\Play;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PlayController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Play::query()->latest();

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
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $play = Play::create($data)->loadCount(['questions', 'performances']);

        return response()->json($play, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Play $play): JsonResponse
    {
        return response()->json($play);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Play $play): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:500'],
        ]);

        $play->update($data);

        return response()->json($play->refresh()->loadCount(['questions', 'performances']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Play $play): Response
    {
        $play->delete();

        return response()->noContent();
    }

    /**
     * Restore a soft deleted resource.
     */
    public function restore(int $play): JsonResponse
    {
        $play = Play::withTrashed()->findOrFail($play);

        $play->restore();

        return response()->json($play->fresh()->loadCount(['questions', 'performances']));
    }
}
