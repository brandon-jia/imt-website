# Fall 2026 final round

The implementation was developed and tested locally. The new migration has **not** been applied to Supabase. Pushing this source does not install the database service; authenticated staging acceptance is still required before live use.

## Agreed format

- Individual portal accounts join with a shared, case-sensitive access code.
- Exactly ten integer-answer questions; all participants see the same current question.
- An organizer manually opens each question. Its server-enforced deadline is eight minutes later. Organizers can end a question early with confirmation.
- Correct answers receive base points in database acceptance order: **10, 8, 6, 4, 4, …**.
- A question's award is **max(0, base points − 2 × earlier incorrect submissions)**. An unsolved question receives zero.
- Invalid integer input is rejected without a penalty. Signed integers of up to 100 digits are compared exactly, including equivalent leading-zero representations.
- Correct answers lock further submissions for that person/question. Wrong answers can be retried while the question is open.
- Participants see their own correct/incorrect feedback, own awarded points, and the number of solvers. They receive no other participant scores, future prompts, or answer keys.
- Admins see totals and all ten per-question breakdowns: correct finish order, base points, wrong submissions, penalty, awarded points, and submission history. Reports list names alphabetically; there are no calculated tiebreakers, prize places, or public standings.

## Try the local demonstration

After `npm run build`, run `npm run preview:final` and open **http://127.0.0.1:4174/**.

The demonstration runs the actual new PostgreSQL functions in an isolated in-memory PGlite database. Its sample questions are not tournament content. It starts with all ten samples saved, an open lobby, and code **FINAL-DEMO-2026**.

1. Open the organizer view and a participant view in separate tabs.
2. As the organizer, open question 1. In the participant view, join with the shared code.
3. The first sample answer is **42**. Submit a different integer to incur a penalty, then submit 42.
4. Use **Simulate participant answers** to submit answers for Alice, Bob, Charlie, Dana, and Eli. If none has answered manually, Q1 totals become **10, 6, 6, 2, 0**, illustrating finish order, penalties, ties, and the zero floor.
5. Use **Expire current timer** or **End question early** to close submissions. Then manually open question 2.
6. Select a participant name in the admin table to see the breakdown. Download the CSV for one row per participant per question.
7. **Reset demonstration** restores sample questions and removes demo answers. All demo data also disappears when its server stops.

The demonstration header and identity selection are injected by this separate loopback-only server. The deployed API does not accept demonstration identities or reset/expiry/simulation actions. Demo pages restrict external connections and the server does not serve other contest APIs.

## Actual portal paths

- Participant: `/test-portal/final`
- Organizer: `/test-portal/admin/final`
- APIs: `/api/test-portal/final` and `/api/test-portal/admin/final`

Portal accounts must have confirmed email addresses. Organizer access reuses `test_admins`. Participant join attempts are limited to eight per account per minute; submissions and organizer operations have separate rate-limit scopes.

The server hashes access codes; plaintext is never stored in the database or returned by read endpoints. A generated code is shown once. Rotation admits future joins using the new code but does not evict existing participants. A shared code is not an identity whitelist: anyone with a confirmed portal account and the code can join, as requested.

## Preparing real questions, after separate deployment authorization

1. Apply `supabase/migrations/20261016000100_fall_live_final.sql` in a non-production environment and run authenticated acceptance checks there first. The migration adds separate final tables and functions; it does not alter qualifier tables, attempts, keys, upload rules, or grading procedures.
2. After deployment is explicitly authorized, apply the reviewed migration and deploy the matching application code. Never assume a Git push is preview-only.
3. In the organizer page, click **Create final-round draft**, save all ten real prompts and integer keys, and generate or set a code. The production draft contains no sample questions.
4. Open finalist access, send the code to finalists yourself, and wait for them to join.
5. Open each question manually. An expired question stays closed until you open the next. End question 10 or let it expire, then finish the round.

Each question and its key lock when that question opens. Admins can edit future questions during the final. Opened questions cannot be edited or reopened; there is no production reset or timer extension. Multiple organizer tabs use a version check so a repeated click or stale confirmation cannot skip questions or close a later question.

The final admin interface has direct links to live controls, access codes, questions, and scores. Access codes can be set or generated before or during the round, with show/hide and copy controls. Switching questions or reloading saved question data requires confirmation when edits are unsaved; leaving the page also warns about unsaved question changes.

## Integrity and limitations

- PostgreSQL serializes accepted submissions and organizer controls on the round row. Ranking, penalties, the correct-answer lock, and deadline checks occur in the same transaction.
- Ranking uses server/database acceptance order, not client clocks or claimed timestamps. Network transit affects when a request reaches the server. Requests processed after the deadline are rejected, including requests that waited for a lock.
- Submission UUIDs make retries idempotent even after a question closes. The participant page retains an uncertain submission in account-scoped session storage and offers recovery before another answer can be sent.
- Direct table access and function execution are revoked from anonymous/authenticated roles; production APIs bind every operation to the verified account. Admin functions additionally check `test_admins` inside PostgreSQL.
- Polling refreshes participant state about every 1.5 seconds and organizer state about every 2.5 seconds. Browser timers are approximate displays; the server deadline is authoritative. Buttons disable if state becomes stale, but no browser timer grants extra time.
- Local PGlite checks and the demonstration are not authenticated Supabase/Vercel acceptance or multi-instance load testing. Those require a separate staging setup. Live contest behavior has not been modified or certified by this work.

## Verification completed locally

- All **17 automated tests passed**, including final access/scoring/deadline/privacy/retry checks, saved-submission recovery, and the existing qualifier regressions. The main qualifier database suite includes the final migration in its fixture; all four cases passed.
- Astro check: **0 errors, 0 warnings, 0 hints** across 105 files. Production build passed. The build needed additional local filesystem permission for the Vercel adapter on Windows; no deployment was run.
- Built-route checks passed: unauthenticated requests are rejected, foreign-origin mutations are blocked, final pages are noindex, and demo identity headers/query parameters cannot authorize production routes.
- Browser demonstration verified shared-code entry; a wrong answer then a first correct answer yielding 8 points; participant-only points and solver counts; admin totals/breakdowns; manual advancement; early closure; expiry; state recovery on reload; and a downloaded CSV with 50 question records for five sample participants.
- Participant and admin layouts were checked at 375 pixels. The page itself does not overflow horizontally; the admin score table scrolls inside its own region. Expanded submission history stays open across polling. No unexpected browser console errors were observed in the successful flow.
- The existing tournament page’s final-round paragraph now matches the confirmed format. Other qualifier descriptions were preserved.
- Answer feedback now uses labeled red and green panels. Browser checks confirmed a red incorrect result followed by a green correct result worth 8 points, with the correct result retained on reload and no browser warnings or errors. Repetitive format taglines were removed from both final pages.
- Final API requests time out after ten seconds; polling does not overlap. Unconfirmed submissions retain their original request ID through connection, authentication, and rate-limit failures so retries cannot add another penalty.
- After the admin editing update, all seven focused final/qualifier database and protocol tests passed, as did Astro checks, the production build, and built-route security checks. Browser checks verified saved prompt persistence, show/hide and copying codes, generated codes, replacement-code entry, preserved membership, unsaved-edit confirmation, and editing Q2 while Q1 was running. The edited Q2 prompt and key were then used by a participant and correctly awarded 10 points in the admin report. The demo was reset to its sample lobby afterward.
