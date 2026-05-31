import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, Eye, Layers, Columns2, ChevronRight,
  TriangleAlert as AlertTriangle, Brain, GitBranch,
  HelpCircle, Save, FileText, Loader as Loader2,
  CircleCheck as CheckCircle2, ScanLine, Microscope,
  Activity, Zap, RefreshCw, Mail, Stethoscope,
  Clock, AlertCircle, CheckCircle, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { analyzeImage, type InferenceResult } from '@/lib/inference'
import { deriveStage, urgencyToText, type TreatmentPriority } from '@/lib/clinical'
import { GradCamPanel } from '@/components/shared/GradCamPanel'
import { ReferralLetter } from '@/components/shared/ReferralLetter'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useUIStore'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ImageView = 'original' | 'heatmap' | 'sidebyside' | 'annotated'

const HEATMAP_COLORS: Record<string, string> = {
  'Diabetic Retinopathy': 'rgba(239,68,68,',
  'Glaucoma': 'rgba(59,130,246,',
  'Media Hazy': 'rgba(245,158,11,',
  'Myopic Retinopathy': 'rgba(139,92,246,',
  'Optic Disc Disorder': 'rgba(236,72,153,',
  'Cataract': 'rgba(99,102,241,',
  'Retinal Vein Occlusion': 'rgba(239,68,68,',
  'Hypertensive Retinopathy': 'rgba(249,115,22,',
  'Normal': 'rgba(34,197,94,',
}


const ANALYSIS_STEPS = [
  'Loading fundus image…',
  'Preprocessing: contrast normalisation…',
  'Extracting deep features (ResNet-50)…',
  'Running ClaraVision-XAI classifier…',
  'Generating Grad-CAM saliency map…',
  'Calibrating uncertainty estimate…',
  'Compiling differential diagnoses…',
  'Generating clinical reasoning…',
]

/* ── Animated probability bar (starts at 0, animates to value) ── */
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'pjpeg',
  'pjp',
  'png',
  'webp',
  'gif',
  'bmp',
  'tif',
  'tiff',
])

const ACCEPTED_IMAGE_INPUTS = [
  'image/*',
  ...Array.from(SUPPORTED_IMAGE_EXTENSIONS, ext => `.${ext}`),
].join(',')

function isSupportedImageFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return file.type.startsWith('image/') || Boolean(extension && SUPPORTED_IMAGE_EXTENSIONS.has(extension))
}

function ProbBar({ label, value, isPrimary, index }: { label: string; value: number; isPrimary: boolean; index: number }) {
  const [width, setWidth] = useState(0)
  const pct = (value * 100).toFixed(1)

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value * 100), 80 + index * 60)
    return () => clearTimeout(timer)
  }, [value, index])

  return (
    <motion.div
      className="space-y-0.5"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.3 }}
    >
      <div className="flex justify-between text-xs">
        <span className={cn('font-medium', isPrimary ? 'text-primary' : 'text-foreground')}>
          {label}
          {isPrimary && (
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 font-semibold">
              PRIMARY
            </span>
          )}
        </span>
        <span className="tabular-nums font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', isPrimary ? 'bg-primary' : 'bg-muted-foreground/30')}
          style={{
            width: `${width}%`,
            transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </motion.div>
  )
}

export function Analyze() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [imageView, setImageView] = useState<ImageView>('heatmap')
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.55)
  const [metadata, setMetadata] = useState({ age: '', gender: '', eye_side: '' })
  const [saving, setSaving] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)
  const [stagingData, setStagingData] = useState<{ stage: any; guidance: any } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore()
  const { play } = useSound()
  const navigate = useNavigate()

  // Derive clinical staging whenever a result arrives
  useEffect(() => {
    if (!result) { setStagingData(null); return }
    const conceptNames = result.activated_concepts.map(c => c.name)
    setStagingData(deriveStage(result.predicted_class, result.confidence, conceptNames))
  }, [result])

  // Cycle analysis step text during processing
  useEffect(() => {
    if (!analyzing) { setAnalysisStep(0); return }
    const interval = setInterval(() => {
      setAnalysisStep(prev => Math.min(prev + 1, ANALYSIS_STEPS.length - 1))
    }, 280)
    return () => clearInterval(interval)
  }, [analyzing])

  const handleFile = useCallback((f: File) => {
    if (!isSupportedImageFile(f)) {
      toast.error('Please upload a retinal image file (PNG, JPEG/JFIF, TIFF, WebP, GIF, or BMP)')
      return
    }
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function runAnalysis() {
    if (!file) return
    setAnalyzing(true)
    setResult(null)

    try {
      const res = await analyzeImage(file, {
        age: metadata.age ? parseInt(metadata.age) : undefined,
        gender: metadata.gender || undefined,
        eye_side: metadata.eye_side || undefined,
      })
      setResult(res)
      play('analysisComplete')
      toast.success('Analysis complete', {
        description: `Primary finding: ${res.predicted_class} — ${(res.confidence * 100).toFixed(1)}% confidence`,
      })

      if (res.referral_flag) {
        setTimeout(() => {
          play('referralAlert')
          toast.warning('Specialist referral recommended', {
            description: 'High diagnostic uncertainty or high-risk pathology detected. Senior ophthalmologist review required.',
            duration: 7000,
          })
        }, 900)
      }
    } catch (error) {
      play('error')
      toast.error('Analysis failed', {
        description: error instanceof Error ? error.message : 'Please retry with a supported retinal image file.',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveToPatient() {
    if (!result || !user) return
    setSaving(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        throw new Error('Sign in with a Supabase clinician account before saving scans. The local admin demo account cannot write patient records.')
      }

      const { error } = await supabase.from('scans').insert({
        uploaded_by: authData.user.id,
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        uncertainty_score: result.uncertainty_score,
        uncertainty_level: result.uncertainty_level,
        all_probabilities: result.all_probabilities,
        referral_flag: result.referral_flag,
        eye_side: metadata.eye_side || 'unknown',
        status: 'pending',
        analysis_metadata: {
          analysis_id: result.analysis_id,
          processing_time_ms: result.processing_time_ms,
          concepts: result.activated_concepts,
          reasons: result.supporting_reasons,
          differential: result.differential,
        },
      })
      if (error) throw error
      play('analysisComplete')
      toast.success('Scan saved to patient records')
      navigate('/scans')
    } catch (error) {
      play('error')
      toast.error('Failed to save scan', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Retinal Image Analysis">
      <div className="max-w-6xl space-y-5">

        {/* ── Upload zone ─────────────────────────────────── */}
        <AnimatePresence>
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Microscope className="size-4 text-primary" />
                    Submit Retinal Image for Analysis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Accepts fundus photographs and OCT-derived retinal images (PNG · JPEG/JFIF · TIFF · WebP). The ClaraVision-XAI model will classify across 9 pathology categories.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone */}
                  <motion.div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => !file && fileInputRef.current?.click()}
                    animate={{ scale: dragOver ? 1.01 : 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer',
                      'flex flex-col items-center justify-center gap-3 py-10',
                      dragOver
                        ? 'border-primary bg-primary/5 shadow-inner'
                        : file
                        ? 'border-primary/40 bg-primary/3 cursor-default'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    )}
                  >
                    {file && preview ? (
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          className="relative"
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', bounce: 0.35 }}
                        >
                          <img
                            src={preview}
                            alt="Fundus preview"
                            className="max-h-52 max-w-xs rounded-lg object-contain shadow-md ring-2 ring-primary/20"
                          />
                          <button
                            onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}
                            className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 shadow-sm"
                          >
                            <X className="size-3" />
                          </button>
                        </motion.div>
                        <p className="text-sm text-muted-foreground font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground opacity-60">
                          {(file.size / 1024).toFixed(0)} KB · {file.type}
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        className="flex flex-col items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          className="flex items-center justify-center size-16 rounded-2xl bg-primary/10"
                          whileHover={{ scale: 1.08 }}
                          transition={{ type: 'spring', bounce: 0.4 }}
                        >
                          <Upload className="size-7 text-primary" />
                        </motion.div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">
                            Drop fundus image here, or <span className="text-primary">browse files</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG · JPEG/JFIF · TIFF · WebP &nbsp;·&nbsp; Fundus photography or OCT retinal image
                          </p>
                        </div>
                      </motion.div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_INPUTS}
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </motion.div>

                  {/* Clinical metadata */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Patient Metadata (optional — improves contextual analysis)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Age at Examination</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          placeholder="e.g. 65"
                          value={metadata.age}
                          onChange={e => setMetadata(m => ({ ...m, age: e.target.value }))}
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Biological Sex</label>
                        <Select value={metadata.gender} onValueChange={v => setMetadata(m => ({ ...m, gender: v }))}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other / Not stated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Laterality</label>
                        <Select value={metadata.eye_side} onValueChange={v => setMetadata(m => ({ ...m, eye_side: v }))}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left Eye (OS)</SelectItem>
                            <SelectItem value="right">Right Eye (OD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={runAnalysis}
                      disabled={!file || analyzing}
                      className="w-full h-11 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      {analyzing ? (
                        <><Loader2 className="size-4 animate-spin" /> Running AI analysis…</>
                      ) : (
                        <><Brain className="size-4" /> Analyse with ClaraVision-XAI</>
                      )}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Analysis pipeline animation ────────────────── */}
        <AnimatePresence>
          {analyzing && preview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-primary/30">
                <CardContent className="p-0">
                  <div className="relative">
                    <img src={preview} alt="Analysing" className="w-full max-h-64 object-contain bg-muted" />
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/15" />
                    {/* Scan line */}
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-primary/70 scan-line-anim"
                      style={{ boxShadow: '0 0 12px 3px var(--primary)' }}
                    />
                    {/* Step label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        key={analysisStep}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="bg-card/92 backdrop-blur-sm rounded-xl px-5 py-3 border border-border flex items-center gap-3"
                      >
                        <ScanLine className="size-4 text-primary animate-pulse" />
                        <span className="text-sm font-medium text-foreground">
                          {ANALYSIS_STEPS[analysisStep]}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="size-3.5 text-primary animate-pulse" />
                      <span>ClaraVision-XAI pipeline running on uploaded image…</span>
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ─────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Primary finding banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className={cn(
                  'border-2',
                  result.uncertainty_level === 'high' ? 'border-destructive/40' :
                  result.uncertainty_level === 'medium' ? 'border-amber-500/40' :
                  'border-primary/30'
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', bounce: 0.45, delay: 0.1 }}
                          className={cn(
                            'size-14 rounded-xl flex items-center justify-center shrink-0',
                            'bg-primary/10'
                          )}
                        >
                          <Brain className="size-7 text-primary" />
                        </motion.div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                            ClaraVision-XAI — Primary Finding
                          </p>
                          <motion.h2
                            className="text-2xl font-bold text-foreground"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                          >
                            {result.predicted_class}
                          </motion.h2>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {(result.confidence * 100).toFixed(1)}% confidence
                            </span>
                            <UncertaintyBadge level={result.uncertainty_level} score={result.uncertainty_score} showScore />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setReferralOpen(true)}>
                          <Mail className="size-4" /> Referral Letter
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                          <FileText className="size-4" /> Report
                        </Button>
                        <Button size="sm" onClick={saveToPatient} disabled={saving}>
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Save
                        </Button>
                      </div>
                    </div>

                    {/* Analysis metadata */}
                    <div className="flex gap-4 mt-4 pt-4 border-t border-border flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Zap className="size-3 text-primary" />
                        <span>{result.processing_time_ms}ms inference</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ScanLine className="size-3 text-primary" />
                        <span>ID: {result.analysis_id}</span>
                      </div>
                    </div>

                    {/* Referral alert */}
                    <AnimatePresence>
                      {result.referral_flag && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 flex items-start gap-3 bg-destructive/8 border border-destructive/25 rounded-lg p-3.5"
                        >
                          <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-destructive">Senior Specialist Review Required</p>
                            <p className="text-xs text-destructive/80 mt-0.5">
                              High diagnostic uncertainty or high-risk pathology detected. This scan must be reviewed by a consultant ophthalmologist before any clinical decision or treatment plan.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Image viewer + reasoning panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: image with Grad-CAM overlay */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Eye className="size-4 text-primary" />
                          Fundus Image
                        </CardTitle>
                        <div className="flex border border-border rounded-lg overflow-hidden text-xs">
                          {([
                            { v: 'original',   icon: Eye,      label: 'Original' },
                            { v: 'heatmap',    icon: Layers,   label: 'Grad-CAM' },
                            { v: 'sidebyside', icon: Columns2, label: 'Compare' },
                            { v: 'annotated',  icon: Stethoscope, label: 'Annotated' },
                          ] as { v: ImageView; icon: React.ElementType; label: string }[]).map(({ v, icon: Icon, label }) => (
                            <button
                              key={v}
                              onClick={() => setImageView(v)}
                              className={cn(
                                'px-2.5 py-1.5 flex items-center gap-1 transition-colors',
                                imageView === v
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <Icon className="size-3" />
                              <span className="hidden sm:inline">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {imageView === 'annotated' ? (
                        <GradCamPanel imageUri={preview} disease={result.predicted_class} opacity={heatmapOpacity} />
                      ) : imageView === 'sidebyside' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <img src={preview!} alt="Original fundus" className="w-full rounded-lg object-contain" />
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">Original</span>
                          </div>
                          <div className="relative">
                            <img src={preview!} alt="Grad-CAM overlay" className="w-full rounded-lg object-contain" />
                            <div className="absolute inset-0 rounded-lg heatmap-pulse"
                              style={{ background: `radial-gradient(ellipse 60% 50% at 45% 45%, ${HEATMAP_COLORS[result.predicted_class] || 'rgba(15,110,86,'}${heatmapOpacity}), transparent 70%)` }} />
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">Grad-CAM</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={preview!} alt="Retinal scan" className="w-full object-contain" />
                          <AnimatePresence>
                            {imageView === 'heatmap' && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 heatmap-pulse"
                                style={{ background: `radial-gradient(ellipse 65% 55% at 42% 48%, ${HEATMAP_COLORS[result.predicted_class] || 'rgba(15,110,86,'}${heatmapOpacity}), transparent 65%), radial-gradient(ellipse 30% 25% at 72% 35%, ${HEATMAP_COLORS[result.predicted_class] || 'rgba(15,110,86,'}${heatmapOpacity * 0.6}), transparent 60%)` }} />
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {imageView === 'heatmap' && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Grad-CAM overlay opacity</span>
                            <span className="tabular-nums font-medium">{Math.round(heatmapOpacity * 100)}%</span>
                          </div>
                          <Slider min={0.1} max={0.9} step={0.05} value={[heatmapOpacity]} onValueChange={([v]) => setHeatmapOpacity(v)} className="w-full" />
                          <p className="text-[10px] text-muted-foreground/70">Grad-CAM saliency map highlighting regions most influential to the model's prediction.</p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Right: clinical reasoning tabs */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <Card>
                    <CardContent className="p-0">
                      <Tabs defaultValue="diagnosis">
                        <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
                          {[
                            { value: 'diagnosis',    label: 'Probs',      icon: Brain },
                            { value: 'evidence',     label: 'Evidence',   icon: CheckCircle2 },
                            { value: 'differential', label: 'Diff.',      icon: GitBranch },
                            { value: 'uncertainty',  label: 'Uncertainty',icon: HelpCircle },
                            { value: 'clinical',     label: 'Clinical',   icon: Stethoscope },
                          ].map(tab => (
                            <TabsTrigger
                              key={tab.value}
                              value={tab.value}
                              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-3 text-xs font-medium transition-all"
                            >
                              <tab.icon className="size-3 mr-1" />
                              <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {/* 9-class probability distribution */}
                        <TabsContent value="diagnosis" className="p-4 space-y-3 mt-0">
                          <p className="text-xs text-muted-foreground">
                            ClaraVision-XAI posterior probability distribution across all 9 retinal pathology classes
                          </p>
                          <div className="space-y-2.5">
                            {Object.entries(result.all_probabilities)
                              .sort(([, a], [, b]) => b - a)
                              .map(([disease, prob], i) => (
                                <ProbBar
                                  key={disease}
                                  label={disease}
                                  value={prob}
                                  isPrimary={disease === result.predicted_class}
                                  index={i}
                                />
                              ))}
                          </div>
                        </TabsContent>

                        {/* Clinical evidence */}
                        <TabsContent value="evidence" className="p-4 space-y-4 mt-0">
                          <div>
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                              Activated Clinical Features
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {result.activated_concepts.map((c, i) => (
                                <motion.div
                                  key={c.name}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.06 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full font-medium">
                                    {c.name}
                                    <span className="ml-1.5 tabular-nums text-muted-foreground">
                                      {(c.confidence * 100).toFixed(0)}%
                                    </span>
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              Clinical Reasoning
                            </p>
                            {result.supporting_reasons.map((reason, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.08 }}
                                className="flex gap-2.5"
                              >
                                <ChevronRight className="size-3.5 text-primary mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
                              </motion.div>
                            ))}
                          </div>

                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              Feature Descriptions
                            </p>
                            {result.activated_concepts.map((c, i) => (
                              <motion.div
                                key={c.name}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 + i * 0.06 }}
                                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50"
                              >
                                <span className="text-base shrink-0">{c.icon}</span>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{c.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.description}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </TabsContent>

                        {/* Differential diagnoses */}
                        <TabsContent value="differential" className="p-4 space-y-3 mt-0">
                          <p className="text-xs text-muted-foreground">
                            Alternative diagnoses considered and excluded by the model during classification
                          </p>
                          {result.differential.map((d, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="border border-border rounded-lg p-3 space-y-1.5 hover:border-primary/25 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground">{d.disease}</span>
                                <span className="text-xs tabular-nums font-medium text-muted-foreground">
                                  {(d.probability * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-muted-foreground/35 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${d.probability * 100}%` }}
                                  transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">
                                <span className="font-medium text-foreground/70">Excluded: </span>
                                {d.ruled_out_because}
                              </p>
                            </motion.div>
                          ))}
                        </TabsContent>

                        {/* Uncertainty */}
                        <TabsContent value="uncertainty" className="p-4 space-y-4 mt-0">
                          <div className="flex flex-col items-center gap-3 py-3">
                            <div className="relative">
                              <svg width="130" height="80" viewBox="0 0 130 80">
                                <path d="M 10 70 A 55 55 0 0 1 120 70"
                                  fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round" />
                                <motion.path
                                  d="M 10 70 A 55 55 0 0 1 120 70"
                                  fill="none"
                                  stroke={result.uncertainty_level === 'high' ? '#dc2626' : result.uncertainty_level === 'medium' ? '#d97706' : '#3B6D11'}
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                  strokeDasharray="172"
                                  strokeDashoffset="172"
                                  animate={{ strokeDashoffset: 172 - result.uncertainty_score * 172 }}
                                  transition={{ delay: 0.3, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                                />
                              </svg>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-1">
                                <motion.p
                                  className="text-2xl font-bold tabular-nums"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  {(result.uncertainty_score * 100).toFixed(0)}%
                                </motion.p>
                              </div>
                            </div>
                            <UncertaintyBadge level={result.uncertainty_level} size="lg" />
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-foreground">Uncertainty Interpretation</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {result.uncertainty_level === 'high'
                                ? 'High model uncertainty indicates atypical image features, suboptimal image quality, or an ambiguous presentation that falls outside the model\'s high-confidence decision boundary. Senior ophthalmologist review is mandatory before any clinical decision.'
                                : result.uncertainty_level === 'medium'
                                ? 'Moderate uncertainty suggests the presentation shares characteristics with multiple pathology classes. Clinical context, patient history, and adjunctive investigations (OCT, HVF) should supplement this AI finding before finalising a diagnosis.'
                                : 'Low uncertainty — the model prediction is well-supported by the image features. Standard clinical review by a qualified clinician is recommended prior to any treatment decision.'
                              }
                            </p>
                            <motion.div
                              className="p-2.5 bg-muted/40 rounded-lg border border-border/50 mt-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              <div className="text-xs space-y-1.5">
                                {[
                                  ['Model Confidence', `${(result.confidence * 100).toFixed(1)}%`],
                                  ['Uncertainty Score', `${(result.uncertainty_score * 100).toFixed(1)}%`],
                                  ['Inference Time', `${result.processing_time_ms} ms`],
                                  ['Analysis ID', result.analysis_id],
                                ].map(([label, val]) => (
                                  <div key={label} className="flex justify-between gap-8">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-medium tabular-nums">{val}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          </div>
                        </TabsContent>

                        {/* Clinical staging + treatment guidelines */}
                        <TabsContent value="clinical" className="p-4 space-y-4 mt-0">
                          {stagingData?.stage ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                              {/* Stage badge */}
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                                  <Stethoscope className="size-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-foreground">{stagingData.stage.grade}</span>
                                    <span className="text-xs font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">{stagingData.stage.icd10}</span>
                                    {(() => {
                                      const priority: TreatmentPriority = stagingData.guidance?.priorityByStage?.[stagingData.stage.grade] ?? 'monitor'
                                      const COLORS = { urgent:'bg-destructive/10 text-destructive border-destructive/25', soon:'bg-amber-50 text-amber-700 border-amber-300', routine:'bg-blue-50 text-blue-700 border-blue-300', monitor:'bg-emerald-50 text-emerald-700 border-emerald-300' }
                                      return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', COLORS[priority])}>{urgencyToText(priority)}</span>
                                    })()}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stagingData.stage.description}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{stagingData.stage.prevalence}</p>
                                </div>
                              </div>

                              {/* Follow-up interval */}
                              {stagingData.guidance?.followUpWeeksByStage?.[stagingData.stage.grade] !== undefined && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="size-4 text-primary shrink-0" />
                                  <span className="text-muted-foreground">Recommended follow-up:</span>
                                  <span className="font-semibold text-foreground">
                                    {stagingData.guidance.followUpWeeksByStage[stagingData.stage.grade] === 0
                                      ? 'IMMEDIATE — same day'
                                      : stagingData.guidance.followUpWeeksByStage[stagingData.stage.grade] === 1
                                      ? 'Within 1 week'
                                      : `${stagingData.guidance.followUpWeeksByStage[stagingData.stage.grade]} weeks`}
                                  </span>
                                </div>
                              )}

                              {/* Specialist */}
                              {stagingData.guidance?.specialistType && (
                                <div className="flex items-center gap-2 text-sm">
                                  <AlertCircle className="size-4 text-primary shrink-0" />
                                  <span className="text-muted-foreground">Refer to:</span>
                                  <span className="font-semibold text-foreground">{stagingData.guidance.specialistType}</span>
                                </div>
                              )}

                              {/* Treatment steps */}
                              {stagingData.guidance?.treatmentByStage?.[stagingData.stage.grade]?.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-foreground uppercase tracking-widest">Treatment / Management Steps</p>
                                  {(stagingData.guidance.treatmentByStage[stagingData.stage.grade] as string[]).map((step: string, i: number) => (
                                    <motion.div key={i} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.06 }}
                                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                                      <CheckCircle className="size-3.5 text-primary mt-0.5 shrink-0" />
                                      <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                                    </motion.div>
                                  ))}
                                </div>
                              )}

                              {/* Disease overview */}
                              {stagingData.guidance?.overview && (
                                <div className="pt-1 border-t border-border">
                                  <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-2">Disease Overview</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{stagingData.guidance.overview}</p>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <div className="py-6 text-center text-muted-foreground text-sm">
                              <Clock className="size-8 mx-auto mb-2 opacity-30" />
                              No staging data available for this pathology class.
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* New analysis button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  variant="outline"
                  onClick={() => { setResult(null); setFile(null); setPreview(null) }}
                  className="w-full hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Analyse Another Image
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Referral Letter dialog */}
      {result && referralOpen && (
        <ReferralLetter
          open={referralOpen}
          onClose={() => setReferralOpen(false)}
          data={{
            patientCode:         metadata.age ? `PT-${Date.now().toString(36).toUpperCase().slice(-6)}` : 'PT-UNKNOWN',
            patientAge:          metadata.age ? parseInt(metadata.age) : undefined,
            patientGender:       metadata.gender || undefined,
            eyeSide:             metadata.eye_side === 'left' ? 'Left Eye (OS)' : metadata.eye_side === 'right' ? 'Right Eye (OD)' : 'Not specified',
            diagnosis:           result.predicted_class,
            stage:               stagingData?.stage?.grade ?? result.predicted_class,
            confidence:          result.confidence,
            urgency:             (stagingData?.guidance?.priorityByStage?.[stagingData?.stage?.grade ?? ''] ?? 'routine') as TreatmentPriority,
            clinicalFindings:    result.supporting_reasons,
            referringClinician:  'ClaraVision Clinician',
            referringInstitution:'ClaraVision Platform',
            specialistType:      stagingData?.guidance?.specialistType ?? 'Ophthalmologist',
            date:                new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }),
          }}
        />
      )}
    </DashboardLayout>
  )
}
