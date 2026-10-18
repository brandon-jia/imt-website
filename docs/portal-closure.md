# Participant portal closure

Participant testing access is disabled by `PARTICIPANT_PORTAL_OPEN` in `src/lib/portalAccess.ts`. The middleware returns a concluded page for participant URLs and rejects participant API requests with HTTP 403 / `PORTAL_CLOSED`. Old direct links and open tabs cannot submit through the website APIs. Participant UI, submission code, database migrations, and stored contest records are retained.

Administrators sign in at `/test-portal/admin/login`. Access is verified against the existing `test_admins` table. Admin tests, results, grading, uploads, reports, and final-round controls retain their existing authorization. The public navigation links to email-update registration instead of the testing portal. The concluded page does not display an administrator sign-in link; administrators can still use the direct sign-in URL. No database changes or data deletions are part of this change.

The local preview has no configured backend; its admin sign-in form is disabled. Real credentials and admin membership require verification against the configured hosted environment. This application gate does not revoke existing Supabase credentials or alter direct database RPC permissions.

Checks: `node --test tests/*.test.mjs`, Astro check/build, `node scripts/check-portal-closed-http.mjs`, and `node scripts/check-final-http.mjs`. To reopen for a future event, review the event dates and registration copy before enabling the flag.
