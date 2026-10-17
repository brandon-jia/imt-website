import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);
// Render an unconnected local preview without sending requests to production.
export const supabase = createClient(supabaseUrl || 'http://127.0.0.1:54321', supabaseAnonKey || 'local-preview-unconfigured');
