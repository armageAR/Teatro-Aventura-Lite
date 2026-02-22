## Codebase Patterns
- Performance model: has `status` (default 'draft') and `join_token` (UUID, unique) columns auto-set in `booted()` hook
- Performance detail: GET /api/performances/:id now loads the `play` relationship (show() uses `$performance->load('play')`)
- Frontend navigation after creation: use `useRouter().push('/funciones/{id}')` with typed API response `post<{ id: number }>`
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
- Question/Option routes: nested shallow routing — POST /api/plays/:id/questions, PUT/DELETE /api/questions/:id, POST /api/questions/:id/options, PUT/DELETE /api/options/:id
- Inline form options: when a modal needs to create/edit parent+children together, fetch children before opening edit modal, submit sequentially to avoid unique constraint conflicts (delete first, then update, then create)

---

## 2026-02-22 - US-005
- Added `status` (default 'draft') and `join_token` (UUID, unique) columns to `performances` table via new migration
- Updated `Performance` model: added `status` and `join_token` to `$fillable`; auto-generates both in `booted()` creating hook
- Updated `PerformanceFactory`: added `status = 'draft'` and `join_token = Str::uuid()` to definition
- Updated `PerformanceController::show()`: loads `play` relationship for detail view
- Updated `PerformanceManagementTest`: added assertion for `status = 'draft'` and `join_token` presence in create/show tests; added `test_performance_is_created_with_draft_status_and_unique_join_token`
- Created `/funciones/[performanceId]/page.tsx` and `page.module.scss`: detail page showing play title, status, scheduled_at, location, comment, join_token, uid with back link
- Updated `PerformancesTable`: added "Ver detalle" link column; imported `next/link`
- Updated `obras/page.tsx`: after creating a performance, use `useRouter().push('/funciones/{id}')` to redirect to detail page; removed unused `performanceMessage` state
- All 58 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `2026_02_22_300000_add_status_and_join_token_to_performances_table.php`, `Performance.php`, `PerformanceFactory.php`, `PerformanceController.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`, `PerformancesTable.tsx`, `PerformancesTable.module.scss`, `obras/page.tsx`
- **Learnings for future iterations:**
  - Performance `status` and `join_token` are always auto-generated in the model's `booted()` hook — never accept them from user input in controller validation
  - `PerformanceController::show()` now loads `play` relationship — detail views for Performance will have play data available
  - When redirecting after form submission in Next.js, use `useRouter().push()` with typed `api.post<{ id: number }>()` response to get the new record's ID

---

## 2026-02-22 - US-004
- Backend was already fully implemented: QuestionController, QuestionOptionController, models, migrations, tests (18 tests passing)
- Frontend already had separate modals for questions (QuestionFormModal) and options (OptionFormModal) with a side panel
- Added inline AnswerOptions to QuestionFormModal: InlineOption type, inline options list state, add/remove per-option controls, options sent in submit payload
- Updated QuestionFormModal.module.scss: added optionsSection, optionsSectionHeader, optionsList, optionRow, optionInput styles
- Updated obras/[workId]/page.tsx:
  - Added `formInitialOptions` state (InlineOption[]) to track initial options when editing
  - Made `handleEditQuestion` async: fetches options before opening modal
  - Updated `handleSubmitQuestion` to accept `options` in payload; on create: POST question then POST each option sequentially; on edit: delete removed options first, then update existing, then create new (sequential to avoid unique constraint conflicts on `order` column)
  - Passes `initialOptions` to QuestionFormModal; resets `formInitialOptions` on close
- All 57 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `QuestionFormModal.tsx`, `QuestionFormModal.module.scss`, `obras/[workId]/page.tsx`
- **Learnings for future iterations:**
  - Backend Question/Option models, controllers, and tests were already complete from a prior implementation
  - Sequential option operations (delete → update → create) avoid unique constraint violations on (question_id, order) during reordering
  - To fetch options before opening edit modal: make the handler async, await the fetch, then open the modal with the fetched data as `initialOptions`
  - Export InlineOption type from QuestionFormModal.tsx for re-use in page.tsx
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
