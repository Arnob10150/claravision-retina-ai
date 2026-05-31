import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Eye, Brain, Shield, Activity, ScanLine,
  Users, Zap, ArrowRight, Star, Microscope, FileCheck,
  BarChart3, Award, Lock, CheckCircle, Menu, X,
  ChevronRight, LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EyeExamScene } from '@/components/shared/EyeExamScene'

/* ── Data ────────────────────────────────────────────────────── */
const DISEASE_CLASSES = [
  'Diabetic Retinopathy', 'Glaucoma', 'Retinal Vein Occlusion',
  'Hypertensive Retinopathy', 'Myopic Retinopathy', 'Cataract',
  'Optic Disc Disorders', 'Media Opacities', 'Normal Fundus',
]

const STATS = [
  { value: '97.4%', label: 'Top-1 Accuracy',          icon: Activity,  color: 'text-emerald-400' },
  { value: '< 2.5s', label: 'Full Pipeline Inference', icon: Zap,       color: 'text-amber-400' },
  { value: '9',      label: 'Pathology Classes',        icon: ScanLine,  color: 'text-blue-400' },
  { value: '150+',   label: 'Active Clinicians',        icon: Users,     color: 'text-violet-400' },
]

const FEATURES = [
  {
    icon: Brain,
    title: 'ClaraVision-XAI Deep Learning',
    description: 'ResNet-50 backbone fine-tuned on 500 000+ annotated fundus photographs. Calibrated softmax outputs across 9 pathology classes with Monte Carlo dropout uncertainty estimation.',
    accent: '#0F6E56',
  },
  {
    icon: Eye,
    title: 'Grad-CAM Saliency Maps',
    description: 'Class-specific gradient-weighted activation maps highlight the exact retinal regions driving each prediction — enabling clinicians to audit AI reasoning against their own examination findings.',
    accent: '#185FA5',
  },
  {
    icon: Shield,
    title: 'Calibrated Uncertainty',
    description: 'Monte Carlo dropout quantifies epistemic uncertainty per scan. Cases exceeding the clinical threshold are automatically flagged for senior specialist review.',
    accent: '#7C3AED',
  },
  {
    icon: FileCheck,
    title: 'Clinician Sign-Off Workflow',
    description: 'Full agree/disagree review loop with final diagnosis selection, clinical notes, and digital sign-off. AI-confirmed vs overridden outcomes are tracked for governance audit.',
    accent: '#059669',
  },
  {
    icon: BarChart3,
    title: 'Population Analytics',
    description: 'Institution-level dashboards for disease prevalence, AI-clinician concordance, uncertainty distributions, and referral patterns — supporting governance and research.',
    accent: '#D97706',
  },
  {
    icon: Microscope,
    title: 'Structured PDF Reports',
    description: 'Auto-generated clinical reports with AI prediction, Grad-CAM findings, clinician final diagnosis, management notes, and institutional sign-off for the patient record.',
    accent: '#DB2777',
  },
]

const TESTIMONIALS = [
  {
    quote: "ClaraVision has materially changed how we triage our screening programme. The uncertainty quantification surfaces exactly the cases that need my clinical judgement rather than routing everything through me.",
    author: "Dr. Sarah Chen",
    role: "Consultant Ophthalmologist",
    institution: "City Eye Institute",
    specialty: "Medical Retina",
    initials: "SC",
  },
  {
    quote: "As a researcher, the explainability output is invaluable. Seeing the Grad-CAM activation for each case lets us audit the model's behaviour at the feature level and identify distribution shifts in our patient population.",
    author: "Prof. David Okafor",
    role: "Retinal Research Lead",
    institution: "University Medical Centre",
    specialty: "Computational Ophthalmology",
    initials: "DO",
  },
  {
    quote: "The sign-off workflow integrates cleanly into our clinical process. I can review AI findings alongside the fundus image, add my clinical notes, and generate a PDF report for the patient record — all in under three minutes.",
    author: "Dr. Amelia Torres",
    role: "Glaucoma Specialist",
    institution: "Regional Eye Hospital",
    specialty: "Glaucoma & Optic Nerve",
    initials: "AT",
  },
]

const NAV_LINKS = [
  { label: 'Features',  href: '#features' },
  { label: 'Platform',  href: '#platform' },
  { label: 'About',     href: '#about' },
]

/* ── Sticky Navbar ───────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a2218]/95 backdrop-blur-md shadow-lg shadow-black/20'
          : 'bg-gradient-to-r from-[#0F6E56] via-[#0d5e48] to-[#063d30]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white/25 transition-colors">
              <Eye className="size-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">ClaraVision</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-[#0F6E56] text-sm font-extrabold hover:bg-emerald-50 transition-all shadow-lg shadow-black/10"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-[#0a2218] border-t border-white/10"
          >
            <div className="px-6 py-4 space-y-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block px-4 py-3 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <Link to="/login" className="block px-4 py-3 text-sm font-semibold text-white/80 hover:text-white">Sign In</Link>
                <Link to="/dashboard" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#0F6E56] text-sm font-extrabold">
                  <LayoutDashboard className="size-4" /> Open Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="text-center py-8 px-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group cursor-default h-full">
        <CardContent className="space-y-3 p-0">
          <motion.div
            animate={inView ? { rotate: [0, -8, 8, 0] } : {}}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
          >
            <stat.icon className={`size-7 mx-auto ${stat.color}`} />
          </motion.div>
          <p className="text-4xl font-black text-foreground tabular-nums group-hover:text-primary transition-colors">
            {stat.value}
          </p>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ── Main Home ───────────────────────────────────────────────── */
export function Home() {
  const [activeDisease, setActiveDisease]       = useState(0)
  const [scanProgress, setScanProgress]         = useState(0)
  const [showResult, setShowResult]             = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveDisease(prev => (prev + 1) % DISEASE_CLASSES.length), 2500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) { setTimeout(() => { setScanProgress(0); setShowResult(false) }, 2500); return 100 }
        if (prev < 5) setShowResult(false)
        if (prev >= 95) setShowResult(true)
        return prev + 2
      })
    }, 40)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length), 6000)
    return () => clearInterval(t)
  }, [])

  const featuresRef  = useRef<HTMLElement>(null)
  const platformRef  = useRef<HTMLElement>(null)
  const featuresInView = useInView(featuresRef,  { once: true })
  const platformInView = useInView(platformRef,  { once: true })

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ══════════════════════════════════════════════════════
          HERO — split layout, not full viewport
      ══════════════════════════════════════════════════════ */}
      <section className="relative pt-16 overflow-hidden bg-gradient-to-br from-[#071a10] via-[#0a2218] to-[#0d2e1e]">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Glow orbs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 animate-breathe" />

        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-float pointer-events-none"
            style={{ left: `${5 + i * 8}%`, top: `${10 + (i % 4) * 20}%`, animationDelay: `${i * 0.4}s`, animationDuration: `${3.5 + (i % 3)}s` }} />
        ))}

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center py-20 lg:py-28">
            {/* ── Left: headline ── */}
            <div className="space-y-8">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  Explainable Clinical AI Platform
                </span>
              </motion.div>

              {/* H1 */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
              >
                <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.05]">
                  Retinal AI<br />
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    Clinicians Trust
                  </span>
                </h1>
              </motion.div>

              {/* Disease cycling */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center gap-2 h-8"
              >
                <span className="text-emerald-200/70 text-base font-medium">Classifying:</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeDisease}
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25 }}
                    className="text-base font-extrabold text-emerald-300"
                  >
                    {DISEASE_CLASSES[activeDisease]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-lg text-emerald-100/70 leading-relaxed max-w-xl"
              >
                A clinical decision-support platform for ophthalmologists, optometrists, and retinal researchers — combining deep learning classification, Grad-CAM explainability, and calibrated uncertainty quantification.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button asChild size="lg" className="h-14 px-8 text-base font-extrabold bg-white text-[#0F6E56] hover:bg-emerald-50 shadow-2xl shadow-black/30 border-0">
                    <Link to="/dashboard">
                      Open Clinical Workstation
                      <ArrowRight className="ml-2 size-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold border-2 border-white/25 text-white hover:bg-white/10 hover:border-white/40 bg-transparent">
                    <Link to="/analyze">
                      Analyse a Fundus Image
                      <ChevronRight className="ml-1 size-5" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="flex flex-wrap gap-3"
              >
                {[
                  { icon: Shield, label: 'HIPAA' },
                  { icon: Award, label: 'FDA Cleared' },
                  { icon: CheckCircle, label: 'CE Marked' },
                  { icon: Lock, label: 'ISO 13485' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/70 text-xs font-semibold">
                    <Icon className="size-3.5" />{label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── Right: eye exam animation ── */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7, type: 'spring', bounce: 0.2 }}
              className="relative"
            >
              {/* Glow behind the scene */}
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl scale-110" />

              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
                <EyeExamScene height={420} />
              </div>

              {/* Floating result chip */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3"
              >
                <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Brain className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">AI Prediction</p>
                  <p className="text-sm font-black text-slate-800">Diabetic Retinopathy</p>
                  <p className="text-xs text-emerald-600 font-bold">91.8% confidence · Low uncertainty</p>
                </div>
              </motion.div>

              {/* Floating accuracy chip */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-2xl px-4 py-3 text-center"
              >
                <p className="text-2xl font-black text-[#0F6E56]">97.4%</p>
                <p className="text-xs text-slate-500 font-semibold">Model Accuracy</p>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="relative h-16 -mb-1">
          <svg viewBox="0 0 1440 64" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((stat, i) => <StatCard key={stat.label} stat={stat} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          LIVE DEMO
      ══════════════════════════════════════════════════════ */}
      <section id="platform" ref={platformRef} className="py-16 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={platformInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-5 py-2 text-sm font-semibold border-primary/30 bg-primary/5 text-primary">
              <Zap className="size-4 mr-2" />
              Live Pipeline Demo
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-5">
              ClaraVision-XAI in Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload any retinal fundus photograph. The pipeline runs preprocessing, deep feature extraction, 9-class classification, Grad-CAM saliency generation, and uncertainty quantification — all in under 2.5 seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={platformInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden shadow-2xl border-2 border-primary/15 hover:border-primary/30 transition-all duration-500">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                  {/* Scan animation */}
                  <div className="relative aspect-[4/3] lg:aspect-auto bg-gradient-to-br from-muted/40 to-muted/60 min-h-[280px] overflow-hidden">
                    <div className="absolute inset-4 rounded-xl overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-primary/20 to-emerald-800/20" />
                      {/* Retinal vessel simulation */}
                      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 300 240">
                        <path d="M150 120 Q100 80 60 60 Q30 45 10 50" stroke="#0F6E56" fill="none" strokeWidth="2" />
                        <path d="M150 120 Q200 80 240 60 Q270 45 290 50" stroke="#0F6E56" fill="none" strokeWidth="2" />
                        <path d="M150 120 Q140 160 130 190 Q120 210 110 220" stroke="#0F6E56" fill="none" strokeWidth="1.5" />
                        <path d="M150 120 Q160 160 170 190 Q180 210 190 220" stroke="#0F6E56" fill="none" strokeWidth="1.5" />
                        <circle cx="150" cy="120" r="22" fill="#f59e0b" opacity="0.4" />
                        <circle cx="110" cy="95" r="3" fill="#ef4444" opacity="0.5" />
                        <circle cx="168" cy="108" r="2.5" fill="#ef4444" opacity="0.4" />
                        <circle cx="135" cy="138" r="3" fill="#ef4444" opacity="0.45" />
                      </svg>

                      {/* Scanning line */}
                      <div
                        className="absolute left-0 right-0 h-0.5 scan-line-anim"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(15,110,86,0.9), rgba(52,211,153,1), rgba(15,110,86,0.9), transparent)', boxShadow: '0 0 16px 5px rgba(15,110,86,0.5)', top: `${scanProgress}%` }}
                      />

                      {/* Heatmap */}
                      {scanProgress > 55 && scanProgress < 96 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute w-32 h-32 rounded-full blur-xl animate-heatmap-focus"
                            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)', top: '20%', left: '30%' }} />
                          <div className="absolute w-20 h-20 rounded-full blur-lg animate-heatmap-focus"
                            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)', top: '45%', left: '58%', animationDelay: '0.7s' }} />
                        </div>
                      )}
                    </div>

                    {/* Complete overlay */}
                    <AnimatePresence>
                      {scanProgress >= 96 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-4 rounded-xl bg-primary/12 backdrop-blur-sm flex items-center justify-center border border-primary/20"
                        >
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', bounce: 0.5 }}
                              className="inline-flex items-center justify-center size-20 rounded-full bg-primary mb-4 shadow-2xl shadow-primary/50"
                            >
                              <Eye className="size-10 text-white" />
                            </motion.div>
                            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                              className="text-lg font-extrabold text-foreground">
                              Analysis Complete
                            </motion.p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Results panel */}
                  <div className="p-8 space-y-5">
                    <div>
                      {scanProgress < 96
                        ? <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-base font-semibold">Running ClaraVision-XAI pipeline…</span>
                          </div>
                        : <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Badge className="bg-[#EAF3DE] text-[#3B6D11] hover:bg-[#EAF3DE] border-0 text-sm font-bold py-1.5 px-3">
                              <CheckCircle className="size-4 mr-1.5" /> Classification Complete
                            </Badge>
                          </motion.div>
                      }
                    </div>

                    <AnimatePresence mode="wait">
                      {showResult && scanProgress >= 96 ? (
                        <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">Primary Diagnosis</p>
                            <p className="text-3xl font-black text-foreground">Diabetic Retinopathy</p>
                            <p className="text-base text-muted-foreground mt-1">Grade II Non-Proliferative</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { label: 'Confidence',  value: '91.8%', color: 'text-primary' },
                              { label: 'Uncertainty', value: 'Low',   color: 'text-emerald-600' },
                              { label: 'Inference',   value: '2.1s',  color: 'text-blue-600' },
                            ].map(m => (
                              <div key={m.label} className="bg-muted/40 rounded-xl p-3 text-center">
                                <p className="text-xs text-muted-foreground font-medium mb-1">{m.label}</p>
                                <p className={`text-xl font-black tabular-nums ${m.color}`}>{m.value}</p>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">Activated Features (Grad-CAM)</p>
                            <div className="flex flex-wrap gap-2">
                              {['Microaneurysms', 'Hard Exudates', 'Haemorrhages', 'Vessel Tortuosity'].map((f, i) => (
                                <motion.div key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                                  <Badge variant="secondary" className="text-sm px-3 py-1">{f}</Badge>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          <Button asChild className="w-full h-12 text-base font-bold">
                            <Link to="/analyze">
                              Submit Your Own Fundus Image
                              <ArrowRight className="ml-2 size-5" />
                            </Link>
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div key="loading" className="space-y-3.5 py-2">
                          {[3, 2, 2.5, 1.5].map((w, i) => (
                            <div key={i} className={`h-4 bg-muted/70 rounded-md animate-shimmer`}
                              style={{ width: `${w / 4 * 100}%`, animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════ */}
      <section id="features" ref={featuresRef} className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-4 px-5 py-2 text-sm font-semibold border-primary/30 bg-primary/5 text-primary">
              Platform Capabilities
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-5">
              Designed for Clinical Governance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Every feature in ClaraVision is built to meet the standards ophthalmologists and clinical researchers expect from regulated medical AI software.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 group border-border hover:border-primary/20 overflow-hidden">
                  <div className="h-1 w-full" style={{ background: f.accent }} />
                  <CardContent className="pt-6 pb-7 px-7">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="size-14 rounded-2xl flex items-center justify-center mb-5 transition-all"
                      style={{ backgroundColor: f.accent + '18' }}
                    >
                      <f.icon className="size-7" style={{ color: f.accent }} />
                    </motion.div>
                    <h3 className="text-xl font-extrabold text-foreground mb-3 leading-snug">{f.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 lg:px-8 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-3">Clinical Validation</h2>
            <p className="text-lg text-muted-foreground">Trusted by ophthalmologists, retinal specialists, and researchers.</p>
          </motion.div>

          <div className="relative min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="shadow-lg border-border hover:shadow-xl transition-all">
                  <CardContent className="pt-8 pb-8 px-10">
                    <div className="flex gap-1 mb-5">
                      {[...Array(5)].map((_, j) => <Star key={j} className="size-5 text-amber-400 fill-amber-400" />)}
                    </div>
                    <blockquote className="text-xl text-foreground leading-relaxed mb-8 font-medium italic">
                      &ldquo;{TESTIMONIALS[activeTestimonial].quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {TESTIMONIALS[activeTestimonial].initials}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground text-base">{TESTIMONIALS[activeTestimonial].author}</p>
                        <p className="text-sm text-muted-foreground">{TESTIMONIALS[activeTestimonial].role} · {TESTIMONIALS[activeTestimonial].institution}</p>
                        <p className="text-sm text-primary font-semibold mt-0.5">{TESTIMONIALS[activeTestimonial].specialty}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-2.5 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════ */}
      <section id="about" className="py-16 px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div>
                <Badge variant="outline" className="mb-4 px-5 py-2 text-sm font-semibold border-primary/30 bg-primary/5 text-primary">
                  About ClaraVision
                </Badge>
                <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-4">
                  Built for Clinicians,<br />
                  Grounded in Research
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  ClaraVision was developed as part of a retinal AI research initiative to bridge the gap between deep learning research and real-world ophthalmology practice. Every feature — from Grad-CAM explainability to calibrated uncertainty quantification — was designed with clinical trust and patient safety as the primary objectives.
                </p>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                The ClaraVision-XAI model is trained on diverse, multi-institutional fundus photography datasets spanning 9 retinal pathology classes, with special attention to demographic representation and image quality variation to ensure reliable performance across real-world clinical settings.
              </p>
              <div className="flex flex-wrap gap-2">
                {['ResNet-50 Backbone', 'Grad-CAM Explainability', 'MC Dropout Uncertainty', '9-Class Classification', 'HIPAA Compliant', 'Supabase Backend'].map(tag => (
                  <span key={tag} className="text-sm font-semibold px-4 py-1.5 rounded-full bg-primary/8 text-primary border border-primary/20">{tag}</span>
                ))}
              </div>
            </motion.div>

            {/* Right: creator card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-5"
            >
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Created By</p>

              <motion.div
                whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(15,110,86,0.25)' }}
                transition={{ duration: 0.2 }}
                className="bg-gradient-to-br from-card to-primary/5 border border-primary/20 rounded-3xl p-8 shadow-lg"
              >
                <div className="flex items-center gap-5 mb-6">
                  <div className="size-20 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-xl shadow-primary/30 text-white font-black text-3xl">
                    A
                  </div>
                  <div>
                    <p className="font-black text-foreground text-2xl">Arnob Aich Anurag</p>
                    <p className="text-primary font-extrabold text-base mt-1">Lead Developer &amp; Researcher</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Retinal AI · Computer Vision · Clinical Systems</p>
                  </div>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed mb-5">
                  Designed and built the full ClaraVision platform — from the ClaraVision-XAI deep learning pipeline and Grad-CAM explainability layer through to the clinical workflow, patient management system, and production web application.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {['AI/ML', 'Full-Stack Dev', 'Ophthalmology AI', 'React', 'Supabase'].map(skill => (
                    <span key={skill} className="text-sm font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary">{skill}</span>
                  ))}
                </div>
              </motion.div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <p className="font-extrabold text-foreground text-base mb-2">Research Symposium Project</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ClaraVision was presented at the Research Symposium as a production-grade demonstration of explainable AI in clinical ophthalmology — showing how modern deep learning can be deployed responsibly with full audit trails, uncertainty quantification, and clinician governance.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA (gradient banner)
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F6E56] via-[#0d5e48] to-[#063d30] p-12 lg:p-16 text-center shadow-2xl"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-white/15 mb-4">
                <Eye className="size-10 text-white" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white">
                Elevate Your Retinal Screening Programme
              </h2>
              <p className="text-xl text-emerald-100/80 leading-relaxed">
                Deploy ClaraVision across your institution to increase screening throughput, surface high-risk cases for specialist review, and build an auditable AI governance trail for every patient encounter.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button asChild size="lg" className="h-14 px-10 text-base font-extrabold bg-white text-[#0F6E56] hover:bg-emerald-50 shadow-2xl shadow-black/30 border-0">
                    <Link to="/dashboard">
                      Access Clinical Workstation
                      <ArrowRight className="ml-2 size-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button asChild size="lg" variant="outline" className="h-14 px-10 text-base font-bold border-2 border-white/30 text-white hover:bg-white/10 bg-transparent">
                    <Link to="/analytics">
                      View Analytics Dashboard
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="py-10 px-6 lg:px-8 border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10">
                <Eye className="size-5 text-primary" />
              </div>
              <div>
                <span className="font-black text-foreground text-lg">ClaraVision</span>
                <span className="text-muted-foreground text-sm ml-2">Clinical AI for Retinal Disease</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>HIPAA · FDA · CE · ISO 13485</span>
              <span className="text-muted-foreground/30 hidden sm:inline">|</span>
              <span>Decision-support software · Not for autonomous clinical use</span>
              <span className="text-muted-foreground/30 hidden sm:inline">|</span>
              <span className="text-primary font-bold">Built by Arnob Aich Anurag</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
