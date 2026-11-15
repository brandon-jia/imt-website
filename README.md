# Integrated Math website

Astro server application for Integrated Math, deployed with the Vercel adapter. The Fall 2026 contest portal lives at `/test-portal`.

Read [TEST_PORTAL_SETUP.md](./TEST_PORTAL_SETUP.md) for Supabase migrations, email Auth setup, the submission worker, problem authoring, and post-contest grading. [PORTAL_AUDIT.md](./PORTAL_AUDIT.md) records the Fall portal changes and verification limits.

```sh
npm ci
npm run dev
npm test
npm run verify
npm audit
```

Copy `.env.example` to `.env` and configure the project values. Keep the Supabase service-role key server-only. The database regression suite uses a local PostgreSQL-compatible runtime and does not require production credentials.

The two Fall contests are seeded as drafts. Replace all placeholder statements and computational answer keys before publication. Admin workspace provides proof grading, private scratch downloads, integrity review, deadline editing, score exports, and controlled result release.

GitHub Actions runs verification. Configure Vercel's Git integration and environment variables to deploy; GitHub Pages cannot host this application's authenticated server APIs. Database migrations and Cron activation are separate from deploying the website.

## Certificate verification

`/verify-certificate` reads `CERTIFICATE_REGISTRY_JSON` from the server environment. Set it in the Vercel project's Production environment and deploy. Use the private registry JSON as the value. For local development in PowerShell, load that same file before starting Astro:

```powershell
$env:CERTIFICATE_REGISTRY_JSON = Get-Content -Raw -Encoding UTF8 -LiteralPath '.env.certificates.json'
npm run dev
```

The registry is a JSON object keyed by the lowercase hexadecimal SHA-256 digest of each uppercase certificate code. Each value has `name`, `award`, and `issuedOn` (a `YYYY-MM-DD` date). Keep the registry and workbook outside Git and `public/`. Anyone with a valid code can see the associated three fields.
