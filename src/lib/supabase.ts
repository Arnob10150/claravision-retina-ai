import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '') as string

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)

/** True once the real Supabase credentials are provided */
export const isSupabaseReady = () =>
  !!supabaseUrl && supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')

// ─── Database types ───────────────────────────────────────────────────────────

export type UserRole = 'ophthalmologist' | 'optometrist' | 'resident' | 'researcher' | 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  institution: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  patient_code: string
  age: number
  gender: 'male' | 'female' | 'other' | 'unknown'
  institution: string
  notes: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  patient_id: string | null
  uploaded_by: string | null
  image_url?: string
  eye_side: 'left' | 'right' | 'unknown'
  predicted_class: string
  confidence: number
  uncertainty_score: number
  uncertainty_level: 'low' | 'medium' | 'high'
  all_probabilities: Record<string, number>
  referral_flag: boolean
  status: 'pending' | 'reviewed' | 'signed_off'
  analysis_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  patients?: Patient
}

export interface Review {
  id: string
  scan_id: string
  reviewer_id: string
  agreement: 'agree' | 'disagree'
  final_diagnosis: string
  notes: string
  signed_off_at: string
  created_at: string
}
