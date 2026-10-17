export interface FinalQuestion {
  number: number; prompt: string; answer?: string; opened_at: string | null;
  closes_at: string | null; closed_at?: string | null; active: boolean; solved_count: number;
}
export interface FinalScore {
  question_number: number; incorrect_count: number; finish_order: number | null;
  base_points: number; points: number; solved_at: string | null;
}
export interface FinalSubmission {
  question_number: number; request_id: string; answer: string; correct: boolean; points: number; accepted_at: string;
}
export interface FinalRound {
  title: string; status: 'draft' | 'lobby' | 'running' | 'finished'; current_question: number;
  version: number; has_access_code: boolean;
}
export interface ParticipantFinalState {
  available: boolean; joined: boolean; server_now: string; round?: FinalRound; question?: FinalQuestion | null;
  own?: { solved: boolean; question_points: number; total_points: number; last_result: boolean | null };
}
export interface FinalParticipant {
  user_id: string; display_name: string; email: string; joined_at: string; total_points: number;
  scores: FinalScore[]; submissions: FinalSubmission[];
}
export interface AdminFinalState {
  available: boolean; server_now: string; round?: FinalRound; questions?: FinalQuestion[];
  participants?: FinalParticipant[]; events?: { id: number; action: string; question_number: number; created_at: string }[];
}
