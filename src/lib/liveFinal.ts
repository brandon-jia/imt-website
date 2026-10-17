import { createHash, randomBytes } from 'node:crypto';

export interface FinalDatabase {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: any }>;
}
export interface FinalIdentity { id: string; email?: string; name?: string; isAdmin: boolean }
export class FinalError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export function normalizeFinalInteger(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^[+-]?[0-9]{1,100}$/.test(text)) throw new FinalError(400, 'FINAL_INVALID_INTEGER', 'Enter an integer with at most 100 digits.');
  return BigInt(text).toString();
}
export function finalCodeDigest(value: string) {
  return createHash('sha256').update('imt:fall-2026-final:').update(value).digest('hex');
}
export function finalDatabaseError(error: { message?: string; code?: string }) {
  const match = error.message?.match(/(FINAL_[A-Z_]+):\s*(.*)/s);
  if (match) {
    const forbidden = ['FINAL_ADMIN_REQUIRED', 'FINAL_ACCESS_CODE', 'FINAL_JOIN_REQUIRED'];
    const invalid = ['FINAL_INVALID_INTEGER', 'FINAL_REQUEST_ID', 'FINAL_INVALID_QUESTION', 'FINAL_INVALID_CODE', 'FINAL_INVALID_ACTION'];
    return new FinalError(forbidden.includes(match[1]) ? 403 : invalid.includes(match[1]) ? 400 : 409, match[1], match[2]);
  }
  if (error.code === 'PGRST202' || error.code === '42883') return new FinalError(503, 'FINAL_NOT_INSTALLED', 'The final-round service has not been configured yet.');
  return new FinalError(500, 'FINAL_SERVICE_ERROR', 'The final round could not complete that request.');
}
async function rpc(db: FinalDatabase, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw finalDatabaseError(error);
  return data;
}
export async function readLiveFinal(db: FinalDatabase, identity: FinalIdentity, admin = false) {
  if (admin && !identity.isAdmin) throw new FinalError(403, 'FINAL_ADMIN_REQUIRED', 'Administrator access is required.');
  return rpc(db, admin ? 'get_live_final_admin_state' : 'get_live_final_state', admin ? { p_admin_id: identity.id } : { p_user_id: identity.id });
}
export async function mutateLiveFinal(db: FinalDatabase, identity: FinalIdentity, body: Record<string, unknown>, admin = false) {
  if (admin) {
    if (!identity.isAdmin) throw new FinalError(403, 'FINAL_ADMIN_REQUIRED', 'Administrator access is required.');
    const action = String(body.action ?? '');
    if (!['initialize', 'save_question', 'set_code', 'open_lobby', 'open_next', 'end_question', 'finish'].includes(action)) throw new FinalError(400, 'FINAL_INVALID_ACTION', 'Choose a valid organizer action.');
    if (action !== 'initialize' && (!Number.isSafeInteger(body.version) || Number(body.version) < 0)) throw new FinalError(400, 'FINAL_STALE_CONTROL', 'Refresh the organizer view before continuing.');
    let code: string | undefined;
    if (action === 'set_code') {
      code = body.generate === true ? randomBytes(12).toString('base64url') : typeof body.code === 'string' ? body.code.trim() : '';
      if (code.length < 12 || code.length > 64 || /\s/.test(code)) throw new FinalError(400, 'FINAL_INVALID_CODE', 'Use 12–64 characters without spaces, or generate a code.');
    }
    if (action === 'save_question' && (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 20000 || !Number.isInteger(body.number) || Number(body.number) < 1 || Number(body.number) > 10)) throw new FinalError(400, 'FINAL_INVALID_QUESTION', 'Enter a question number from 1 to 10 and a problem statement of at most 20,000 characters.');
    const state = await rpc(db, 'control_live_final', {
      p_admin_id: identity.id, p_action: action, p_expected_version: body.version ?? null,
      p_question: action === 'save_question' ? body.number : null,
      p_prompt: action === 'save_question' ? body.prompt : null,
      p_answer: action === 'save_question' ? normalizeFinalInteger(body.answer) : null,
      p_code_hash: code ? finalCodeDigest(code) : null,
    });
    return { state, ...(code ? { access_code: code } : {}) };
  }
  if (body.action === 'join') {
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code || code.length > 64) throw new FinalError(400, 'FINAL_INVALID_CODE', 'Enter the shared finalist access code.');
    return { state: await rpc(db, 'join_live_final', { p_user_id: identity.id, p_code_hash: finalCodeDigest(code), p_name: identity.name || 'Participant', p_email: identity.email || '' }) };
  }
  if (body.action === 'submit') {
    if (!Number.isInteger(body.question) || Number(body.question) < 1 || Number(body.question) > 10 || typeof body.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)) throw new FinalError(400, 'FINAL_REQUEST_ID', 'A valid question and submission identifier are required.');
    return rpc(db, 'submit_live_final', { p_user_id: identity.id, p_question: body.question, p_answer: normalizeFinalInteger(body.answer), p_request_id: body.request_id });
  }
  throw new FinalError(400, 'FINAL_INVALID_ACTION', 'Choose join or submit.');
}
