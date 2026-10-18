// Reopen participant routes here for a future competition. All portal code is retained.
export const PARTICIPANT_PORTAL_OPEN = false;
export const PORTAL_CLOSED_MESSAGE = 'The competition rounds have ended. Participant access to the testing portal is closed.';

function normalizedPath(pathname: string) {
  try {
    const decoded = decodeURIComponent(pathname).replaceAll('\\', '/').replace(/\/{2,}/g, '/');
    return new URL(decoded, 'https://portal.invalid').pathname.replace(/\/+$/, '') || '/';
  } catch { return pathname; }
}
function within(path: string, root: string) { return path === root || path.startsWith(root + '/'); }

export function closedPortalRoute(pathname: string): 'page' | 'api' | null {
  if (PARTICIPANT_PORTAL_OPEN) return null;
  const path = normalizedPath(pathname);
  if (within(path, '/test-portal') && !within(path, '/test-portal/admin') && path !== '/test-portal/closed') return 'page';
  if (within(path, '/api/test-portal') && !within(path, '/api/test-portal/admin') && path !== '/api/test-portal/me') return 'api';
  return null;
}

export function adminReturnPath(value: string | null) {
  const fallback = '/test-portal/admin';
  try {
    const url = new URL(value || fallback, 'https://portal.invalid');
    const path = normalizedPath(url.pathname);
    if (url.origin !== 'https://portal.invalid' || !within(path, fallback) || within(path, fallback + '/login')) return fallback;
    return path + url.search + url.hash;
  } catch { return fallback; }
}
