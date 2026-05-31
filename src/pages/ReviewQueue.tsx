import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TriangleAlert as AlertTriangle, CircleAlert as AlertCircle, Clock, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface QueueItem {
  id: string; patient_code: string; predicted_class: string
  confidence: number; uncertainty_score: number
  uncertainty_level: 'low' | 'medium' | 'high'
  referral_flag: boolean; status: string; created_at: string
}

export function ReviewQueue() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')  // all | high | medium

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true)
    try {
      let q = supabase
        .from('scans')
        .select('id,predicted_class,confidence,uncertainty_score,uncertainty_level,referral_flag,status,created_at,patients(patient_code)')
        .in('status', ['pending'])
        .order('uncertainty_score', { ascending: false })
        .limit(100)
      if (filter === 'high') q = q.eq('uncertainty_level', 'high')
      else if (filter === 'medium') q = q.eq('uncertainty_level', 'medium')
      else q = q.in('uncertainty_level', ['high', 'medium'])

      const { data, error } = await q
      if (error) throw error
      setItems((data ?? []).map((s: any) => ({
        id: s.id,
        patient_code: s.patients?.patient_code ?? `SC-${s.id.slice(0, 6).toUpperCase()}`,
        predicted_class: s.predicted_class, confidence: s.confidence,
        uncertainty_score: s.uncertainty_score ?? 0, uncertainty_level: s.uncertainty_level,
        referral_flag: s.referral_flag, status: s.status, created_at: s.created_at,
      })))
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadData() }, [filter])

  const highCount = items.filter(i => i.uncertainty_level === 'high').length
  const medCount  = items.filter(i => i.uncertainty_level === 'medium').length
  const referrals = items.filter(i => i.referral_flag).length

  return (
    <DashboardLayout title="Review Queue">
      <div className="max-w-4xl space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'High Uncertainty', value: highCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Medium Uncertainty', value: medCount,  icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-500/10' },
            { label: 'Referrals Flagged', value: referrals,  icon: Clock,        color: 'text-blue-600',    bg: 'bg-blue-500/10'  },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('flex items-center justify-center size-10 rounded-xl', k.bg)}>
                    <k.icon className={cn('size-5', k.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                    {loading ? <Skeleton className="h-6 w-8 mt-1" /> : (
                      <p className={cn('text-2xl font-bold tabular-nums', k.color)}>{k.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filter + refresh */}
        <div className="flex items-center justify-between gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">High &amp; Medium uncertainty</SelectItem>
              <SelectItem value="high">High uncertainty only</SelectItem>
              <SelectItem value="medium">Medium uncertainty only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{loading ? '–' : `${items.length} case${items.length !== 1 ? 's' : ''}`}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1.5 text-muted-foreground h-8">
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Queue list */}
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))
          ) : items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-500/10 mb-4">
                <CheckCircle className="size-7 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Queue is clear</h3>
              <p className="text-sm text-muted-foreground">No pending high or medium uncertainty scans. All caught up.</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {items.map((item, i) => {
                const isHigh = item.uncertainty_level === 'high'
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -1 }}>
                    <Card className={cn(
                      'cursor-pointer hover:shadow-md transition-all group border-l-4',
                      isHigh ? 'border-l-destructive hover:border-destructive/80' : 'border-l-amber-500 hover:border-amber-400'
                    )} onClick={() => navigate(`/scans/${item.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-xs font-bold uppercase tracking-wide',
                                isHigh ? 'text-destructive' : 'text-amber-600')}>
                                {isHigh ? '⚠ HIGH' : '△ MEDIUM'}
                              </span>
                              <span className="font-bold text-foreground tabular-nums">{item.patient_code}</span>
                              <span className="text-sm text-foreground">{item.predicted_class}</span>
                              {item.referral_flag && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">REFERRAL</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="tabular-nums">Confidence: <b className="text-foreground">{(item.confidence * 100).toFixed(1)}%</b></span>
                              <span className="tabular-nums">Uncertainty: <b className={isHigh ? 'text-destructive' : 'text-amber-600'}>{(item.uncertainty_score * 100).toFixed(0)}%</b></span>
                              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                            </div>

                            {/* Uncertainty progress bar */}
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className={cn('h-full rounded-full', isHigh ? 'bg-destructive' : 'bg-amber-500')}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.uncertainty_score * 100}%` }}
                                transition={{ delay: 0.2 + i * 0.04, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <UncertaintyBadge level={item.uncertainty_level} size="sm" />
                            <Button variant="ghost" size="sm"
                              className="text-primary h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              Review <ChevronRight className="size-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
