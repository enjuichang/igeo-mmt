# GeoLens V2 plan: accounts and leaderboard

**Status:** Proposed  
**Target:** V2  
**Last updated:** 2026-07-20

## Summary

V2 adds user accounts, saved test history, and a public leaderboard to the existing GeoLens practice and mock-exam experience. Users may continue practicing without an account, but signing in lets them save progress, review past results, choose a public display name, and compete on ranked mock exams.

The leaderboard must compare equivalent performances. Only completed, standard 40-question mock exams are ranked. Short practice sessions and custom-timer sessions are saved to a user's history but do not affect public rank.

## Goals

- Let a user create an account, sign in, sign out, and recover access.
- Save completed practice and mock-exam attempts to the user's account.
- Show each signed-in user a history of scores and a personal best.
- Publish an opt-in leaderboard with fair, understandable ranking rules.
- Protect private account data and prevent clients from writing their own scores.
- Keep the current anonymous practice flow available.

## Non-goals for V2

- Social feeds, direct messages, friends, teams, or school cohorts.
- Prizes, paid competitions, or proctored results.
- User-authored questions.
- Elo, streak, or adaptive-difficulty ranking systems.
- Migrating anonymous attempts completed before sign-in.
- A native mobile app.

## Product decisions

### Authentication

Use Supabase Auth as the canonical identity provider because the existing question-bank schema already references `auth.users`. Start with passwordless email links; add Google OAuth only if configured for the deployment. Keep authentication screens and callbacks inside the application.

The existing `app/chatgpt-auth.ts` helper represents a hosting-specific identity and does not currently create a Supabase session. It should not be mixed with Supabase row-level security in V2. Either leave it unused or replace it with an explicit server-side identity bridge in a later release.

### Anonymous access

Anonymous users can generate and complete tests exactly as they do in V1. At the result screen they see a sign-in prompt, but the result is not uploaded or ranked. This keeps the product useful before account creation and avoids silently linking browser data to a later account.

### Public identity

On first sign-in, the user chooses a unique display name. The leaderboard shows only display name, rank, score, completion time, and completion date. Email addresses, full names, user IDs, and answer details are never public.

Users can opt out of public ranking at any time. Their attempts remain in private history but disappear from future leaderboard reads. Display names must be 3–24 characters, use letters, numbers, spaces, hyphens, or underscores, and pass a basic reserved-name/profanity check.

### Ranked attempt rules

An attempt is leaderboard-eligible only when all of the following are true:

- The user was signed in before the attempt started.
- The mode is the standard 40-question mock exam.
- The configured timer is the standard V2 duration of 30 minutes.
- The server issued the attempt and selected its question set.
- All 40 answers are submitted before the server-side deadline.
- The attempt is completed once and has not been invalidated.

Practice tests, abandoned tests, custom timers, and future experimental modes are unranked.

### Ranking

Rank users by their single best eligible attempt:

1. Higher number of correct answers.
2. Lower completion time, measured by the server.
3. Earlier completion timestamp as the final deterministic tie-breaker.

The primary score is the transparent raw result (`correct_answers / 40`); time never outweighs a correct answer. The default view is **All time**, with a **This month** filter. Paginate results and show the signed-in user's position even when it is outside the current page.

## Core user stories

### Visitor

- As a visitor, I can practice without creating an account.
- As a visitor, I can view the public leaderboard.
- As a visitor who finishes a test, I understand that signing in is required to save future results.

### Signed-in learner

- As a learner, I can choose and later edit my public display name.
- As a learner, I can see my recent attempts and personal best.
- As a learner, I know before starting whether an attempt is ranked.
- As a learner, I can opt out of appearing on the leaderboard.
- As a learner, I can delete my account and associated attempt data.

### Maintainer

- As a maintainer, I can invalidate an impossible or abusive attempt without deleting audit data.
- As a maintainer, I can change the active ranked rules for a future season without rewriting historical results.

## User experience

### Navigation

Add these global destinations:

- **Leaderboard** — public rankings and the current user's position.
- **History** — signed-in user's attempts, filters, and personal best.
- **Account menu** — profile, privacy setting, sign out, and account deletion.
- **Sign in** — shown when no session exists.

### Sign-in flow

1. User opens the sign-in page and submits an email address.
2. The app sends a passwordless link and shows a confirmation state.
3. The callback exchanges the link for a Supabase session.
4. A new user chooses a display name and leaderboard visibility.
5. The user returns to the page they originally requested.

### Ranked mock flow

1. A signed-in user selects **Ranked mock**.
2. The UI explains the fixed 40-question, 30-minute rules.
3. The server creates an attempt with a question order, option order, start time, and deadline.
4. The client renders the issued attempt and submits answers to the server.
5. The server grades the attempt using canonical answer keys and records its duration.
6. The result screen shows score, personal-best status, and leaderboard position.

Refreshing the page restores an active attempt from the server. Starting a second ranked attempt abandons the first only after explicit confirmation.

### Leaderboard states

- Top rankings with rank, display name, score, and time.
- A highlighted row for the signed-in user.
- A prompt to complete a ranked mock when the user has no eligible score.
- An empty state when a new monthly period has no results.
- A privacy message when the current user has opted out.

## Data model

Add a new migration after `20260720_create_question_bank.sql`.

### `profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key; references `auth.users(id)` with cascade delete |
| `display_name` | `text` | Original display value |
| `display_name_key` | `text` | Unique normalized value for case-insensitive matching |
| `leaderboard_visible` | `boolean` | Defaults to `true` |
| `created_at` | `timestamptz` | Server default |
| `updated_at` | `timestamptz` | Maintained by trigger |

### `test_attempts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner; references `auth.users(id)` with cascade delete |
| `mode` | enum | `practice` or `mock` |
| `status` | enum | `active`, `completed`, `abandoned`, or `invalidated` |
| `rules_version` | `text` | Example: `ranked-mock-v1` |
| `ranked_eligible` | `boolean` | Set by the server, never the browser |
| `question_count` | `smallint` | Issued count |
| `correct_count` | `smallint` | Null until server grading |
| `duration_seconds` | `integer` | Server-derived elapsed time |
| `started_at` | `timestamptz` | Server timestamp |
| `deadline_at` | `timestamptz` | Null for untimed practice |
| `completed_at` | `timestamptz` | Null before completion |
| `created_at` | `timestamptz` | Server default |

### `attempt_questions`

| Column | Type | Notes |
| --- | --- | --- |
| `attempt_id` | `uuid` | Composite primary key; references `test_attempts` |
| `position` | `smallint` | Composite primary key; fixed display order |
| `question_id` | `text` | References `questions(id)` |
| `option_order` | `smallint[]` | Permutation used for this attempt |
| `selected_option_index` | `smallint` | Null until answered; index in displayed order |
| `is_correct` | `boolean` | Written only by server grading |
| `answered_at` | `timestamptz` | Server timestamp |

Do not expose canonical `answer_index` values through the ranked-attempt response. For durable historical review, either snapshot the prompt/options/explanation into `attempt_questions` or accept that history uses the latest published question wording. V2 should snapshot the learner-visible content to avoid historical drift.

### Leaderboard read model

Create a security-invoker view or a carefully scoped database function that returns only public leaderboard fields. It should select each visible user's best eligible, completed, non-invalidated attempt for the requested period and calculate rank with `rank()` over:

```sql
order by correct_count desc, duration_seconds asc, completed_at asc
```

Do not grant public `select` on `profiles`, `test_attempts`, or `attempt_questions`. Grant access only through row-level policies for owners and through the narrow public leaderboard read model.

## Server boundaries and API surface

All score-sensitive operations run on the server. Route names are illustrative; server actions are also acceptable if the authorization boundary remains the same.

| Operation | Method | Responsibility |
| --- | --- | --- |
| `/api/attempts` | `POST` | Authenticate user, validate mode, choose questions, create attempt |
| `/api/attempts/:id` | `GET` | Return an owner-visible active or completed attempt without answer keys |
| `/api/attempts/:id/answers` | `PUT` | Validate ownership/deadline and upsert one or more selections |
| `/api/attempts/:id/complete` | `POST` | Grade once, derive time, mark complete, return result |
| `/api/me/attempts` | `GET` | Return paginated private history |
| `/api/leaderboard` | `GET` | Return sanitized ranked rows and current user's rank |

Use the user's Supabase session for normal requests. Reserve the service-role client for narrowly scoped server operations that require it, and never ship the service-role key to the browser.

## Security and integrity

- Enforce ownership with Supabase row-level security using `auth.uid()`.
- Permit users to read their own profiles and attempts; permit profile updates only for allowed public fields.
- Create and grade ranked attempts in server code or `security definer` functions with a fixed `search_path`.
- Derive `correct_count`, eligibility, timestamps, and duration on the server.
- Make completion idempotent so retries cannot create multiple results.
- Rate-limit attempt creation, answer submission, display-name checks, and leaderboard queries.
- Reject answers after the deadline and mark timed-out attempts consistently.
- Log invalidation reason and actor in a private audit table.
- Escape display names in every rendering context and validate them on write.
- Add basic anomaly monitoring for implausibly fast perfect scores and excessive attempt creation. Do not automatically ban users solely from a heuristic.
- Provide account deletion that cascades private data and removes public ranking rows.

## Analytics and observability

Track product events without storing answer content in analytics:

- sign-in started/completed/failed
- profile onboarding completed
- ranked attempt started/completed/abandoned
- leaderboard viewed and period selected
- history viewed
- leaderboard visibility changed

Monitor authentication failure rate, attempt completion rate, grading errors, leaderboard query latency, and the number of invalidated attempts. Avoid sending email addresses or raw user IDs to client analytics.

## Accessibility and responsive behavior

- Authentication forms have persistent labels and actionable error messages.
- Leaderboard rows use semantic table markup on wide screens and preserve reading order on small screens.
- Rank and personal-best state are not communicated by color alone.
- Active-attempt recovery and timeout messages are announced to assistive technology.
- Keyboard focus returns to a meaningful location after dialogs and route changes.

## Delivery plan

### Milestone 1 — identity and profiles

- Install and configure the Supabase client packages.
- Add browser and server Supabase clients with cookie-based sessions.
- Build passwordless sign-in, callback, sign-out, and profile onboarding.
- Add `profiles`, validation, row-level policies, and account deletion.
- Add authenticated/anonymous navigation states.

**Exit condition:** a user can sign in across devices, choose a unique display name, sign out, and delete the account without exposing another user's data.

### Milestone 2 — durable attempts

- Add attempts and attempt-question tables, constraints, indexes, and policies.
- Move ranked question selection and grading behind the server boundary.
- Persist active attempts and restore them after refresh.
- Build private history and result detail views.
- Save unranked practice results for signed-in users after completion.

**Exit condition:** signed-in users can complete, restore, and review attempts; score and timing fields cannot be forged from the browser.

### Milestone 3 — leaderboard

- Implement the sanitized best-attempt read model.
- Build all-time and monthly views, pagination, current-user rank, and empty states.
- Add visibility controls and personal-best messaging.
- Add rate limits, anomaly signals, and maintainer invalidation tooling.

**Exit condition:** eligible results rank deterministically, private users are absent, and ties follow the documented rules.

### Milestone 4 — hardening and release

- Test auth redirects, session expiry, concurrent tabs, retries, deadline edges, and account deletion.
- Run database policy tests using anonymous, authenticated-owner, authenticated-other-user, and service roles.
- Add end-to-end tests for sign-in, ranked completion, history, opt-out, and leaderboard rank.
- Verify keyboard, screen-reader, mobile, and reduced-motion behavior.
- Seed staging accounts and conduct an abuse/privacy review before production migration.

**Exit condition:** automated tests cover the critical authorization and ranking paths, and the release checklist has no unresolved high-severity findings.

## Acceptance criteria

- Anonymous users retain access to V1 practice and mock modes.
- A user can sign in, sign out, recover a session, and delete the account.
- No public response contains an email address, auth user ID, or private answer history.
- A signed-in user can see only their own complete and in-progress attempts.
- Ranked scores are derived from canonical server-side answer keys.
- Only the standard signed-in 40-question, 30-minute mock is eligible.
- The leaderboard uses each user once, based on their best eligible attempt.
- Ordering is score descending, duration ascending, then completion time ascending.
- Opting out removes a user from public leaderboard results without deleting private history.
- Refreshing during a ranked mock restores the same questions, option order, selections, and deadline.
- Completing or retrying the completion request cannot duplicate or change a finalized score.
- Row-level-security tests prove that users cannot read or modify another user's profile or attempts.

## Testing strategy

- **Unit:** display-name normalization, eligibility rules, ranking tie-breakers, timer boundaries, and score calculation.
- **Database:** constraints, cascade deletion, RLS matrices, best-attempt selection, opt-out, and monthly time boundaries in UTC.
- **Integration:** auth callback/session cookies, attempt issuance, answer persistence, idempotent completion, and sanitized leaderboard responses.
- **End-to-end:** anonymous practice, new-user onboarding, ranked attempt recovery, history, visibility changes, and account deletion.
- **Load:** leaderboard pagination and rank lookup with at least 100,000 completed attempts in staging-generated data.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Client submits a forged score or time | Server issues, times, and grades ranked attempts |
| Question edits alter historical results | Snapshot learner-visible question content per attempt |
| Public names expose identity | Use user-chosen display names, no emails, and opt-out controls |
| Fastest-time tie-break encourages guessing | Score always ranks before time; show accuracy as the primary value |
| RLS configuration leaks attempt data | Deny public table reads and test each role/policy combination |
| Multiple auth systems create mismatched users | Use Supabase Auth as the sole V2 identity source |
| Monthly leaderboard changes at local midnight | Define and label monthly periods in UTC |
| Fixed questions make answer sharing easy | Randomize question/option order now; add larger rotating ranked pools later |

## Open questions before implementation

These do not block planning, but each should be resolved before its affected milestone begins:

- Should Google OAuth ship with V2, or should launch use email links only?
- Should the monthly board reset by UTC calendar month or use rolling 30 days? This plan recommends UTC calendar month.
- Should completed ranked attempts expose full explanations immediately, or only after the active ranked period closes?
- What display-name moderation provider or maintainer workflow will be used?
- Is one active ranked attempt per user sufficient, or should the product allow one per device?

## Recommended V2 launch configuration

- Passwordless email authentication.
- Anonymous practice preserved.
- One active ranked attempt per signed-in user.
- Ranked mock: 40 questions, 30 minutes, `ranked-mock-v1` rules.
- Best result per user on all-time and UTC calendar-month boards.
- Public display names with opt-out enabled.
- No prizes or claims that results are official iGEO scores.
