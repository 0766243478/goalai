import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database schema
export interface GanUser {
  id: string;
  full_name: string;
  north_star: string;
  value_skill: string;
  trust_score: number;
  integrity_hash: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  is_genesis: boolean;
  completed: boolean;
  completed_at: string | null;
  integrity_hash: string;
}
