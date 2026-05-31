import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  soundEnabled: boolean
  volume: number
  sidebarOpen: boolean
  setSoundEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      volume: 0.4,
      sidebarOpen: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVolume: (volume) => set({ volume }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'claravision-ui' }
  )
)

interface AuthStore {
  user: { id: string; email: string } | null
  profile: {
    full_name: string
    role: string
    institution: string
    avatar_url: string
  } | null
  setUser: (user: { id: string; email: string } | null) => void
  setProfile: (profile: AuthStore['profile']) => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
}))
