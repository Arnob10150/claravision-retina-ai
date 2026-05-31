import { useEffect } from 'react'
import { isSupabaseReady, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useUIStore'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin'
const ADMIN_PROFILE = {
  full_name: 'Administrator',
  role: 'admin',
  institution: 'ClaraVision',
  avatar_url: '',
}

const LOCAL_SESSION_KEY = 'cv_local_auth'
const LOCAL_ACCOUNTS_KEY = 'cv_local_accounts'

type LocalUser = { id: string; email: string }
type LocalProfile = {
  full_name: string
  role: string
  institution: string
  avatar_url: string
}
type LocalAccount = {
  user: LocalUser
  profile: LocalProfile
  passwordHash: string
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false
  return /failed to fetch|fetch failed|networkerror|load failed/i.test(error.message)
}

async function hashPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const input = new TextEncoder().encode(`${normalizedEmail}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', input)

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function readLocalAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLocalSession(user: LocalUser, profile: LocalProfile) {
  sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user, profile }))
}

function applyLocalSession(
  user: LocalUser,
  profile: LocalProfile,
  setUser: (user: LocalUser) => void,
  setProfile: (profile: LocalProfile) => void,
) {
  setUser(user)
  setProfile(profile)
  saveLocalSession(user, profile)
}

export function useAuth() {
  const { user, profile, setUser, setProfile } = useAuthStore()

  useEffect(() => {
    const persisted = sessionStorage.getItem('cv_admin')
      || sessionStorage.getItem(LOCAL_SESSION_KEY)

    if (persisted) {
      try {
        const saved = JSON.parse(persisted)
        setUser(saved.user)
        setProfile(saved.profile)
        return
      } catch {
        sessionStorage.removeItem(LOCAL_SESSION_KEY)
      }
    }

    if (!isSupabaseReady()) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchProfile(session.user.id)
      }
    }).catch(() => undefined)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchProfile(session.user.id)
      } else if (!sessionStorage.getItem('cv_admin') && !sessionStorage.getItem(LOCAL_SESSION_KEY)) {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) setProfile(data)
    } catch {
      // Keep the authenticated session usable when Supabase profile reads are offline.
    }
  }

  async function signInLocal(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await hashPassword(normalizedEmail, password)
    const account = readLocalAccounts().find(item =>
      item.user.email.toLowerCase() === normalizedEmail && item.passwordHash === passwordHash
    )

    if (!account) {
      throw new Error('Unable to reach Supabase, and no matching local demo account was found.')
    }

    applyLocalSession(account.user, account.profile, setUser, setProfile)
  }

  async function signUpLocal(
    email: string,
    password: string,
    meta: { full_name: string; role: string; institution: string },
  ) {
    const normalizedEmail = email.trim().toLowerCase()
    const accounts = readLocalAccounts()

    if (accounts.some(item => item.user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A local demo account already exists for this email.')
    }

    const account: LocalAccount = {
      user: { id: `local-${crypto.randomUUID()}`, email: normalizedEmail },
      profile: {
        full_name: meta.full_name,
        role: meta.role,
        institution: meta.institution,
        avatar_url: '',
      },
      passwordHash: await hashPassword(normalizedEmail, password),
    }

    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify([...accounts, account]))
    applyLocalSession(account.user, account.profile, setUser, setProfile)
  }

  async function signIn(email: string, password: string) {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = { id: 'admin-local', email: ADMIN_EMAIL }
      setUser(adminUser)
      setProfile(ADMIN_PROFILE)
      sessionStorage.setItem('cv_admin', JSON.stringify({ user: adminUser, profile: ADMIN_PROFILE }))
      return
    }

    if (!isSupabaseReady()) {
      await signInLocal(email, password)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      if (isNetworkError(error)) {
        await signInLocal(email, password)
        return
      }
      throw error
    }
  }

  async function signUp(
    email: string,
    password: string,
    meta: { full_name: string; role: string; institution: string },
  ) {
    if (!isSupabaseReady()) {
      await signUpLocal(email, password, meta)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: meta } })
      if (error) throw error
    } catch (error) {
      if (isNetworkError(error)) {
        await signUpLocal(email, password, meta)
        return
      }
      throw error
    }
  }

  async function signOut() {
    sessionStorage.removeItem('cv_admin')
    sessionStorage.removeItem(LOCAL_SESSION_KEY)
    setUser(null)
    setProfile(null)

    if (isSupabaseReady()) {
      await supabase.auth.signOut().catch(() => undefined)
    }
  }

  return { user, profile, signIn, signUp, signOut }
}
