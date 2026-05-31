import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon, Sun, Bell, Volume2, VolumeX, LogOut,
  User, Settings, ChevronDown, BadgeCheck, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useTheme } from '@/components/theme-provider'
import { useUIStore, useAuthStore } from '@/store/useUIStore'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  ophthalmologist: 'Ophthalmologist',
  optometrist: 'Optometrist',
  resident: 'Ophthalmology Resident',
  researcher: 'Retinal Researcher',
  admin: 'Administrator',
}

const ROLE_COLORS: Record<string, string> = {
  ophthalmologist: 'bg-primary/10 text-primary',
  optometrist: 'bg-blue-500/10 text-blue-600',
  resident: 'bg-violet-500/10 text-violet-600',
  researcher: 'bg-amber-500/10 text-amber-600',
  admin: 'bg-rose-500/10 text-rose-600',
}

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { soundEnabled, setSoundEnabled } = useUIStore()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()
  const { play } = useSound()
  const navigate = useNavigate()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CR'

  const roleLabel = ROLE_LABELS[profile?.role ?? ''] ?? 'Clinician'
  const roleColor = ROLE_COLORS[profile?.role ?? ''] ?? 'bg-primary/10 text-primary'
  const displayName = profile?.full_name || 'Clinician'
  const firstName = displayName.split(' ')[0]

  async function handleLogout() {
    play('logout')
    await signOut()
    navigate('/login')
    toast.success('Signed out successfully')
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 shrink-0 sticky top-0 z-40">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1 transition-colors" />

      <div className="flex-1 min-w-0">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-base font-semibold text-foreground truncate"
        >
          {title}
        </motion.h1>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Sound toggle */}
        <Button
          variant="ghost" size="icon"
          onClick={() => { setSoundEnabled(!soundEnabled); }}
          title={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.div key={soundEnabled ? 'on' : 'off'} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </motion.div>
          </AnimatePresence>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost" size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle light/dark mode"
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </motion.div>
          </AnimatePresence>
        </Button>

        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground relative transition-colors">
              <Bell className="size-4" />
              <motion.span
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-medium">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { title: 'High-uncertainty scan flagged', sub: 'PT-2024-019 · 2 min ago', dot: 'bg-destructive' },
              { title: 'Sign-off queue: 3 pending', sub: 'Cases awaiting review', dot: 'bg-amber-500' },
              { title: 'Weekly report ready', sub: 'May 2024 analytics exported', dot: 'bg-primary' },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex items-start gap-2.5 py-2.5 cursor-pointer">
                <span className={cn('mt-1 size-2 rounded-full shrink-0', n.dot)} />
                <div>
                  <p className="text-xs font-medium text-foreground">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground">{n.sub}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-8 px-2 ml-1 hover:bg-muted/60 transition-all rounded-lg"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-semibold text-foreground leading-tight">{firstName}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56" sideOffset={6}>
            {/* User identity header */}
            <div className="px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', roleColor)}>
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
              {profile?.institution && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">{profile.institution}</span>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                <User className="size-4 text-muted-foreground" />
                <span>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/analytics')}
              >
                <BadgeCheck className="size-4 text-muted-foreground" />
                <span>My Activity</span>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            <div className="py-1">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sign-out confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of ClaraVision?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved analysis results will be lost. You will be returned to the sign-in screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90 text-white">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
