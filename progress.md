## Codebase Patterns
- Backend: Laravel 10 (PHP 8.2+) with PostgreSQL, `keycloak` middleware alias for auth
- Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- Auth: Keycloak singleton in `KeycloakProvider.tsx`; `useApi()` hook auto-injects Bearer token
- Tests: All backend tests use `MocksKeycloakAuth` trait via base `TestCase`; use `$this->withKeycloakToken()` to mock auth
- Soft deletes: Play, Question, QuestionOption, Performance all support soft deletes; `?only_trashed=1` / `?with_trashed=1` query params
- All protected routes are grouped under `Route::middleware('keycloak')` in `api.php`
- Frontend env: `NEXT_PUBLIC_API_URL` for backend; Keycloak config hardcoded in `KeycloakProvider.tsx`

---

## 2026-02-22 - US-001
- Verified the existing Keycloak authentication system fully satisfies all acceptance criteria
- No second auth system exists; no duplicate auth endpoints
- Backend: `KeycloakAuth` middleware validates JWT (JWKS cached 1h), registered as `keycloak` alias in Kernel.php
- Frontend: `KeycloakProvider.tsx` singleton with SSO check, PKCE S256, token auto-refresh; `useApi()` hook injects Bearer token
- All protected API routes use `middleware('keycloak')` group in `api.php`
- `MocksKeycloakAuth` trait in base `TestCase` enables auth mocking in all tests
- `KeycloakAuthenticationTest` covers: reject without token, accept valid token, `/me` endpoint, user data injection
- All 43 backend tests pass; frontend build + typecheck passes
- Files reviewed: `KeycloakAuth.php`, `KeycloakProvider.tsx`, `useApi.ts`, `api.php`, `Kernel.php`, `MocksKeycloakAuth.php`, `KeycloakAuthenticationTest.php`
- **Learnings for future iterations:**
  - The `keycloak_user` data (JWT claims) is available via `$request->get('keycloak_user')` in all controllers
  - Roles come from `realm_access.roles` or `resource_access[client].roles` in the JWT
  - Frontend role extraction is in `AppShell.tsx` - priority: admin > director > user
  - No additional setup needed to use auth in new endpoints - just add them inside the `middleware('keycloak')` route group
  - Tests mock auth via `$this->withKeycloakToken(['role_claim' => ...])` - no real Keycloak needed in tests
---
