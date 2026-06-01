import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, TrendingUp, Activity, BarChart3, Users, RefreshCw, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { supabase, isSupabaseReady } from '@/lib/supabase'

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
  'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)',
]

const TOOLTIP_STYLE = {
  borderRadius: '8px', border: '1px solid var(--border)',
  background: 'var(--card)', fontSize: '12px', color: 'var(--foreground)',
}

function ChartSkeleton({ h = 'h-64' }: { h?: string }) {
  return <Skeleton className={`${h} w-full rounded-xl`} />
}

function EmptyChart({ label = 'No data yet' }: { label?: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
      <Brain className="size-8" />
      <p className="text-sm">{label}</p>
      <p className="text-xs">Data will appear here automatically once scans are analysed</p>
    </div>
  )
}

export function Analytics() {
  const [period, setPeriod] = useState('6m')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [kpis, setKpis] = useState({ total: 0, avgConf: 0, agreementPct: 0, referralRate: 0 })
  const [diseaseData, setDiseaseData] = useState<{ name: string; count: number; pct: number; color: string }[]>([])
  const [monthlyVolume, setMonthlyVolume] = useState<{ month: string; scans: number; reviewed: number; signed: number }[]>([])
  const [confidenceDist, setConfidenceDist] = useState<{ range: string; count: number }[]>([])
  const [genderData, setGenderData] = useState<{ name: string; value: number; color: string }[]>([])
  const [ageData, setAgeData] = useState<{ range: string; count: number }[]>([])
  const [agreementData, setAgreementData] = useState<{ name: string; value: number; color: string }[]>([])

  async function loadData(showRefresh = false) {
    if (!isSupabaseReady()) {
      setLoading(false)
      setRefreshing(false)
      return
    }
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    const months = period === '3m' ? 3 : period === '6m' ? 6 : period === '1y' ? 12 : 24
    const since = new Date()
    since.setMonth(since.getMonth() - months)
    const sinceISO = since.toISOString()

    try {
      const [scansRes, reviewsRes, patientsRes] = await Promise.all([
        supabase.from('scans')
          .select('id, predicted_class, confidence, uncertainty_level, referral_flag, status, created_at')
          .gte('created_at', sinceISO),
        supabase.from('reviews').select('agreement, created_at').gte('created_at', sinceISO),
        supabase.from('patients').select('age, gender').gte('created_at', sinceISO),
      ])

      const scans = scansRes.data ?? []
      const reviews = reviewsRes.data ?? []
      const patients = patientsRes.data ?? []

      // KPIs
      const avgConf = scans.length > 0
        ? Math.round((scans.reduce((s, r) => s + (r.confidence ?? 0), 0) / scans.length) * 100)
        : 0
      const agreePct = reviews.length > 0
        ? Math.round((reviews.filter(r => r.agreement === 'agree').length / reviews.length) * 100)
        : 0
      const referralPct = scans.length > 0
        ? Math.round((scans.filter(s => s.referral_flag).length / scans.length) * 100)
        : 0
      setKpis({ total: scans.length, avgConf, agreementPct: agreePct, referralRate: referralPct })

      // Disease distribution
      const diseaseCounts: Record<string, number> = {}
      scans.forEach(s => { diseaseCounts[s.predicted_class] = (diseaseCounts[s.predicted_class] ?? 0) + 1 })
      const totalScans = scans.length || 1
      setDiseaseData(
        Object.entries(diseaseCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([name, count], i) => ({
            name: name.length > 14 ? name.slice(0, 12) + '…' : name,
            count,
            pct: Math.round((count / totalScans) * 100),
            color: CHART_COLORS[i % CHART_COLORS.length],
          }))
      )

      // Monthly volume
      const byMonth: Record<string, { scans: number; reviewed: number; signed: number }> = {}
      scans.forEach(s => {
        const m = new Date(s.created_at).toLocaleString('default', { month: 'short' })
        if (!byMonth[m]) byMonth[m] = { scans: 0, reviewed: 0, signed: 0 }
        byMonth[m].scans++
        if (s.status === 'reviewed' || s.status === 'signed_off') byMonth[m].reviewed++
        if (s.status === 'signed_off') byMonth[m].signed++
      })
      setMonthlyVolume(Object.entries(byMonth).slice(-months).map(([month, d]) => ({ month, ...d })))

      // Confidence distribution
      const confBuckets = [
        { range: '50–60%', min: 0.50, max: 0.60 },
        { range: '60–70%', min: 0.60, max: 0.70 },
        { range: '70–80%', min: 0.70, max: 0.80 },
        { range: '80–90%', min: 0.80, max: 0.90 },
        { range: '90–100%', min: 0.90, max: 1.01 },
      ]
      setConfidenceDist(confBuckets.map(b => ({
        range: b.range,
        count: scans.filter(s => s.confidence >= b.min && s.confidence < b.max).length,
      })))

      // Gender split
      const genders: Record<string, number> = {}
      patients.forEach(p => { genders[p.gender ?? 'unknown'] = (genders[p.gender ?? 'unknown'] ?? 0) + 1 })
      setGenderData(Object.entries(genders).map(([name, value], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: CHART_COLORS[i],
      })))

      // Age distribution
      const ageBuckets = [
        { range: '20–29', min: 20, max: 30 },
        { range: '30–39', min: 30, max: 40 },
        { range: '40–49', min: 40, max: 50 },
        { range: '50–59', min: 50, max: 60 },
        { range: '60–69', min: 60, max: 70 },
        { range: '70–79', min: 70, max: 80 },
        { range: '80+',   min: 80, max: 200 },
      ]
      setAgeData(ageBuckets.map(b => ({
        range: b.range,
        count: patients.filter(p => (p.age ?? 0) >= b.min && (p.age ?? 0) < b.max).length,
      })))

      // AI agreement
      const agree = reviews.filter(r => r.agreement === 'agree').length
      const disagree = reviews.filter(r => r.agreement === 'disagree').length
      setAgreementData([
        { name: 'AI Confirmed', value: agree,    color: 'var(--chart-6)' },
        { name: 'AI Overridden', value: disagree, color: 'var(--chart-3)' },
      ])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [period])

  const kpiCards = [
    { label: 'Total Scans',     value: `${kpis.total.toLocaleString()}`,  icon: BarChart3,   color: 'text-primary' },
    { label: 'Avg. Confidence', value: `${kpis.avgConf}%`,               icon: TrendingUp,  color: 'text-blue-500' },
    { label: 'AI Agreement',    value: `${kpis.agreementPct}%`,           icon: Activity,    color: 'text-emerald-600' },
    { label: 'Referral Rate',   value: `${kpis.referralRate}%`,           icon: Users,       color: 'text-amber-600' },
  ]

  return (
    <DashboardLayout title="Analytics">
      <div className="max-w-7xl space-y-6">

        {/* Header controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Period:</span>
            <Select value={period} onValueChange={v => { setPeriod(v) }}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1.5 text-muted-foreground">
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{k.label}</p>
                    {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className={`text-2xl font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</p>}
                  </div>
                  <k.icon className={`size-6 ${k.color} opacity-30`} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="volume">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="disease">Disease</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
          </TabsList>

          {/* Volume tab */}
          <TabsContent value="volume" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Monthly Scan Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : monthlyVolume.length === 0 ? <EmptyChart /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyVolume}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="scans"    fill="var(--chart-1)" radius={[3,3,0,0]} name="Total" />
                          <Bar dataKey="reviewed" fill="var(--chart-2)" radius={[3,3,0,0]} name="Reviewed" />
                          <Bar dataKey="signed"   fill="var(--chart-6)" radius={[3,3,0,0]} name="Signed Off" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">AI–Clinician Agreement</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : agreementData.every(d => d.value === 0) ? <EmptyChart label="No reviews yet" /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={agreementData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                            {agreementData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Disease tab */}
          <TabsContent value="disease" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Pathology Class Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : diseaseData.length === 0 ? <EmptyChart /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diseaseData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" radius={[0,3,3,0]} name="Scans">
                            {diseaseData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Pathology Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : diseaseData.length === 0 ? <EmptyChart /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={diseaseData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="count">
                            {diseaseData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} contentStyle={TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Demographics tab */}
          <TabsContent value="demographics" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : ageData.every(d => d.count === 0) ? <EmptyChart label="No patient demographics yet" /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" fill="var(--chart-2)" radius={[4,4,0,0]} name="Patients" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Biological Sex Split</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : genderData.every(d => d.value === 0) ? <EmptyChart label="No patient demographics yet" /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={genderData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}>
                            {genderData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Confidence tab */}
          <TabsContent value="confidence" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Confidence Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : confidenceDist.every(d => d.count === 0) ? <EmptyChart /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={confidenceDist}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" fill="var(--chart-1)" radius={[4,4,0,0]} name="Scans" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Monthly Avg. Confidence Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <ChartSkeleton /> : monthlyVolume.length === 0 ? <EmptyChart /> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyVolume}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} domain={[0,100]} tickFormatter={v => `${v}%`} />
                          <Tooltip formatter={(v) => [`${Number(v)}%`, '']} contentStyle={TOOLTIP_STYLE} />
                          <Line dataKey="scans" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4 }} name="Scans" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
