import { writeFile, mkdir } from 'node:fs/promises';
const base = process.env.LOCAL_PREVIEW_URL || 'http://127.0.0.1:4173';
const pages = ['/', '/competitions', '/competitions/fall-2026', '/competitions/spring-2026', '/learn', '/learn/diagnostic', '/learn/diagnostic/how-it-works', '/sponsors', '/team', '/register', '/privacy', '/terms', '/cookies', '/test-portal'];
const report = { pages: [], broken: [], missingAlt: [], missingAnchors: [], assets: [], externalLinks: [] };
const resources = new Set();
const external = new Set();
const htmlByPath = new Map();
for (const path of pages) {
  const response = await fetch(base + path);
  const html = await response.text();
  htmlByPath.set(path, html);
  report.pages.push({ path, status: response.status, title: html.match(/<title>([\s\S]*?)<\/title>/)?.[1], h1: (html.match(/<h1\b/g) || []).length, main: (html.match(/<main\b/g) || []).length, description: /<meta\s+name="description"\s+content="[^"]+"/.test(html), canonical: /<link\s+rel="canonical"/.test(html), noindex: html.includes('noindex'), scripts: [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]) });
  if (!response.ok) report.broken.push({ path, status: response.status });
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) report.missingAlt.push({ path, tag: m[0] });
  for (const m of html.matchAll(/<(?:a|img|script|link)\b[^>]*\b(?:href|src)="([^"]+)"/g)) {
    const value = m[1].replaceAll('&amp;', '&');
    if (value.startsWith('/')) resources.add(value);
    else if (m[0].startsWith('<a') && value.startsWith('https://')) external.add(value);
  }
}
for (const value of resources) {
  if (value.startsWith('/api/')) continue;
  const url = new URL(value, base);
  const response = await fetch(url);
  if (!response.ok) report.broken.push({ path: value, status: response.status });
  if (url.hash && response.ok) {
    const html = htmlByPath.get(url.pathname) || await response.text();
    if (!html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) report.missingAnchors.push(value);
  }
  report.assets.push({ path: value, status: response.status });
}
const notFound = await fetch(base + '/this-page-does-not-exist');
report.notFound = { status: notFound.status, custom: (await notFound.text()).includes('Theory Not Found') };
report.externalLinks = [...external];
await mkdir('.local-review', { recursive: true });
await writeFile('.local-review/public-page-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pages: report.pages.length, resources: report.assets.length, broken: report.broken, missingAlt: report.missingAlt, missingAnchors: report.missingAnchors, badMetadata: report.pages.filter(p => !p.title || !p.description || !p.canonical || p.main !== 1 || p.h1 !== 1), notFound: report.notFound, externalLinks: report.externalLinks }, null, 2));
if (report.broken.length || report.missingAlt.length || report.missingAnchors.length || notFound.status !== 404) process.exitCode = 1;
