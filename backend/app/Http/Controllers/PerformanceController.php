<?php

namespace App\Http\Controllers;

use App\Models\Performance;
use App\Models\Play;
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
}
