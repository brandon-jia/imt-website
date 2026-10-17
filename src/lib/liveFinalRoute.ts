import { requireSameOrigin } from './requestGuards';
import { authenticatePortalRequest, portalErrorResponse, portalJson, readPortalJson } from './testPortalAuth';
import { FinalError, mutateLiveFinal, readLiveFinal, type FinalDatabase } from './liveFinal';

export async function liveFinalRoute(request: Request, admin = false) {
  try {
    const mutation = request.method === 'POST';
    if (mutation) { const blocked = requireSameOrigin(request); if (blocked) return blocked; }
    const body = mutation ? await readPortalJson(request) : null;
    const context = await authenticatePortalRequest(request, {
      admin,
      rateLimit: mutation ? { limit: body?.action === 'join' ? 8 : 120, windowSeconds: 60, scope: admin ? 'live-final-admin' : body?.action === 'join' ? 'live-final-join' : 'live-final-submit' } : false,
    });
    const identity = { id: context.user.id, email: context.user.email, name: String(context.user.user_metadata?.display_name || context.user.user_metadata?.full_name || 'Participant').slice(0,160), isAdmin: context.isAdmin };
    const db = context.supabase as unknown as FinalDatabase;
    return portalJson(body ? await mutateLiveFinal(db, identity, body, admin) : await readLiveFinal(db, identity, admin));
  } catch (error) {
    if (error instanceof FinalError) return portalJson({ error: error.message, code: error.code }, { status: error.status });
    return portalErrorResponse(error);
  }
}
