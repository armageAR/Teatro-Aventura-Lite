<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of users (admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json(User::query()->latest()->get());
    }

    /**
     * Store a newly created user (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'role'         => ['required', Rule::in(['admin', 'producer'])],
            'keycloak_sub' => ['nullable', 'string', 'max:255', 'unique:users,keycloak_sub'],
        ]);

        $user = User::create($data);

        return response()->json($user, 201);
    }

    /**
     * Display the specified user (admin only).
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->requireAdmin($request);

        return response()->json($user);
    }

    /**
     * Update the specified user (admin only).
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'email'        => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'         => ['sometimes', 'required', Rule::in(['admin', 'producer'])],
            'keycloak_sub' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('users', 'keycloak_sub')->ignore($user->id)],
        ]);

        $user->update($data);

        return response()->json($user->fresh());
    }

    /**
     * Remove the specified user (admin only).
     */
    public function destroy(Request $request, User $user): Response
    {
        $this->requireAdmin($request);

        $user->delete();

        return response()->noContent();
    }

    /**
     * Abort with 403 if the current Keycloak user is not an admin.
     */
    private function requireAdmin(Request $request): void
    {
        if (!$this->currentUserIsAdmin($request)) {
            abort(403, 'Forbidden');
        }
    }

    /**
     * Determine if the currently authenticated Keycloak user has the admin role.
     */
    private function currentUserIsAdmin(Request $request): bool
    {
        $user = $request->get('keycloak_user', []);
        $realmAccess = $user['realm_access'] ?? null;

        if (is_object($realmAccess)) {
            $roles = (array) ($realmAccess->roles ?? []);
        } elseif (is_array($realmAccess)) {
            $roles = $realmAccess['roles'] ?? [];
        } else {
            return false;
        }

        return in_array('admin', $roles);
    }
}
