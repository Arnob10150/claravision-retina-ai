import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ScanLine, Users, CircleAlert as AlertCircle, Clock,
  TrendingUp, TrendingDown, ArrowRight,
  CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle,
  RefreshCw, Brain
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// ── Chart colours ──────────────────────────────────────────────────────────────
const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
  'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)',
]

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reviewed:   { label: 'Reviewed',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  signed_off: { label: 'Signed Off', className: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#3B6D11]/20 dark:text-[#86C95A]' },
}

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: '12px',
  color: 'var(--foreground)',
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface KPIData {
  totalScans: number
  pendingReviews: number
  highUncertainty: number
  scansToday: number
  totalScansLastWeek: number
  pendingLastWeek: number
}

interface RecentScan {
  id: string
  patient_code: string
  predicted_class: string
  uncertainty_level: 'low' | 'medium' | 'high'
  status: string
  created_at: string
}

interface DiseaseSlice {
  name: string
  value: number
  color: string
}

interface MonthlyPoint {
  month: string
  scans: number
  avg_confidence: number
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
          <td className="py-3 px-4"><Skeleton className="h-4 w-36" /></td>
          <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
        </tr>
      ))}
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyScans() {
  const navigate = useNavigate()
  return (
    <tr>
      <td colSpan={5} className="py-16 text-center">
        <Brain className="size-10 mx-auto text-muted-foreground opacity-20 mb-3" />
        <p className="text-sm text-muted-foreground font-medium">No scans yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Upload the first retinal image to get started</p>
        <Button size="sm" onClick={() => navigate('/analyze')}>
          <ScanLine className="size-3.5 mr-1.5" /> Analyze First Scan
        </Button>
      </td>
    </tr>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate = useNavigate()

  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [diseaseDistribution, setDiseaseDistribution] = useState<DiseaseSlice[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoISO = weekAgo.toISOString()

      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const twoWeeksAgoISO = twoWeeksAgo.toISOString()

      // Run all queries in parallel
      const [
        totalRes,
        pendingRes,
        highUncRes,
        todayRes,
        lastWeekTotalRes,
        lastWeekPendingRes,
        recentRes,
        allClassRes,
        monthlyRes,
      ] = await Promise.all([
        supabase.from('scans').select('*', { count: 'exact', head: true }),
        supabase.from('scans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('scans').select('*', { count: 'exact', head: true }).eq('uncertainty_level', 'high'),
        supabase.from('scans').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        // Last week total (for trend)
        supabase.from('scans').select('*', { count: 'exact', head: true })
          .gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
        // Last week pending (for trend)
        supabase.from('scans').select('*', { count: 'exact', head: true })
          .eq('status', 'pending').gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
        // Recent scans with patient join
        supabase.from('scans')
          .select('id, predicted_class, uncertainty_level, status, created_at, patients(patient_code)')
          .order('created_at', { ascending: false })
          .limit(8),
        // All scans for disease distribution
        supabase.from('scans').select('predicted_class'),
        // Monthly trend (last 6 months)
        supabase.from('scans').select('created_at, confidence').gte('created_at',
          new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()
        ),
      ])

      // KPIs
      setKpi({
        totalScans:       totalRes.count       ?? 0,
        pendingReviews:   pendingRes.count      ?? 0,
        highUncertainty:  highUncRes.count      ?? 0,
        scansToday:       todayRes.count        ?? 0,
        totalScansLastWeek: lastWeekTotalRes.count  ?? 0,
        pendingLastWeek:    lastWeekPendingRes.count ?? 0,
      })

      // Recent scans
      if (recentRes.data) {
        setRecentScans(
          recentRes.data.map((s: any) => ({
            id: s.id,
            patient_code: s.patients?.patient_code ?? `SC-${s.id.slice(0, 6).toUpperCase()}`,
            predicted_class: s.predicted_class,
            uncertainty_level: s.uncertainty_level,
            status: s.status,
            created_at: s.created_at,
          }))
        )
      }

      // Disease distribution
      if (allClassRes.data) {
        const counts: Record<string, number> = {}
        allClassRes.data.forEach((s: any) => {
          counts[s.predicted_class] = (counts[s.predicted_class] ?? 0) + 1
        })
        const total = allClassRes.data.length || 1
        const slices = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([name, count], i) => ({
            name: name.length > 16 ? name.slice(0, 14) + '…' : name,
            value: Math.round((count / total) * 100),
            color: CHART_COLORS[i % CHART_COLORS.length],
          }))
        setDiseaseDistribution(slices)
      }

      // Monthly scan volume + avg confidence
      if (monthlyRes.data) {
        const byMonth: Record<string, { scans: number; confSum: number }> = {}
        monthlyRes.data.forEach((s: any) => {
          const m = new Date(s.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
          if (!byMonth[m]) byMonth[m] = { scans: 0, confSum: 0 }
          byMonth[m].scans++
          byMonth[m].confSum += (s.confidence ?? 0)
        })
        const points: MonthlyPoint[] = Object.entries(byMonth)
          .slice(-6)
          .map(([month, d]) => ({
            month,
            scans: d.scans,
            avg_confidence: d.scans > 0 ? Math.round((d.confSum / d.scans) * 100) : 0,
          }))
        setMonthlyTrend(points)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── KPI card helper ──────────────────────────────────────────────────────────
  function KpiCard({
    label, value, prev, icon: Icon, accent, invertTrend, suffix = '', i
  }: {
    label: string; value: number; prev: number
    icon: React.ElementType; accent: string
    invertTrend?: boolean; suffix?: string; i: number
  }) {
    const diff = value - prev
    const up = invertTrend ? diff <= 0 : diff >= 0
    const pct = prev > 0 ? Math.abs(Math.round((diff / prev) * 100)) : 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.07 }}
      >
        <Card className="relative overflow-hidden hover:shadow-md transition-all">
          <div className={cn('absolute left-0 inset-y-0 w-1 rounded-l-xl', accent)} />
          <CardContent className="p-5 pl-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                {loading
                  ? <Skeleton className="h-8 w-16 mt-1" />
                  : <p className="text-3xl font-bold tabular-nums text-foreground mt-1">{value.toLocaleString()}{suffix}</p>
                }
              </div>
              <div className={cn('p-2 rounded-lg', accent.replace('bg-', 'bg-') + '/10')}>
                <Icon className={cn('size-5', accent.replace('bg-', 'text-'))} />
              </div>
            </div>
            {!loading && (
              <div className="flex items-center gap-1 mt-2">
                {up
                  ? <TrendingUp className="size-3 text-emerald-600" />
                  : <TrendingDown className="size-3 text-destructive" />
                }
                <span className={cn('text-xs font-medium tabular-nums', up ? 'text-emerald-600' : 'text-destructive')}>
                  {diff >= 0 ? '+' : ''}{diff} ({pct}%)
                </span>
                <span className="text-xs text-muted-foreground">vs prev week</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5 w-full">

        {/* Page header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Clinical Overview</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Real-time retinal scan analytics</p>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-destructive font-medium">{error}</span>
            )}
            <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1.5">
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Scans"      value={kpi?.totalScans ?? 0}      prev={kpi?.totalScansLastWeek ?? 0}  icon={ScanLine}     accent="bg-primary"       i={0} />
          <KpiCard label="Pending Reviews"  value={kpi?.pendingReviews ?? 0}  prev={kpi?.pendingLastWeek ?? 0}     icon={Clock}        accent="bg-amber-500"     i={1} invertTrend />
          <KpiCard label="High Uncertainty" value={kpi?.highUncertainty ?? 0} prev={0}                             icon={AlertCircle}  accent="bg-destructive"   i={2} invertTrend />
          <KpiCard label="Scans Today"      value={kpi?.scansToday ?? 0}      prev={0}                             icon={Users}        accent="bg-blue-500"      i={3} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Recent Scans */}
          <motion.div
            className="xl:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Scans</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/scans')} className="text-primary text-xs">
                  View all <ArrowRight className="size-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Patient', 'AI Prediction', 'Uncertainty', 'Status', 'Time'].map(h => (
                          <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? <TableSkeleton />
                        : recentScans.length === 0
                        ? <EmptyScans />
                        : recentScans.map((scan, i) => {
                            const statusCfg = STATUS_CONFIG[scan.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
                            return (
                              <motion.tr
                                key={scan.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/scans/${scan.id}`)}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                      <ScanLine className="size-3.5 text-primary" />
                                    </div>
                                    <span className="font-semibold tabular-nums">{scan.patient_code}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-foreground">{scan.predicted_class}</td>
                                <td className="py-3 px-4"><UncertaintyBadge level={scan.uncertainty_level} size="sm" /></td>
                                <td className="py-3 px-4">
                                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', statusCfg.className)}>
                                    {statusCfg.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-xs tabular-nums">
                                  {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                                </td>
                              </motion.tr>
                            )
                          })
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Disease Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Disease Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                  </div>
                ) : diseaseDistribution.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                    <Brain className="size-8" />
                    <p className="text-xs">No data yet</p>
                  </div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={diseaseDistribution} cx="50%" cy="50%"
                            innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value">
                            {diseaseDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => [`${Number(v)}%`, '']} contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {diseaseDistribution.slice(0, 5).map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-muted-foreground truncate max-w-[120px]">{d.name}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Monthly trend charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Scan Volume */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Monthly Scan Volume</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Total scans submitted per month</p>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48 w-full rounded-lg" /> : monthlyTrend.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground/40 text-sm">
                    No data yet — scans will appear here automatically
                  </div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="scans" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Scans" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Avg Confidence Trend */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Average Model Confidence</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Mean ClaraVision-XAI confidence per month (%)</p>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48 w-full rounded-lg" /> : monthlyTrend.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground/40 text-sm">
                    No data yet — confidence trends will appear here automatically
                  </div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                          domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v) => [`${Number(v)}%`, '']} contentStyle={TOOLTIP_STYLE} />
                        <Line dataKey="avg_confidence" stroke="var(--chart-1)" strokeWidth={2}
                          dot={{ r: 4, fill: 'var(--chart-1)' }} name="Avg Confidence" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {[
            { icon: ScanLine,      label: 'Analyze Scan',    sub: 'Upload & analyse retinal image',  accent: 'primary',     path: '/analyze' },
            { icon: AlertTriangle, label: 'Review Queue',    sub: `${kpi?.highUncertainty ?? 0} high-uncertainty cases`, accent: 'destructive', path: '/review-queue' },
            { icon: CheckCircle2,  label: 'Generate Report', sub: 'Create signed diagnostic report', accent: 'blue-500',    path: '/reports' },
          ].map(({ icon: Icon, label, sub, accent, path }) => (
            <Card key={label}
              className={`cursor-pointer hover:shadow-md transition-all hover:border-${accent}/30 group`}
              onClick={() => navigate(path)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`flex items-center justify-center size-10 rounded-xl bg-${accent}/10 group-hover:bg-${accent}/20 transition-colors`}
                >
                  <Icon className={`size-5 text-${accent}`} />
                </motion.div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

      </div>
    </DashboardLayout>
  )
}
