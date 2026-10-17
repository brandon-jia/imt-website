import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://www.integratedmath.org',
  devToolbar: { enabled: false },
  integrations: [sitemap({ filter: (page) => !['/test-portal', '/api/', '/account', '/portal', '/404', '/learn/diagnostic/session/', '/learn/diagnostic/report/'].some(path => new URL(page).pathname.startsWith(path)) })],
  vite: {
    plugins: [tailwindcss()],
    // Keep small processed scripts external so the strict script-src header
    // also permits navigation and other controls in the production build.
    build: { assetsInlineLimit: 0, sourcemap: false },
  },
});
