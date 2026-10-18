import type { APIRoute } from 'astro';

export const prerender = true;
const paths = ['/', '/competitions', '/competitions/fall-2026', '/competitions/fall-2026/rules', '/competitions/spring-2026', '/learn', '/learn/diagnostic', '/learn/diagnostic/how-it-works', '/team', '/sponsors', '/register', '/privacy', '/terms', '/cookies'];
export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>https://www.integratedmath.org${path}</loc></url>`).join('')}</urlset>`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
