import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '') as string

const _ready =
  !!supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseUrl !== 'https://placeholder.supabase.co'

/** True once the real Supabase credentials are provided */
export const isSupabaseReady = () => _ready

// When credentials are not configured, return a no-op client so no network
// requests are made to placeholder.supabase.co.
function createMockClient() {
  const empty = { data: null, error: null, count: null }
  const qb: any = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === 'then') return (res: (v: typeof empty) => unknown) => Promise.resolve(empty).then(res)
        if (prop === 'catch') return () => Promise.resolve(empty)
        return () => qb
      },
    },
  )
  return {
    from: () => qb,
    auth: {
      getSession:          () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword:  () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp:              () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut:             () => Promise.resolve({ error: null }),
    },
  }
}

export const supabase = _ready
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createMockClient() as unknown as ReturnType<typeof createClient>)

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
