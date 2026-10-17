export interface PendingFinalSubmission {
  action: 'submit'; question: number; answer: string; request_id: string;
}

/** Discard only a definitive refusal of this request ID, never a transport/auth/rate-limit failure. */
export function discardRejectedFinalSubmission(code: string) {
  return ['FINAL_INVALID_INTEGER','FINAL_REQUEST_ID','FINAL_REQUEST_CONFLICT','FINAL_QUESTION_CLOSED','FINAL_ALREADY_SOLVED','FINAL_JOIN_REQUIRED','INVALID_JSON','JSON_REQUIRED','BODY_TOO_LARGE','VALIDATION_ERROR'].includes(code);
}

export function parsePendingFinalSubmission(value: string | null): PendingFinalSubmission | null {
  try {
    const saved = JSON.parse(value || 'null');
    if (!saved || saved.action !== 'submit' || !Number.isInteger(saved.question) || saved.question < 1 || saved.question > 10 || typeof saved.answer !== 'string' || !/^[+-]?[0-9]{1,100}$/.test(saved.answer.trim()) || typeof saved.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.request_id)) return null;
    return { action:'submit',question:saved.question,answer:saved.answer.trim(),request_id:saved.request_id };
  } catch { return null; }
}
