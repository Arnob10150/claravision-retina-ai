import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ScanLine, Filter, RefreshCw, Brain, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase, isSupabaseReady } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const DISEASE_CLASSES = [
  'Diabetic Retinopathy', 'Glaucoma', 'Media Hazy', 'Myopic Retinopathy',
  'Optic Disc Disorder', 'Cataract', 'Retinal Vein Occlusion',
  'Hypertensive Retinopathy', 'Normal',
]

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reviewed:   { label: 'Reviewed',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  signed_off: { label: 'Signed Off', className: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#3B6D11]/20 dark:text-[#86C95A]' },
}

interface ScanRow {
  id: string; patient_code: string; predicted_class: string
  confidence: number; uncertainty_level: 'low' | 'medium' | 'high'
  eye_side: string; status: string; created_at: string; referral_flag: boolean
}

export function Scans() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUncertainty, setFilterUncertainty] = useState('all')
  const [scans, setScans] = useState<ScanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)
  const patientFilter = searchParams.get('patient')

  async function loadData(showRefresh = false) {
    if (!isSupabaseReady()) { setLoading(false); setRefreshing(false); return }
    if (showRefresh) setRefreshing(true); else setLoading(true)
    try {
      let q = supabase
        .from('scans')
        .select('id,predicted_class,confidence,uncertainty_level,eye_side,status,created_at,referral_flag,patients(patient_code)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(200)
      if (patientFilter) q = q.eq('patient_id', patientFilter)
      const { data, count, error } = await q
      if (error) throw error
      setTotal(count ?? 0)
      setScans((data ?? []).map((s: any) => ({
        id: s.id,
        patient_code: s.patients?.patient_code ?? `SC-${s.id.slice(0, 6).toUpperCase()}`,
        predicted_class: s.predicted_class, confidence: s.confidence,
        uncertainty_level: s.uncertainty_level, eye_side: s.eye_side,
        status: s.status, created_at: s.created_at, referral_flag: s.referral_flag,
      })))
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadData() }, [patientFilter])

  const filtered = scans.filter(s => {
    const q = search.toLowerCase()
    return (
      (s.patient_code.toLowerCase().includes(q) || s.predicted_class.toLowerCase().includes(q)) &&
      (filterClass === 'all' || s.predicted_class === filterClass) &&
      (filterStatus === 'all' || s.status === filterStatus) &&
      (filterUncertainty === 'all' || s.uncertainty_level === filterUncertainty)
    )
  })

  const hasFilters = filterClass !== 'all' || filterStatus !== 'all' || filterUncertainty !== 'all' || !!search

  return (
    <DashboardLayout title="Scan Inventory">
      <div className="max-w-7xl space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search patient or diagnosis…" value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All diagnoses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All diagnoses</SelectItem>
              {DISEASE_CLASSES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="signed_off">Signed Off</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterUncertainty} onValueChange={setFilterUncertainty}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Uncertainty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All uncertainty</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{loading ? '–' : `${filtered.length} / ${total}`}</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1"
                onClick={() => { setSearch(''); setFilterClass('all'); setFilterStatus('all'); setFilterUncertainty('all') }}>
                <X className="size-3" /> Clear
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1 text-muted-foreground h-8">
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {['Patient', 'AI Prediction', 'Confidence', 'Uncertainty', 'Eye', 'Status', 'Time'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {[28, 40, 14, 16, 10, 20, 24].map((w, j) => (
                          <td key={j} className="py-3 px-4"><Skeleton className={`h-4 w-${w}`} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Brain className="size-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">
                          {scans.length === 0 ? 'No scans yet' : 'No scans match the current filters'}
                        </p>
                        {scans.length === 0 && (
                          <Button size="sm" className="mt-4" onClick={() => navigate('/analyze')}>
                            <ScanLine className="size-3.5 mr-1.5" /> Analyse First Scan
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {filtered.map((scan, i) => {
                        const s = STATUS_CONFIG[scan.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
                        return (
                          <motion.tr key={scan.id}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            className="border-b border-border/50 hover:bg-muted/30 cursor-pointer group transition-colors"
                            onClick={() => navigate(`/scans/${scan.id}`)}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                  <ScanLine className="size-3.5 text-primary" />
                                </div>
                                <span className="font-semibold tabular-nums">{scan.patient_code}</span>
                                {scan.referral_flag && <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded">REFER</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{scan.predicted_class}</td>
                            <td className="py-3 px-4 tabular-nums font-semibold">{(scan.confidence * 100).toFixed(1)}%</td>
                            <td className="py-3 px-4"><UncertaintyBadge level={scan.uncertainty_level} size="sm" /></td>
                            <td className="py-3 px-4 text-muted-foreground text-xs capitalize">
                              {scan.eye_side === 'left' ? 'OS' : scan.eye_side === 'right' ? 'OD' : '–'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs tabular-nums">
                              {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
