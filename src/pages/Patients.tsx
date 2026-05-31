import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ScanLine, Calendar, RefreshCw, UserPlus, Building2, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface PatientRow {
  id: string
  patient_code: string
  age: number | null
  gender: string | null
  institution: string | null
  scan_count: number
  last_scan_at: string | null
  last_class: string | null
  last_uncertainty: 'low' | 'medium' | 'high' | null
}

export function Patients() {
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch patients with their latest scan via a join
      const { data, count, error } = await supabase
        .from('patients')
        .select(`
          id, patient_code, age, gender, institution,
          scans(id, predicted_class, uncertainty_level, created_at)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setTotal(count ?? 0)
      setPatients(
        (data ?? []).map((p: any) => {
          const scans = (p.scans ?? []).sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          const latest = scans[0]
          return {
            id: p.id,
            patient_code: p.patient_code,
            age: p.age,
            gender: p.gender,
            institution: p.institution,
            scan_count: scans.length,
            last_scan_at: latest?.created_at ?? null,
            last_class: latest?.predicted_class ?? null,
            last_uncertainty: latest?.uncertainty_level ?? null,
          }
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

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    return (
      p.patient_code.toLowerCase().includes(q) ||
      (p.institution ?? '').toLowerCase().includes(q) ||
      (p.last_class ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <DashboardLayout title="Patient Records">
      <div className="max-w-6xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search patient code, institution or diagnosis…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {loading ? '–' : `${filtered.length} of ${total} patients`}
            </span>
            <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}
              className="gap-1.5 text-muted-foreground">
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && patients.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-4">
              <UserPlus className="size-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No patient records yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Patient records are created automatically when you save a scan to a patient. Analyse a retinal image and save it to create the first record.
            </p>
            <Button onClick={() => navigate('/analyze')}>
              <ScanLine className="size-4 mr-2" /> Analyse First Scan
            </Button>
          </motion.div>
        )}

        {/* No search results */}
        {!loading && patients.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No patients match &ldquo;{search}&rdquo;</p>
          </div>
        )}

        {/* Patient cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md hover:border-primary/25 transition-all group h-full"
                    onClick={() => navigate(`/scans?patient=${p.id}`)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground tabular-nums group-hover:text-primary transition-colors">
                            {p.patient_code}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[
                              p.age ? `${p.age} yr` : null,
                              p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : null,
                            ].filter(Boolean).join(' · ') || 'Demographics not recorded'}
                          </p>
                        </div>
                        {p.last_uncertainty && (
                          <UncertaintyBadge level={p.last_uncertainty} size="sm" />
                        )}
                      </div>

                      {p.institution && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="size-3.5 shrink-0" />
                          <span className="truncate">{p.institution}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="size-3.5 shrink-0" />
                        <span>{p.scan_count} scan{p.scan_count !== 1 ? 's' : ''}</span>
                        {p.last_scan_at && (
                          <>
                            <span className="opacity-40">·</span>
                            <Calendar className="size-3 shrink-0" />
                            <span>{formatDistanceToNow(new Date(p.last_scan_at), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>

                      {p.last_class && (
                        <div className="pt-1 border-t border-border">
                          <p className="text-xs text-muted-foreground">Latest finding</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{p.last_class}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
