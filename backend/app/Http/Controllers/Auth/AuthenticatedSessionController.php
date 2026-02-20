<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticatedSessionController extends Controller
{
    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email'    => ['required','email'],
            'password' => ['required','string'],
        ]);

        if (! Auth::attempt($credentials, remember: false)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 422);
        }

        // Protección contra fixation
        $request->session()->regenerate();

        return response()->json([
            'message' => 'logged-in',
            'user'    => $request->user(),
        ]);
    }

    public function destroy(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'logged-out']);
    }
}
