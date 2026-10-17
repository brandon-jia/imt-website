import type { APIRoute } from 'astro';
import { liveFinalRoute } from '../../../../lib/liveFinalRoute';
export const GET: APIRoute = ({ request }) => liveFinalRoute(request, true);
export const POST: APIRoute = ({ request }) => liveFinalRoute(request, true);
