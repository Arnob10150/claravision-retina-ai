import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeOff, Loader as Loader2, Brain, Shield, Activity, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EyeExamScene } from '@/components/shared/EyeExamScene'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'

const ROLES = [
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'optometrist', label: 'Optometrist' },
  { value: 'resident', label: 'Ophthalmology Resident' },
  { value: 'researcher', label: 'Retinal Researcher' },
  { value: 'admin', label: 'Platform Administrator' },
]

export function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: '',
    institution: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signUp } = useAuth()
  const { play } = useSound()
  const navigate = useNavigate()

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(form.email, form.password, {
        full_name: form.full_name,
        role: form.role,
        institution: form.institution,
      })
      play('loginSuccess')
      toast.success('Account created. Welcome to ClaraVision.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      play('error')
      toast.error('Registration failed', { description: msg })
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
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl animate-breathe" />

        <div className="relative z-10 flex flex-col items-center gap-4 px-8 max-w-lg w-full">

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
            <EyeExamScene height={220} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-lg font-bold text-white leading-snug">
              Join the Clinical AI Platform —{' '}
              <span className="text-emerald-400">Built for Eye Care Professionals</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-1 gap-2 w-full max-w-sm"
          >
            {[
              { icon: Brain, text: 'Explainable AI — not a black box' },
              { icon: Activity, text: 'Grad-CAM attention maps per scan' },
              { icon: Shield, text: 'Full audit trail & sign-off workflow' },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="flex items-center gap-3 text-emerald-100/80 text-sm"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/30 shrink-0">
                  <Icon className="size-3.5 text-emerald-300" />
                </div>
                {text}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex gap-2.5 flex-wrap justify-center"
          >
            {['HIPAA Compliant', 'FDA Cleared', 'CE Marked'].map(badge => (
              <span key={badge} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 uppercase tracking-wider">
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Right panel: registration form ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[480px] px-6 py-10 bg-background relative overflow-y-auto">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-60 h-60 bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-primary/6 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative z-10 py-4">

          {/* Mobile: show eye scene */}
          <motion.div
            className="flex lg:hidden justify-center mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.7, bounce: 0.3 }}
          >
            <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-xl ring-2 ring-primary/20">
              <EyeExamScene height={180} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create Clinician Account</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Register for access to the ClaraVision platform
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            onSubmit={handleSubmit}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name &amp; Title</Label>
              <Input id="full_name" placeholder="Dr. Sarah Chen"
                value={form.full_name} onChange={e => update('full_name', e.target.value)}
                required className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Institutional Email</Label>
              <Input id="reg-email" type="email" placeholder="clinician@hospital.org"
                value={form.email} onChange={e => update('email', e.target.value)}
                required className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password</Label>
              <div className="relative">
                <Input id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={e => update('password', e.target.value)}
                  required minLength={8} className="h-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword
                    ? <EyeOff className="size-4" />
                    : <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Clinical Role</Label>
              <Select value={form.role} onValueChange={v => update('role', v)} required>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="institution">Hospital / Institution</Label>
              <Input id="institution" placeholder="City Eye Institute"
                value={form.institution} onChange={e => update('institution', e.target.value)}
                className="h-10" />
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

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-10 mt-1 shadow-lg shadow-primary/20"
                disabled={loading || !form.role}>
                {loading
                  ? <><Loader2 className="size-4 animate-spin" />Creating account…</>
                  : <>Create Clinician Account<ChevronRight className="size-4 ml-1" /></>
                }
              </Button>
            </motion.div>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-5"
          >
            Already registered?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-[11px] text-muted-foreground/50 mt-6 leading-relaxed"
          >
            By registering, you confirm this platform will be used solely as clinical decision support under qualified clinician oversight.
          </motion.p>
        </div>
      </div>
    </div>
  )
}
