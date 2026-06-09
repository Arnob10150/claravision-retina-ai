import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Eye, Search, Calendar, User,
  Building2, Printer, CheckCircle, XCircle, ClipboardList,
  Activity, TrendingUp, Filter, RefreshCw, Brain
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  patient_code: string
  patient_age: number | null
  patient_gender: string | null
  predicted_class: string
  confidence: number
  uncertainty_level: 'low' | 'medium' | 'high'
  uncertainty_score: number
  eye_side: string
  reviewer: string
  reviewer_role: string
  final_diagnosis: string
  agreement: boolean
  institution: string | null
  signed_off_at: string
  notes: string
  analysis_id: string
  processing_time_ms: number
  concepts: string[]
}

const STATUS_CONFIG = {
  signed_off: { label: 'Signed Off', className: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#3B6D11]/20 dark:text-[#86C95A]' },
}

/* ── PDF generation via browser print window ──────────────────────────────── */
function generatePDF(r: Report) {
  const win = window.open('', '_blank', 'width=850,height=1100')
  if (!win) { alert('Please allow pop-ups to generate PDF reports.'); return }

  win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>ClaraVision — Clinical Report ${r.patient_code}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; font-size: 12px; line-height: 1.55; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0F6E56; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-eye { width: 36px; height: 36px; background: #0F6E56; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 20px; font-weight: 800; color: #0F6E56; letter-spacing: -0.5px; }
  .brand-sub { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px; }
  .report-meta { text-align: right; }
  .report-meta .report-title { font-size: 14px; font-weight: 700; }
  .report-meta .report-id { font-size: 10px; color: #6b7280; font-family: monospace; }
  .disclaimer { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 10px; color: #92400e; margin-bottom: 24px; font-weight: 500; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .info-label { font-size: 9px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; }
  .info-value { font-size: 13px; font-weight: 600; color: #111; margin-top: 2px; }
  .info-value-sm { font-size: 11px; font-weight: 500; color: #374151; margin-top: 2px; }
  .diagnosis-card { background: #f0fdf4; border: 1.5px solid #0F6E56; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px; }
  .diagnosis-name { font-size: 18px; font-weight: 800; color: #0F6E56; }
  .diagnosis-row { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-low { background: #EAF3DE; color: #3B6D11; }
  .badge-medium { background: #FAEEDA; color: #854F0B; }
  .badge-high { background: #FCEBEB; color: #A32D2D; }
  .badge-confirmed { background: #EAF3DE; color: #3B6D11; }
  .badge-overridden { background: #FAEEDA; color: #854F0B; }
  .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; font-size: 11.5px; color: #374151; white-space: pre-wrap; }
  .chip { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 99px; padding: 2px 8px; font-size: 10px; color: #166534; font-weight: 600; margin: 2px; }
  .reviewer-card { display: flex; align-items: center; gap: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .reviewer-avatar { width: 40px; height: 40px; border-radius: 50%; background: #0F6E56; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0; }
  .sig-line { border-top: 1px solid #374151; width: 220px; padding-top: 4px; font-size: 9px; color: #6b7280; margin-top: 36px; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 20mm 16mm; size: A4 portrait; } }
</style></head><body><div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-eye"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3" fill="white" stroke="none"/></svg></div>
      <div><div class="brand-name">ClaraVision</div><div class="brand-sub">Clinical AI · Retinal Disease Diagnosis</div></div>
    </div>
    <div class="report-meta">
      <div class="report-title">Signed Diagnostic Report</div>
      <div class="report-id">Analysis ID: ${r.analysis_id}</div>
      <div class="report-id">Signed: ${new Date(r.signed_off_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>
  <div class="disclaimer">⚠ ClaraVision is a clinical decision-support tool (Class IIa Medical Device). AI predictions must be reviewed and confirmed by a qualified clinician before any diagnostic or treatment decision. This report is not a standalone clinical diagnosis.</div>
  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="grid-3">
      <div><div class="info-label">Patient Code</div><div class="info-value">${r.patient_code}</div></div>
      <div><div class="info-label">Age / Sex</div><div class="info-value">${r.patient_age ? `${r.patient_age} yrs` : '–'} · ${r.patient_gender ?? '–'}</div></div>
      <div><div class="info-label">Laterality</div><div class="info-value">${r.eye_side}</div></div>
      <div><div class="info-label">Institution</div><div class="info-value-sm">${r.institution ?? '–'}</div></div>
      <div><div class="info-label">Report Date</div><div class="info-value-sm">${new Date(r.signed_off_at).toLocaleDateString('en-GB')}</div></div>
      <div><div class="info-label">Inference Time</div><div class="info-value-sm">${r.processing_time_ms} ms</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">ClaraVision-XAI — Prediction Output</div>
    <div class="diagnosis-card">
      <div class="info-label">AI-Predicted Primary Diagnosis</div>
      <div class="diagnosis-name">${r.predicted_class}</div>
      <div class="diagnosis-row">
        <div><div class="info-label">Confidence</div><div class="info-value">${(r.confidence * 100).toFixed(1)}%</div></div>
        <div><div class="info-label">Uncertainty</div><div class="info-value"><span class="badge badge-${r.uncertainty_level}">${r.uncertainty_level.toUpperCase()}</span></div></div>
        <div><div class="info-label">Uncertainty Score</div><div class="info-value">${(r.uncertainty_score * 100).toFixed(1)}%</div></div>
      </div>
    </div>
    <div><div class="info-label" style="margin-bottom:6px">Activated Clinical Features (Grad-CAM)</div>
    <div>${r.concepts.map(c => `<span class="chip">${c}</span>`).join('')}</div></div>
  </div>
  <div class="section">
    <div class="section-title">Clinician's Final Diagnosis</div>
    <div class="grid-2">
      <div><div class="info-label">Final Diagnosis</div><div class="info-value">${r.final_diagnosis}</div></div>
      <div><div class="info-label">AI Outcome</div><div class="info-value"><span class="badge ${r.agreement ? 'badge-confirmed' : 'badge-overridden'}">${r.agreement ? 'AI Confirmed' : 'AI Overridden by Clinician'}</span></div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Clinical Notes &amp; Management Plan</div>
    <div class="notes-box">${r.notes}</div>
  </div>
  <div class="section">
    <div class="section-title">Reviewing Clinician</div>
    <div class="reviewer-card">
      <div class="reviewer-avatar">${r.reviewer.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}</div>
      <div><div style="font-weight:700;font-size:13px">${r.reviewer}</div><div style="font-size:10px;color:#6b7280">${r.reviewer_role} · ${r.institution ?? ''}</div><div style="font-size:10px;color:#6b7280;margin-top:2px">Signed: ${new Date(r.signed_off_at).toLocaleDateString('en-GB')}</div></div>
    </div>
    <div class="sig-line">Authorised signature — ${r.reviewer}, ${r.reviewer_role}</div>
  </div>
  <div class="footer">
    <span>ClaraVision · Clinical AI for Retinal Disease | HIPAA · FDA · CE · ISO 13485</span>
    <span>Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
  </div>
</div><script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
}

/* ── Preview dialog ───────────────────────────────────────────────────────── */
function ReportPreviewDialog({ report, open, onClose }: { report: Report | null; open: boolean; onClose: () => void }) {
  if (!report) return null
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Diagnostic Report — {report.patient_code}
          </DialogTitle>
          <DialogDescription>{report.reviewer_role} sign-off · {new Date(report.signed_off_at).toLocaleDateString('en-GB')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Patient</p>
              <p className="font-bold tabular-nums">{report.patient_code}</p>
              <p className="text-sm text-muted-foreground">
                {report.patient_age ? `${report.patient_age} yr` : '–'} · {report.patient_gender ?? '–'} · {report.eye_side}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Institution</p>
              <p className="text-sm font-semibold flex items-center gap-1 justify-end">
                <Building2 className="size-3.5" />{report.institution ?? '–'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                <Calendar className="size-3" />{new Date(report.signed_off_at).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">ClaraVision-XAI Prediction</p>
            <p className="text-xl font-bold text-foreground">{report.predicted_class}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="tabular-nums text-sm font-semibold">{(report.confidence * 100).toFixed(1)}% confidence</span>
              <UncertaintyBadge level={report.uncertainty_level} score={report.uncertainty_score} showScore size="sm" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {report.concepts.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Final Diagnosis</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">{report.final_diagnosis}</span>
              <Badge className={cn('text-xs border-0', report.agreement
                ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-amber-100 text-amber-700')}>
                {report.agreement
                  ? <><CheckCircle className="size-3 mr-1" />AI Confirmed</>
                  : <><XCircle className="size-3 mr-1" />AI Overridden</>}
              </Badge>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Clinical Notes</p>
            <p className="text-sm leading-relaxed bg-muted/30 rounded-lg p-3.5 border">{report.notes}</p>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {report.reviewer.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-sm">{report.reviewer}</p>
              <p className="text-xs text-muted-foreground">{report.reviewer_role} · {report.institution}</p>
            </div>
            <div className="ml-auto">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_CONFIG.signed_off.className)}>
                Signed Off
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={() => generatePDF(report)}>
              <Printer className="size-4 mr-1.5" />Print / Save PDF
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Reports page ────────────────────────────────────────────────────── */
export function Reports() {
  const [search, setSearch] = useState('')
  const [filterAgreement, setFilterAgreement] = useState('all')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, agreement, final_diagnosis, notes, signed_off_at, reviewer_id,
          scans(
            id, predicted_class, confidence, uncertainty_level, uncertainty_score,
            eye_side, analysis_metadata, referral_flag,
            patients(patient_code, age, gender)
          )
        `)
        .order('signed_off_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Fetch reviewer profiles separately to avoid FK join issues
      const reviewerIds = [...new Set((data ?? []).map((r: any) => r.reviewer_id).filter(Boolean))]
      const profileMap: Record<string, any> = {}
      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role, institution')
          .in('id', reviewerIds)
        for (const p of profiles ?? []) profileMap[p.id] = p
      }

      setReports(
        (data ?? [])
          .filter((r: any) => r.scans)
          .map((r: any) => {
            const s = r.scans
            const p = s.patients
            const prof = profileMap[r.reviewer_id] ?? null
            const meta: any = s.analysis_metadata ?? {}
            const concepts: string[] = (meta.concepts ?? []).map((c: any) => c.name ?? c).filter(Boolean)
            return {
              id: r.id,
              patient_code: p?.patient_code ?? `SC-${s.id.slice(0, 6).toUpperCase()}`,
              patient_age: p?.age ?? null,
              patient_gender: p?.gender ?? null,
              predicted_class: s.predicted_class,
              confidence: s.confidence,
              uncertainty_level: s.uncertainty_level,
              uncertainty_score: s.uncertainty_score ?? 0,
              eye_side: s.eye_side === 'left' ? 'Left (OS)' : s.eye_side === 'right' ? 'Right (OD)' : '–',
              reviewer: prof?.full_name ?? 'Clinician',
              reviewer_role: prof?.role ?? 'Ophthalmologist',
              final_diagnosis: r.final_diagnosis,
              agreement: r.agreement === 'agree',
              institution: prof?.institution ?? null,
              signed_off_at: r.signed_off_at ?? new Date().toISOString(),
              notes: r.notes ?? '',
              analysis_id: meta.analysis_id ?? s.id.slice(0, 12).toUpperCase(),
              processing_time_ms: meta.processing_time_ms ?? 0,
              concepts,
            } as Report
          })
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = reports.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.patient_code.toLowerCase().includes(q) ||
      r.predicted_class.toLowerCase().includes(q) ||
      r.reviewer.toLowerCase().includes(q) ||
      r.final_diagnosis.toLowerCase().includes(q)
    const matchAgreement = filterAgreement === 'all' ||
      (filterAgreement === 'confirmed' && r.agreement) ||
      (filterAgreement === 'overridden' && !r.agreement)
    return matchSearch && matchAgreement
  })

  const stats = [
    { label: 'Total Reports',   value: reports.length, sub: 'Signed & filed',       icon: ClipboardList, color: 'text-primary' },
    { label: 'AI Confirmed',    value: reports.filter(r => r.agreement).length,  sub: 'Diagnosis agreed',  icon: CheckCircle,   color: 'text-emerald-600' },
    { label: 'AI Overridden',   value: reports.filter(r => !r.agreement).length, sub: 'Clinician revised', icon: Activity,      color: 'text-amber-600' },
    {
      label: 'Avg. Confidence',
      value: reports.length > 0
        ? `${(reports.reduce((s, r) => s + r.confidence, 0) / reports.length * 100).toFixed(1)}%`
        : '–',
      sub: 'Across signed reports',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
  ]

  return (
    <DashboardLayout title="Clinical Reports">
      <div className="max-w-6xl space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="hover:shadow-md hover:border-primary/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</p>
                      {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                        <p className={cn('text-2xl font-bold tabular-nums mt-1', s.color)}>{s.value}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                    </div>
                    <div className={cn('size-8 rounded-lg bg-muted flex items-center justify-center', s.color)}>
                      <s.icon className="size-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search patient, diagnosis, reviewer…" value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filterAgreement} onValueChange={setFilterAgreement}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All outcomes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="confirmed">AI Confirmed</SelectItem>
                <SelectItem value="overridden">AI Overridden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{loading ? '–' : `${filtered.length} report${filtered.length !== 1 ? 's' : ''}`}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1.5 text-muted-foreground h-8">
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Report list */}
        <div className="grid gap-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-64" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
              </CardContent></Card>
            ))
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Brain className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-medium">
                {reports.length === 0 ? 'No signed reports yet' : 'No reports match your search'}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {reports.length === 0
                  ? 'Reports are created when a clinician signs off on a scan review.'
                  : 'Try adjusting the search or filter'}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filtered.map((report, i) => (
                <motion.div key={report.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -1 }}>
                  <Card className="cursor-pointer hover:shadow-md hover:border-primary/25 transition-all group"
                    onClick={() => { setSelectedReport(report); setPreviewOpen(true) }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        <motion.div whileHover={{ scale: 1.05 }}
                          className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <FileText className="size-5 text-primary" />
                        </motion.div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold tabular-nums">{report.patient_code}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-sm font-semibold">{report.predicted_class}</span>
                            <UncertaintyBadge level={report.uncertainty_level} size="sm" />
                            <Badge className={cn('text-xs border-0 ml-0.5',
                              report.agreement
                                ? 'bg-[#EAF3DE] text-[#3B6D11]'
                                : 'bg-amber-100 text-amber-700')}>
                              {report.agreement ? 'AI Confirmed' : 'AI Overridden'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{report.notes || report.final_diagnosis}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm flex-wrap shrink-0">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <User className="size-3.5" /><span>{report.reviewer}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Calendar className="size-3.5" />
                            <span>{formatDistanceToNow(new Date(report.signed_off_at), { addSuffix: true })}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 px-2"
                            onClick={e => { e.stopPropagation(); setSelectedReport(report); setPreviewOpen(true) }}>
                            <Eye className="size-3.5 mr-1" />View
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 px-2 hover:border-primary/40 hover:text-primary"
                            onClick={e => { e.stopPropagation(); generatePDF(report) }}>
                            <Download className="size-3.5 mr-1" />PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <ReportPreviewDialog report={selectedReport} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </DashboardLayout>
  )
}
