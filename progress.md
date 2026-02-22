## Codebase Patterns
- Backend: Laravel 10 (PHP 8.2+) with PostgreSQL, `keycloak` middleware alias for auth
- Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- Auth: Keycloak singleton in `KeycloakProvider.tsx`; `useApi()` hook auto-injects Bearer token
- Tests: All backend tests use `MocksKeycloakAuth` trait via base `TestCase`; use `$this->withKeycloakToken()` to mock auth
- Soft deletes: Play, Question, QuestionOption, Performance all support soft deletes; `?only_trashed=1` / `?with_trashed=1` query params
- All protected routes are grouped under `Route::middleware('keycloak')` in `api.php`
- Frontend env: `NEXT_PUBLIC_API_URL` for backend; Keycloak config hardcoded in `KeycloakProvider.tsx`
- Role enforcement: Use `abort(403)` (not `return response()->json(..., 403)`) in methods typed `Response` — `JsonResponse` is NOT a subclass of `Illuminate\Http\Response`
- Admin role check: `realm_access` in JWT is stdClass in prod, plain array in tests — handle both cases
- To mock admin in tests: `$this->withKeycloakToken(['realm_access' => ['roles' => ['admin']]])`
- User model: has `keycloak_sub` (nullable, unique) and `role` (admin/producer) columns; no soft deletes on User
- Column alteration without doctrine/dbal: use `DB::statement('ALTER TABLE X ALTER COLUMN Y ...')` raw SQL in migrations
- Frontend API response mapping: use `normalizeWork()` style functions to map snake_case API keys to camelCase TypeScript types
- Play model: has `title` (required), `description` (nullable), `cover_image_url` (nullable) columns

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

## 2026-02-22 - US-002
- Implemented full user management system (CRUD + role assignment) for Administrators
- Backend: Added migration `2026_02_22_114933_add_keycloak_sub_and_role_to_users_table` (keycloak_sub nullable unique, role default 'producer', password nullable)
- Backend: Created `UserController` with index/store/show/update/destroy; all protected by admin role check via `requireAdmin()` + `abort(403)`
- Backend: Added `Route::apiResource('users', UserController::class)` inside keycloak middleware group
- Backend: Updated `UserFactory` to include `role: 'producer'` default
- Backend: 12 tests in `UserManagementTest` all pass (55 total)
- Frontend: Created `/usuarios` page with UsersTable, UsersToolbar, UserFormModal, ConfirmDialog
- Frontend: Role badge component in UsersTable (admin=blue, producer=green)
- Frontend: Non-admin users see forbidden message instead of user list
- Frontend: Updated `AppShell.tsx` to compute `isAdmin` from JWT and pass to `MenuBar`
- Frontend: Updated `MenuBar.tsx` to show "Usuarios" nav link only when `user.isAdmin` is true
- All 55 backend tests pass; frontend typecheck + lint + build all clean
- **Learnings for future iterations:**
  - `Illuminate\Http\JsonResponse` is NOT a subclass of `Illuminate\Http\Response` — use `abort(403)` instead of returning a JsonResponse from `Response`-typed methods
  - `realm_access` from JWT decoded by Firebase/JWT is stdClass in production, but is plain array in tests (set via `withKeycloakToken`); handle both with `is_object` check
  - Admin role check mock: `$this->withKeycloakToken(['realm_access' => ['roles' => ['admin']]])`
  - Frontend admin check: `keycloak.tokenParsed.realm_access?.roles?.includes('admin')`
  - SCSS module class names can't start with a digit; use `role_admin`/`role_producer` not `role-admin`
---

## 2026-02-22 - US-003
- Added `cover_image_url` (nullable, varchar 2048) to the plays table via new migration
- Made `description` nullable via raw SQL `ALTER TABLE plays ALTER COLUMN description DROP NOT NULL` (no doctrine/dbal)
- Updated `Play` model: added `cover_image_url` to `$fillable`
- Updated `PlayController`: `description` is now `nullable`, added `cover_image_url` as `nullable|url|max:2048` in both `store` and `update`
- Updated `PlayManagementTest`: fixed `test_store_validates_required_fields` to not expect `description` as required; added `test_store_accepts_optional_description_and_cover_image_url` and `test_store_accepts_cover_image_url`
- Updated frontend `Work` type: added `coverImageUrl?: string | null`
- Updated `WorkFormModal`: added `coverImageUrl` to `WorkPayload` type, state, form field (URL input), and submit handler
- Updated `obras/page.tsx`: updated `WorkApi` type, `normalizeWork`, `handleSubmitWork` to handle `cover_image_url`
- All 57 backend tests pass; frontend typecheck + lint + build all clean
- Files changed: `2026_02_22_200000_update_plays_add_cover_image_url.php`, `Play.php`, `PlayController.php`, `PlayManagementTest.php`, `WorksTable.tsx`, `WorkFormModal.tsx`, `obras/page.tsx`
- **Learnings for future iterations:**
  - `doctrine/dbal` is NOT installed — use `DB::statement()` for raw SQL column alterations
  - When adding nullable columns to existing tables, create a new migration (never modify the original)
  - Frontend `normalizeWork()` function in `obras/page.tsx` maps snake_case API fields to camelCase; update both `WorkApi` type and `normalizeWork` when adding new columns
  - `handleSubmitWork` in `obras/page.tsx` maps camelCase payload back to snake_case for the API
---
