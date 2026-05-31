import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useUIStore'

// ─── Local admin credentials ──────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin'
const ADMIN_PROFILE = {
  full_name: 'Administrator',
  role: 'admin',
  institution: 'ClaraVision',
  avatar_url: '',
}

export function useAuth() {
  const { user, profile, setUser, setProfile } = useAuthStore()

  useEffect(() => {
    // Restore persisted local-admin session across refreshes
    const persisted = sessionStorage.getItem('cv_admin')
    if (persisted) {
      try {
        const saved = JSON.parse(persisted)
        setUser(saved.user)
        setProfile(saved.profile)
        return
      } catch { /* ignore corrupt storage */ }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchProfile(session.user.id)
      } else {
        if (!sessionStorage.getItem('cv_admin')) {
          setUser(null)
          setProfile(null)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (data) setProfile(data)
  }

  async function signIn(email: string, password: string) {
    // Admin bypass — always works, no Supabase tables needed
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = { id: 'admin-local', email: ADMIN_EMAIL }
      setUser(adminUser)
      setProfile(ADMIN_PROFILE)
      sessionStorage.setItem('cv_admin', JSON.stringify({ user: adminUser, profile: ADMIN_PROFILE }))
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(
    email: string,
    password: string,
    meta: { full_name: string; role: string; institution: string }
  ) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: meta } })
    if (error) throw error
  }

  async function signOut() {
    sessionStorage.removeItem('cv_admin')
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  return { user, profile, signIn, signUp, signOut }
}
