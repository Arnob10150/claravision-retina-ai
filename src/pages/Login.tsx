import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeOff, Loader as Loader2, Shield, Activity, Brain, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { EyeExamScene } from '@/components/shared/EyeExamScene'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()
  const { play } = useSound()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      play('loginSuccess')
      toast.success('Welcome back to ClaraVision')
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setError(msg)
      play('error')
      toast.error('Authentication failed', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">

      {/* ── Left panel: original eye exam animation ── */}
      <motion.div
        className="hidden lg:flex flex-col items-center justify-center flex-1 relative bg-gradient-to-br from-[oklch(0.16_0.06_163)] via-[oklch(0.18_0.05_180)] to-[oklch(0.14_0.04_200)] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Atmospheric orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl animate-breathe" />

        <div className="relative z-10 flex flex-col items-center gap-4 px-8 max-w-lg w-full">

          {/* Brand */}
          <motion.p
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold text-white tracking-tight self-start"
          >
            ClaraVision
          </motion.p>

          {/* ── YOUR original eye-exam animation ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, type: 'spring', bounce: 0.2 }}
            className="w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/30"
          >
            <EyeExamScene height={230} />
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-lg font-bold text-white leading-snug">
              Precision Retinal Diagnostics —{' '}
              <span className="text-emerald-400">Powered by Explainable AI</span>
            </h2>
          </motion.div>

          {/* Feature bullets — compact 2-col */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="grid grid-cols-1 gap-2 w-full"
          >
            {[
              { icon: Brain,    text: 'ClaraVision-XAI deep learning' },
              { icon: Activity, text: '9-class pathology classification' },
              { icon: Shield,   text: 'HIPAA · FDA decision support' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-emerald-100/80 text-sm">
                <div className="flex items-center justify-center size-6 rounded-md bg-primary/30 shrink-0">
                  <Icon className="size-3 text-emerald-300" />
                </div>
                {text}
              </div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex gap-2 flex-wrap"
          >
            {['HIPAA', 'FDA Cleared', 'CE Marked', 'ISO 13485'].map(badge => (
              <span key={badge} className="text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 uppercase tracking-wider">
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Right panel: login form ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[440px] px-6 py-12 bg-background relative">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-60 h-60 bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-primary/6 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile: show eye scene instead of the full split panel */}
          <motion.div
            className="flex lg:hidden justify-center mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.7, bounce: 0.3 }}
          >
            <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-xl ring-2 ring-primary/20">
              <EyeExamScene height={200} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="mb-7"
          >
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Clinician Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Access your retinal AI workstation
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Institutional Email</Label>
              <Input
                id="email" type="email"
                placeholder="clinician@hospital.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                className={cn('h-11', error && 'border-destructive focus-visible:ring-destructive/30')}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className={cn('h-11 pr-10', error && 'border-destructive focus-visible:ring-destructive/30')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="size-4" />
                    : <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 pt-0.5">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={v => setRememberMe(!!v)} />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Keep me signed in on this device
              </Label>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/20" disabled={loading}>
                {loading
                  ? <><Loader2 className="size-4 animate-spin" />Authenticating…</>
                  : <>Sign In to ClaraVision<ChevronRight className="size-4 ml-1" /></>
                }
              </Button>
            </motion.div>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            New to the platform?{' '}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Request access
            </Link>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-[11px] text-muted-foreground/50 mt-8 leading-relaxed"
          >
            ClaraVision is a clinical decision-support tool.<br />
            AI predictions must be reviewed by a qualified clinician before any diagnostic or treatment decision.
          </motion.p>
        </div>
      </div>
    </div>
  )
}
