# Local website review — October 8, 2026

This review records local verification of the website revisions. It does not establish production acceptance, legal review, or image permissions. No live database or domain configuration was changed during this work; repository pushes and hosting deployments are separate from those checks.

## Changes

- System typography replaces Inter and Google Fonts requests. Forest-green headings, warm paper backgrounds, neutral borders, consistent focus indicators, and readable muted text unify the public pages. Legacy competition headers lose italic accents, colored framing, decorative icons, dot textures, and scroll reveal scripts. Portal warnings retain their meaning and prominence.
- The mobile menu closes with Escape and returns focus to its button; its breakpoint prevents tablet navigation overflow. Internal header links open in the same tab. The home page has one main landmark.
- Privacy, terms, and cookies/storage pages use an October 17, 2026 update date. Public draft notices were removed at the organizer's request. Contact is `info@integratedmath.org`, supplied by the organizer. No operating state, legal entity, nonprofit status, address, or telephone number is invented.
- Email updates require an affirmative checkbox, transmitted with the form and a notice version. Contact name is optional; contact is separate from marketing opt-in. Form feedback has live announcements, focus, and a busy state. On loopback preview URLs, forms validate and show a preview message without sending to Formspree.
- Portal account creation has terms acknowledgement and includes its time/version in account metadata. No additional age or location data is collected. Existing authentication, attempt enforcement, uploads, grading, and database permissions remain as implemented.
- Diagnostic wording now accurately distinguishes server records from the identifying browser cookie. The experience radio group uses a fieldset and legend. In this unconfigured checkout, starting diagnostics and signing in are unavailable, with visible notices rather than misleading loading/error states.
- Optional Vercel visitor analytics are removed, including the package. Google font requests and CDN map scripts are removed. The map is a local SVG and its existing highlighted subset has an accessible text list. Public pages do not load Supabase or math-rendering JavaScript; KaTeX CSS loads only where math rendering is used.
- Branded favicon files and a 1200 × 630 share image use the existing IMT bridge artwork. Sponsor raster images use optimized WebP versions; total size drops from 182,442 to 49,586 bytes, about 73%. The displayed bridge mark drops from 21,820 to 5,036 bytes, about 77%.
- Canonical URLs use the existing `https://www.integratedmath.org` domain, independent of the preview host. Page descriptions, social metadata, Organization/WebSite/WebPage data, and breadcrumb markup are supplied centrally. Protected pages remain noindex. IMT is modeled as an Organization rather than a physical LocalBusiness because no public business premises are established.
- `robots.txt` uses the correct domain and public sitemap. A public `sitemap.xml` explicitly lists discoverable pages and excludes accounts, attempts, results, admin routes, and APIs. `llms.txt` lists public reference materials. The existing custom 404 preserves its wording and returns status 404.
- The production build disables client source maps. The Astro starter artwork is removed; the otherwise-unused default favicon files are replaced with IMT artwork. No React integration or Lucide/shadcn dependency exists in this checkout.
- CSP no longer permits CDN scripts, visitor analytics, or external font hosts. Existing restrictive frame, referrer, MIME, permissions, and private-route caching headers are retained.

## Verification

- Astro check: 0 errors, 0 warnings, 0 hints across 91 files.
- Production build: passed with the Vercel adapter. `scripts/preview-local.mjs` serves this built output on loopback; this is a local preview, not a hosted deployment.
- All 14 existing Node/PGlite contest regressions passed. No production database tests or writes were performed.
- `scripts/audit-public-pages.mjs` checked 14 pages and 49 internal links/assets: no broken targets, missing image alt attributes, or missing link fragments. Each page has a title, description, canonical URL, one main landmark, and one h1. A nonexistent URL returns the custom 404 with status 404.
- Browser checks cover mobile widths, keyboard menu behavior, image loading, text contrast, and public-page console messages. These are focused checks, not a complete assistive-technology certification. Authenticated contest and admin flows cannot be accepted against this credential-free checkout.
- Sponsor link HEAD checks: Art of Problem Solving, AwesomeMath, Jane Street, and Non-Trivial returned 200. AwesomeMath redirects to its www hostname. Hudson River Trading returned 403 to the automated check; that is an unverified destination, not evidence of a broken link.
- Contact and email-update submission behavior is checked locally. No message, subscription, account, or contest submission was sent to a live service. Actual Formspree delivery, mailing-list unsubscribe operations, provider console settings, and production cookie behavior need separate acceptance.

## Rights and source review

- The archive geography is generated from pinned `world-atlas@2.0.2/countries-110m.json`, which derives from Natural Earth. Natural Earth describes its map data as public domain: https://www.naturalearthdata.com/about/terms-of-use/. The generator and source data are kept in `scripts/`. The existing country subset is preserved; it is not silently represented as the complete list behind the published 35+ claim.
- IMT bridge images, sponsor logos, and archive PDFs existed in the repository. The repository does not establish their ownership, permission terms, or license records. Optimizing or reusing them does not prove permission. Obtain/retain the bridge creator's authorization, sponsor brand permissions, and resource reuse notices before certifying an image-rights audit.
- The external frames found in the portal display submitted proof PDFs for organizer review. They have descriptive titles and restricted sources. No public third-party social/video embed was found.

## Organizer follow-up

1. Identify who is responsible for the service, whether IMT has a legal entity or fiscal sponsor, its principal operating location, and who handles privacy requests. People participating from several states does not justify inventing a governing-state clause. Confirm the relevant federal and state obligations against that actual structure.
2. Confirm the participant age range and the legal treatment of a student-run educational service. The legacy roster accepts ages 5–25; the portal and diagnostic do not implement a verified parental-consent process. A footer policy or checkbox is insufficient to establish COPPA compliance. Decide on a lawful process before collecting information from younger children; do not treat the draft's contact notice as an enforced age gate.
3. Set and document retention/deletion periods for messages, mailing-list records, diagnostic profiles/answers, accounts, contest files, grading, and audit logs. The diagnostic identifier currently lasts one year. Policies should describe actual retention and request handling, not aspirational promises.
4. Confirm provider agreements/settings, international participants' requirements, publication of competitor names, and the ability to respond to access/deletion/unsubscribe requests. A paid offer would require additional payment/refund terms; the current free entry requires no entry-fee refund workflow.
5. Confirm rights records. The unfinished resource roadmap was removed from the public learning page rather than inventing completed releases.

## October 17 publication cleanup

- Removed public policy draft banners and local-preview wording from service-unavailable messages. Replaced stale qualifier-status notices with neutral portal links while retaining the published contest dates and rules.
- Added disclosure of account-scoped final-answer recovery storage and aligned the signup terms version with the policy date.
- Applied compatible dependency security fixes; the audit reports zero vulnerabilities.

Primary references reviewed:

- FTC COPPA FAQ, including scope, actual knowledge, and treatment of nonprofit entities: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC COPPA rule page: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- ICO cookie guidance distinguishes requested essential functionality from optional tracking: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/. Disabling optional tracking is the basis for omitting an optional-tracking banner in this revision; this is not a blanket worldwide legal-compliance finding.
- Google Organization structured-data guidance: https://developers.google.com/search/docs/appearance/structured-data/organization

## Preview again

From the repository, build with `npm run build` and start the built local site with `npm run preview:local`. The default address is `http://127.0.0.1:4173`; the server binds to loopback only. Public-page audit: `node scripts/audit-public-pages.mjs`. Credentials are not required to review public pages.
