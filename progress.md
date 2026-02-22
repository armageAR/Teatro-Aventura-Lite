## 2026-02-22 - US-012
- Added `current()` method to `PerformanceController`: public endpoint (no keycloak); finds the active `PerformanceQuestion` (sent but not closed); checks if the given `spectator_session_id` has a `Vote` (`spectator_token` = sessionId) for the active question; returns `{ performance_id, status, play_title, active_question: { id, question, options[], has_voted, voted_option_id } | null }`
- Added public route `GET /api/performances/{performance}/current` in `api.php` (outside keycloak group)
- Created `SpectatorCurrentTest.php` with 8 tests: draft/live without question, active question with options, has_voted when spectator voted, has_voted false without session, no active question when question closed, no auth required, 404 for nonexistent performance (105 total pass)
- Updated `frontend/src/app/join/[token]/page.tsx`: replaced static welcome with polling state view; added `CurrentStateApi` / `CurrentOptionApi` / `CurrentActiveQuestionApi` types; `currentState` state; `fetchCurrent` callback; `useEffect` for polling every 3s via `setInterval` + `useRef`; renders play title, status badge, correct message per state (draft=waiting, live=waiting/question, closed=ended); if active question, shows question text + options list; if `has_voted=true` shows voted confirmation with chosen option text
- Updated `frontend/src/app/join/[token]/page.module.scss`: added `.waitingText`, `.closedText`, `.questionBox`, `.questionText`, `.optionsList`, `.optionItem`, `.votedConfirmation`, `.votedIcon`, `.votedText`, `.votedSubText` styles; removed `.sessionInfo`
- All 105 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `PerformanceController.php`, `api.php`, `SpectatorCurrentTest.php`, `join/[token]/page.tsx`, `join/[token]/page.module.scss`
- **Learnings for future iterations:**
  - `GET /api/performances/{id}/current` is a PUBLIC route — add it to the public routes block in `api.php` BEFORE the keycloak group
  - `spectator_token` in `votes` table stores the `spectator_session_id` — this is how to check if a spectator voted on a question
  - Polling in a page that has both "join" phase and "ongoing" phase: join once, store session in state, then start `setInterval` in a separate `useEffect` that watches `joinData`
  - Avoid calling `fetchCurrent` from inside the join `useCallback` and also from interval — the join flow calls it once immediately, the interval handles subsequent updates
  - `pollTimerRef.current` must be cleared in the cleanup function of the `useEffect` to avoid duplicate timers on re-renders

---

## 2026-02-22 - US-011
- Created migration `2026_02_22_700000_create_spectator_sessions_table.php`: `spectator_sessions` table with `performance_id` (FK), `spectator_session_id` (UUID, unique), timestamps
- Created `SpectatorSession` model: `$fillable` = ['performance_id', 'spectator_session_id']; auto-generates UUID in `booted()` creating hook; `performance()` BelongsTo relationship
- Added `join()` method to `PerformanceController`: public endpoint (no keycloak), validates `token`, queries `Performance` by `join_token` (with try/catch for PostgreSQL UUID type error on invalid input), creates new `SpectatorSession`, returns `{ spectator_session_id, performance_id, performance_status, play_title }`
- Added public route `POST /api/performances/join` OUTSIDE keycloak middleware group in `api.php`
- Created `SpectatorJoinTest.php` with 8 tests: join live/draft/closed performance, 404 for invalid token, 422 for missing token, no auth required, multiple joins create distinct sessions, session_id is UUID (97 total pass)
- Created `frontend/src/app/join/[token]/page.tsx`: public page (no useApi/Keycloak needed), checks localStorage for existing session, POSTs to /api/performances/join if not found, saves spectator_session_id to localStorage keyed by token, shows welcome message with play title and performance status
- Created `frontend/src/app/join/[token]/page.module.scss`: styles for welcome box, title, statusBadge, loadingText, errorBox
- All 97 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `2026_02_22_700000_create_spectator_sessions_table.php`, `SpectatorSession.php`, `PerformanceController.php`, `api.php`, `SpectatorJoinTest.php`, `join/[token]/page.tsx`, `join/[token]/page.module.scss`
- **Learnings for future iterations:**
  - PostgreSQL `uuid` column type throws `QueryException` (not null) when comparing to a non-UUID string — wrap `Performance::where('join_token', ...)` in try/catch `QueryException` and treat as null
  - Public (no-auth) routes must be placed OUTSIDE the `Route::middleware('keycloak')` group in `api.php` — place them in a "RUTAS PÚBLICAS" block before the keycloak group
  - The join page uses `api` from `@/lib/api` directly (not `useApi()` which adds Keycloak Bearer token) — `useApi` is only for authenticated producer endpoints
  - `localStorage` key pattern for spectator sessions: `spectator_session_{token}` — allows multiple performances in same browser
  - SpectatorSession UUID is auto-generated in `booted()` hook (same pattern as `join_token` in Performance model)
  - Each POST /api/performances/join ALWAYS creates a new session — idempotency is handled on the frontend via localStorage (if session exists in localStorage, skip the POST)
---

## 2026-02-22 - US-010
- Created migration `2026_02_22_600000_add_winning_answer_option_id_to_performance_questions.php`: added `winning_answer_option_id` nullable FK to `question_options` in `performance_questions`
- Updated `PerformanceQuestion` model: added `winning_answer_option_id` to `$fillable`
- Added `setWinner()` method to `PerformanceController`: validates question is closed, validates option belongs to question, sets `winning_answer_option_id`; also handles idempotent re-assignment
- Updated `buildQuestionStatus()` helper to include `winning_answer_option_id` in response
- Updated `live()` method to include `winning_answer_option_id` per question
- Updated `questions()` method to include `winning_answer_option_id` per question
- Added route `PATCH /api/performances/{performance}/questions/{question}/winner` in `api.php`
- Added 6 new tests in `PerformanceManagementTest` (89 total pass): set winner on closed question, winner can be any option, cannot set winner on active/pending question, option must belong to question, can change winner, guest auth check
- Updated `funciones/[performanceId]/page.tsx`: added `winning_answer_option_id` to `PerformanceQuestionApi` and `LiveQuestionApi` types; added `winnerActionLoading` state; added `handleSetWinner` callback; for closed questions in results view, shows winner selection buttons; highlights winning option with badge and gold bar fill
- Updated `page.module.scss`: added `.resultItemWinner`, `.winnerBadge`, `.resultBarFillWinner`, `.winnerActions`, `.winnerActionsLabel`, `.winnerActionsRow`, `.btnWinner`, `.btnWinnerActive` styles
- All 89 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `2026_02_22_600000_add_winning_answer_option_id_to_performance_questions.php`, `PerformanceQuestion.php`, `PerformanceController.php`, `api.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`
- **Learnings for future iterations:**
  - `winning_answer_option_id` lives on `performance_questions` (the pivot), not on `performances` — winner is per question per performance
  - Winner validation: (1) question must have `closed_at` set, (2) option must exist in `question_options`, (3) option must belong to this specific question (check via `$question->options->pluck('id')`)
  - Winner can be changed after setting (idempotent update pattern — just `$pq->update(...)` without checking if already set)
  - Frontend winner UX: show selection buttons only when `liveQ.performance_status === "closed"`; use `winnerActionLoading: string | null` with key `"${questionId}-${optionId}"` for per-button loading state
  - `resultBarFillWinner` CSS class overrides the blue bar fill with gold (#ffc107) for the winning option
---

## 2026-02-22 - US-009
- Created migration `2026_02_22_500000_create_votes_table.php`: `votes` table with `performance_question_id` (FK), `question_option_id` (FK), `spectator_token` (nullable), `client_vote_id` (nullable, unique), timestamps
- Created `Vote` model with `$fillable` and `performanceQuestion()` / `questionOption()` BelongsTo relationships
- Added `live()` method to `PerformanceController`: returns `{ performance_id, status, questions[] }` where questions are only sent ones (active/closed); each question includes `total_votes` and `options[]` with `vote_count` and `vote_percentage`
- Added route `GET /api/performances/{performance}/live` inside keycloak middleware group in `api.php`
- Added 5 new tests in `PerformanceManagementTest` (82 total pass): get live results with no votes, correct counts/percentages, only sent questions included, closed questions included, guest auth check
- Updated `funciones/[performanceId]/page.tsx`: added `LiveResultApi` / `LiveQuestionApi` / `LiveOptionApi` types, `liveResults` state, `fetchLiveResults` callback, polling via `setInterval` (3s) in a `useEffect` that reacts to `performance.status` and `questions`; when `liveQ` data exists for a question, shows results bar chart instead of plain option list; triggers immediate `fetchLiveResults` after send/close question actions
- Updated `page.module.scss`: added `.resultsList`, `.resultItem`, `.resultHeader`, `.resultText`, `.resultCount`, `.resultPct`, `.resultBar`, `.resultBarFill`, `.resultTotal` styles
- All 82 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `2026_02_22_500000_create_votes_table.php`, `Vote.php`, `PerformanceController.php`, `api.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`
- **Learnings for future iterations:**
  - Vote aggregation: use `DB::raw('count(*) as cnt')` + `groupBy` + `get()->groupBy('performance_question_id')` to batch-fetch vote counts for all performance questions in one query
  - PHP JSON-encodes `0.0` as integer `0`; test assertions for zero percentages should use `0` not `0.0`
  - Polling pattern: use `useRef` for the timer handle + `useEffect` that watches `performance.status` and `questions` to start/stop the interval; return cleanup function clears the interval
  - `liveResultsMap = new Map(questions.map(q => [q.id, q]))` for O(1) lookup when merging results into question cards
  - `pollTimerRef.current` must be cleared before setting new interval to avoid duplicate timers when dependencies change
---

## 2026-02-22 - US-008
- Created migration `2026_02_22_400000_create_performance_questions_table.php`: `performance_questions` table with `performance_id`, `question_id`, `sent_at` (nullable), `closed_at` (nullable), unique on `(performance_id, question_id)`
- Created `PerformanceQuestion` model with fillable `performance_id`, `question_id`, `sent_at`, `closed_at` and `datetime` casts
- Added `performanceQuestions(): HasMany` relationship to `Performance` model
- Added 4 new methods to `PerformanceController`: `questions()` (GET list with status), `sendQuestion()` (PATCH activate), `closeQuestion()` (PATCH deactivate), private `buildQuestionStatus()` helper
- Added 3 new routes: `GET /api/performances/{performance}/questions`, `PATCH /api/performances/{performance}/questions/{question}/send`, `PATCH /api/performances/{performance}/questions/{question}/close`
- Added 10 new tests in `PerformanceManagementTest` (77 total pass): list questions with status, send, idempotent send, can't send on non-live, wrong play, at-most-one active, close, idempotent close, can't close unsent, guest auth checks
- Updated `funciones/[performanceId]/page.tsx`: added `PerformanceQuestionApi` type, `questions`/`questionsLoading`/`questionActionLoading`/`questionActionError` states, `fetchQuestions`, `handleSendQuestion`, `handleCloseQuestion` callbacks, Questions section with send/close buttons
- Updated `page.module.scss`: added `.questionsSection`, `.questionsHeading`, `.questionItem`, `.qItem_active`, `.qItem_closed`, `.questionHeader`, `.questionOrder`, `.questionText`, `.qStatusBadge`, `.qBadge_active`, `.qBadge_closed`, `.optionsList`, `.optionItem`, `.questionActions`, `.btnSend`, `.btnCloseQuestion`
- All 77 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `2026_02_22_400000_create_performance_questions_table.php`, `PerformanceQuestion.php`, `Performance.php`, `PerformanceController.php`, `api.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`
- **Learnings for future iterations:**
  - `firstOrNew(['performance_id' => ..., 'question_id' => ...])` works correctly when those fields are in `$fillable` — sets them on the new unsaved instance
  - "At most one active" constraint enforced at application layer: check `whereNotNull('sent_at')->whereNull('closed_at')->exists()` before activating
  - Question state machine: pending → active (sent_at set) → closed (closed_at set); once closed, cannot re-activate
  - Frontend: `hasActiveQuestion = questions.some(q => q.performance_status === 'active')` drives button visibility
  - `questionActionLoading: number | null` (not boolean) to track which specific question is loading; allows per-row disabled state
  - `fetchPerformance` and `fetchQuestions` both added to the single `useEffect` dependency array for parallel initial load
---

## 2026-02-22 - US-006
- Added `qr()` method to `PerformanceController`: returns `{ join_url, join_token }` using `FRONTEND_URL` env var
- Added route `GET /api/performances/{performance}/qr` inside keycloak middleware group in `api.php`
- Added 2 new tests in `PerformanceManagementTest`: authenticated users can get QR data, guests cannot access QR endpoint
- Installed `qrcode.react` v4.2.0 in frontend (exports `QRCodeSVG` and `QRCodeCanvas`)
- Updated `/funciones/[performanceId]/page.tsx`: imports `QRCodeSVG`, computes `joinUrl` client-side using `window.location.origin`, added QR section below detail list
- Updated `page.module.scss`: added `.qrSection`, `.qrHeading`, `.qrContainer`, `.qrLabel`, `.qrUrl` styles
- All 60 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `PerformanceController.php`, `api.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`, `package.json`, `package-lock.json`
- **Learnings for future iterations:**
  - `FRONTEND_URL` env var exists in backend `.env.example` — use `env('FRONTEND_URL', config('app.url'))` to build frontend-facing URLs
  - `qrcode.react` v4.x exports `QRCodeSVG` and `QRCodeCanvas` (no default export)
  - For join URLs in `"use client"` components, use `typeof window !== 'undefined' ? window.location.origin : ''` guard for SSR safety
  - The `/qr` route must be added explicitly (not covered by `apiResource`) — add it separately in the keycloak group
---

## 2026-02-22 - US-007
- Added `start()` and `close()` methods to `PerformanceController`: state transitions `draft→live` (sets `started_at`) and `live→closed` (sets `ended_at`); idempotent for already-transitioned states; `abort(422)` for invalid transitions
- Added routes `PATCH /api/performances/{performance}/start` and `PATCH /api/performances/{performance}/close` inside keycloak middleware group in `api.php`
- Added 7 new tests in `PerformanceManagementTest`: start draft→live, idempotent start on live, cannot start closed, close live→closed, idempotent close on closed, cannot close draft, guests blocked from start/close
- Updated `/funciones/[performanceId]/page.tsx`: added `actionLoading`/`actionError` states, `handleStart` and `handleClose` callbacks, and an Actions section with conditional buttons (Start for draft, Close for live, message for closed)
- Updated `page.module.scss`: added `.actionsSection`, `.actionsHeading`, `.actionsRow`, `.btnStart`, `.btnClose`, `.statusMessage`, `.actionError` styles
- All 67 backend tests pass; frontend typecheck + ESLint + build all clean
- Files changed: `PerformanceController.php`, `api.php`, `PerformanceManagementTest.php`, `funciones/[performanceId]/page.tsx`, `funciones/[performanceId]/page.module.scss`
- **Learnings for future iterations:**
  - State transitions use `abort(422, 'message')` for invalid transitions (consistent with other 422 usages)
  - Idempotency pattern: check if already in target state first, return current data without touching DB
  - Frontend action buttons: use separate `actionLoading`/`actionError` states so page loading and action loading don't interfere
  - After a PATCH state transition, update state directly from response data instead of re-fetching

---

## Codebase Patterns
- PerformanceQuestion pivot: tracks `sent_at`/`closed_at` for each question in a performance; at most 1 active (sent but not closed) per performance at a time
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
- Public routes: place outside keycloak middleware group in `api.php`; use `api` from `@/lib/api` directly (not `useApi()`) in frontend to avoid injecting auth token
- PostgreSQL UUID column: querying with non-UUID string throws `QueryException` — always try/catch when searching by UUID with user-supplied input
- SpectatorSession: stored in `spectator_sessions` table with `performance_id` FK and `spectator_session_id` UUID (unique); frontend stores per-token in localStorage under key `spectator_session_{token}`
- Spectator vote lookup: `Vote::where('performance_question_id', $pq->id)->where('spectator_token', $spectatorSessionId)` — `spectator_token` stores the `spectator_session_id` passed as query param to public endpoints

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
