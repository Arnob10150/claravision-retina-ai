import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users, ScanLine, FileText, Trash2, Edit2, Plus, Search,
  RefreshCw, Shield, AlertTriangle, Save,
  Database, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useUIStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'optometrist',     label: 'Optometrist' },
  { value: 'resident',        label: 'Ophthalmology Resident' },
  { value: 'researcher',      label: 'Retinal Researcher' },
  { value: 'admin',           label: 'Administrator' },
]

// ─── Confirm delete dialog ──────────────────────────────────────────────────
function ConfirmDelete({ open, label, onConfirm, onCancel }: {
  open: boolean; label: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The record will be permanently removed from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-white">
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Users / Profiles Tab ───────────────────────────────────────────────────
function UsersTab() {
  const [rows, setRows]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name:   editing.full_name,
      role:        editing.role,
      institution: editing.institution,
    }).eq('id', editing.id)
    setSaving(false)
    if (error) { toast.error('Update failed: ' + error.message); return }
    toast.success('Profile updated')
    setEditing(null)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('profiles').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Profile deleted')
    setDeleteTarget(null)
    load()
  }

  const filtered = rows.filter(r =>
    (r.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.role ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.institution ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, role or institution…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="size-3.5" />Refresh
        </Button>
        <span className="text-sm text-muted-foreground">{filtered.length} users</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Name', 'Role', 'Institution', 'ID', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(5)].map((_, j) => <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>)}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users found</td></tr>
                ) : filtered.map(row => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold">{row.full_name ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs capitalize">{row.role ?? '—'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{row.institution ?? '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{row.id.slice(0, 8)}…</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-primary"
                          onClick={() => setEditing({ ...row })}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive"
                          onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={editing.full_name ?? ''} onChange={e => setEditing((p: any) => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editing.role ?? ''} onValueChange={v => setEditing((p: any) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Institution</Label>
                <Input value={editing.institution ?? ''} onChange={e => setEditing((p: any) => ({ ...p, institution: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : <><Save className="size-4 mr-1.5" />Save changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleteTarget} label={deleteTarget?.full_name ?? 'user'}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

// ─── Patients Tab ───────────────────────────────────────────────────────────
function PatientsTab() {
  const [rows, setRows]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [saving, setSaving]   = useState(false)

  const BLANK = { patient_code: '', age: '', gender: '', institution: '', notes: '' }
  const [form, setForm] = useState(BLANK)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setSaving(true)
    const { error } = await supabase.from('patients').insert({
      patient_code: form.patient_code,
      age:          form.age ? parseInt(form.age) : null,
      gender:       form.gender || null,
      institution:  form.institution || null,
      notes:        form.notes || null,
    })
    setSaving(false)
    if (error) { toast.error('Create failed: ' + error.message); return }
    toast.success('Patient created')
    setCreating(false); setForm(BLANK); load()
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('patients').update({
      patient_code: editing.patient_code,
      age:          editing.age ? parseInt(editing.age) : null,
      gender:       editing.gender || null,
      institution:  editing.institution || null,
      notes:        editing.notes || null,
    }).eq('id', editing.id)
    setSaving(false)
    if (error) { toast.error('Update failed: ' + error.message); return }
    toast.success('Patient updated')
    setEditing(null); load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('patients').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Patient deleted')
    setDeleteTarget(null); load()
  }

  const filtered = rows.filter(r =>
    (r.patient_code ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.institution  ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const PatientForm = ({ data, onChange }: { data: any; onChange: (k: string, v: string) => void }) => (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Patient Code *</Label>
        <Input value={data.patient_code ?? ''} onChange={e => onChange('patient_code', e.target.value)} placeholder="PT-2024-001" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Age</Label>
          <Input type="number" value={data.age ?? ''} onChange={e => onChange('age', e.target.value)} placeholder="e.g. 65" />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={data.gender ?? ''} onValueChange={v => onChange('gender', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Institution</Label>
        <Input value={data.institution ?? ''} onChange={e => onChange('institution', e.target.value)} placeholder="City Eye Institute" />
      </div>
      <div className="space-y-1.5">
        <Label>Clinical Notes</Label>
        <Input value={data.notes ?? ''} onChange={e => onChange('notes', e.target.value)} placeholder="Optional notes…" />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search patient code or institution…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" onClick={() => { setForm(BLANK); setCreating(true) }} className="gap-1.5">
          <Plus className="size-3.5" />New Patient
        </Button>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="size-3.5" />Refresh
        </Button>
        <span className="text-sm text-muted-foreground">{filtered.length} patients</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Code', 'Age', 'Gender', 'Institution', 'Notes', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(6)].map((_, j) => <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>)}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No patients found</td></tr>
                ) : filtered.map(row => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold tabular-nums">{row.patient_code}</td>
                    <td className="py-3 px-4 tabular-nums">{row.age ?? '—'}</td>
                    <td className="py-3 px-4 capitalize">{row.gender ?? '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.institution ?? '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[180px] truncate">{row.notes ?? '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-primary"
                          onClick={() => setEditing({ ...row, age: row.age?.toString() ?? '' })}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive"
                          onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={open => !open && setCreating(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Patient Record</DialogTitle>
            <DialogDescription>Add a new patient to the system</DialogDescription>
          </DialogHeader>
          <PatientForm data={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.patient_code}>
              {saving ? 'Creating…' : <><Plus className="size-4 mr-1.5" />Create Patient</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>{editing?.patient_code}</DialogDescription>
          </DialogHeader>
          {editing && <PatientForm data={editing} onChange={(k, v) => setEditing((p: any) => ({ ...p, [k]: v }))} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : <><Save className="size-4 mr-1.5" />Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleteTarget} label={deleteTarget?.patient_code ?? 'patient'}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

// ─── Scans Tab ──────────────────────────────────────────────────────────────
function ScansTab() {
  const [rows, setRows]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [updatingId, setUpdatingId]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('scans')
      .select('id, predicted_class, confidence, uncertainty_level, status, created_at, patients(patient_code)')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    const { error } = await supabase.from('scans').update({ status }).eq('id', id)
    setUpdatingId(null)
    if (error) { toast.error('Update failed'); return }
    toast.success(`Status → ${status}`)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('scans').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Scan deleted')
    setDeleteTarget(null); load()
  }

  const STATUS_COLORS: Record<string, string> = {
    pending:    'bg-amber-100 text-amber-700',
    reviewed:   'bg-blue-100 text-blue-700',
    signed_off: 'bg-[#EAF3DE] text-[#3B6D11]',
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchS = (r.patients?.patient_code ?? '').toLowerCase().includes(q) ||
      (r.predicted_class ?? '').toLowerCase().includes(q)
    const matchF = filterStatus === 'all' || r.status === filterStatus
    return matchS && matchF
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search patient or diagnosis…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="signed_off">Signed Off</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="size-3.5" />Refresh
        </Button>
        <span className="text-sm text-muted-foreground">{filtered.length} scans</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Patient', 'Prediction', 'Confidence', 'Uncertainty', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((_, j) => <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>)}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No scans found</td></tr>
                ) : filtered.map(row => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {row.patients?.patient_code ?? `SC-${row.id.slice(0, 6).toUpperCase()}`}
                    </td>
                    <td className="py-3 px-4">{row.predicted_class}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold">{(row.confidence * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 capitalize">{row.uncertainty_level}</td>
                    <td className="py-3 px-4">
                      <Select
                        value={row.status}
                        onValueChange={v => updateStatus(row.id, v)}
                        disabled={updatingId === row.id}
                      >
                        <SelectTrigger className={cn('h-7 w-32 text-xs font-semibold border-0', STATUS_COLORS[row.status] ?? '')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="signed_off">Signed Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(row.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive"
                        onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDelete open={!!deleteTarget} label="scan"
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

// ─── DB Stats summary cards ──────────────────────────────────────────────────
function DBStats() {
  const [stats, setStats] = useState({ users: 0, patients: 0, scans: 0, reviews: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('scans').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
    ]).then(([u, p, s, r]) => {
      setStats({ users: u.count ?? 0, patients: p.count ?? 0, scans: s.count ?? 0, reviews: r.count ?? 0 })
      setLoading(false)
    })
  }, [])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Users',    value: stats.users,    icon: Users,    color: 'text-primary',     bg: 'bg-primary/10' },
        { label: 'Patients', value: stats.patients, icon: Eye,      color: 'text-blue-600',    bg: 'bg-blue-500/10' },
        { label: 'Scans',    value: stats.scans,    icon: ScanLine, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        { label: 'Reviews',  value: stats.reviews,  icon: FileText, color: 'text-amber-600',   bg: 'bg-amber-500/10' },
      ].map(({ label, value, icon: Icon, color, bg }, i) => (
        <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('size-10 rounded-xl flex items-center justify-center', bg)}>
                <Icon className={cn('size-5', color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                {loading
                  ? <Skeleton className="h-7 w-12 mt-1" />
                  : <p className={cn('text-2xl font-black tabular-nums mt-0.5', color)}>{value.toLocaleString()}</p>
                }
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Main Admin page ─────────────────────────────────────────────────────────
export function Admin() {
  const { profile } = useAuthStore()

  // Guard: only admin role
  if (profile && profile.role !== 'admin') {
    return (
      <DashboardLayout title="Admin Panel">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Shield className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            The Admin Panel is only accessible to users with the Administrator role.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Admin Panel">
      <div className="w-full space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Database className="size-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Database Administration</h2>
            <p className="text-sm text-muted-foreground">Full CRUD access to all ClaraVision records</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/5">
              <AlertTriangle className="size-3 mr-1.5" />
              Admin Only
            </Badge>
          </div>
        </motion.div>

        {/* DB stats */}
        <DBStats />

        {/* CRUD tabs */}
        <Tabs defaultValue="users">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="size-3.5" />Users
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-1.5">
              <Eye className="size-3.5" />Patients
            </TabsTrigger>
            <TabsTrigger value="scans" className="gap-1.5">
              <ScanLine className="size-3.5" />Scans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users"    className="mt-5"><UsersTab /></TabsContent>
          <TabsContent value="patients" className="mt-5"><PatientsTab /></TabsContent>
          <TabsContent value="scans"    className="mt-5"><ScansTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
