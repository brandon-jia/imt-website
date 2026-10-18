# Fall 2026 public archive

The archive is at `/competitions/fall-2026`. The previously published format and rules are preserved at `/competitions/fall-2026/rules`.

## Public content

- Public registration figures are displayed as 440+ registered competitors and 57+ countries, as requested by the organizer. The map highlights the 57 explicitly supplied countries. These are registration figures, not a claim about completed attempts. The provided registration export is not the complete registration total and is not included in the website or repository.
- Overall and round top-five placements retain the organizer's order. Honorable mentions are unranked and retain the supplied order. Public display names follow the registration preferences confirmed by the organizer.
- `src/data/fall2026Archive.json` owns the approved public facts, country list, placements, and resource URLs. It contains no emails, school records, accommodation requests, or raw registration records.
- `public/fall-2026-world-map.svg` uses the same Natural Earth base, projection, and palette as the Spring archive. `node scripts/build-archive-map.mjs` generates both maps and fails if any Fall country is missing or the unique count disagrees with the declared total. The Spring map remains unchanged.

## Adding files later

Place the approved PDFs in `public/pdfs/`. In `src/data/fall2026Archive.json`, replace the relevant `problems`, `solutions`, or `statistics` null with its site-relative URL, such as `/pdfs/IMTfall2026_computational_problems.pdf`. A null value renders a non-interactive “Not yet available” placeholder; it never produces a broken download link.

## Verification

- Astro check: zero errors, warnings, or hints across 106 files. Production build passed.
- Built public-page audit: 15 pages and 53 linked resources, with no broken targets, missing image alt attributes, missing fragments, or metadata problems; custom 404 returns 404.
- Content checks: 28 result entries across three top-five lists and two honorable-mention lists; 57 unique countries with 57 highlighted map geometries; seven pending document slots.
- Desktop and mobile browser review passed, including keyboard expansion of the 57-country list. No page-level horizontal overflow or unexpected browser console warnings/errors were observed.
- Fall's header, compact metadata, centered map, registration figures, and numbered results cards now follow Spring's archive styling. Browser comparison confirmed matching header color, title size, map heading size, map width, and results-heading typography at the same viewport. The Fall resource section and its pending files retain their separate layout.
