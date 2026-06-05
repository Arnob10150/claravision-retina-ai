import { useState, useEffect } from 'react'
import { User, Bell, Volume2, VolumeX, Shield, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useUIStore, useAuthStore } from '@/store/useUIStore'
import { supabase } from '@/lib/supabase'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'optometrist', label: 'Optometrist' },
  { value: 'resident', label: 'Resident' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'admin', label: 'Administrator' },
]

export function Settings() {
  const { soundEnabled, volume, setSoundEnabled, setVolume } = useUIStore()
  const { profile, setProfile } = useAuthStore()
  const { play } = useSound()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [institution, setInstitution] = useState(profile?.institution ?? '')
  const [role, setRole] = useState(profile?.role ?? 'ophthalmologist')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [referralAlerts, setReferralAlerts] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setEmail(session.user.email ?? '')
    })
  }, [])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setInstitution(profile.institution ?? '')
      setRole(profile.role ?? 'ophthalmologist')
    }
  }, [profile])

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('Not signed in'); return }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, institution, role, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)

      if (error) throw error

      setProfile({ full_name: fullName, institution, role, avatar_url: profile?.avatar_url ?? '' })
      play('analysisComplete')
      setSaved(true)
      toast.success('Profile saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      play('error')
      toast.error('Failed to save', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-5">

        {/* Profile */}
        <Card className="fade-slide-up stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Your personal information and role</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg shrink-0">
                {fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="font-semibold">{fullName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                <Badge variant="outline" className="mt-1 text-xs capitalize">{role.replace('_', ' ')}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" value={email} disabled className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="institution" className="text-sm font-medium">Institution</Label>
                <Input id="institution" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Hospital / clinic name" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sound */}
        <Card className="fade-slide-up stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Volume2 className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Sound</CardTitle>
                <CardDescription>UI feedback audio preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Enable sounds</p>
                <p className="text-xs text-muted-foreground">Play tones for analysis complete, referral alerts, etc.</p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={v => {
                  setSoundEnabled(v)
                  if (v) setTimeout(() => play('loginSuccess'), 50)
                }}
              />
            </div>

            <div className={cn('space-y-3 transition-opacity', !soundEnabled && 'opacity-40 pointer-events-none')}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Volume</p>
                <div className="flex items-center gap-2">
                  {volume === 0 ? <VolumeX className="size-4 text-muted-foreground" /> : <Volume2 className="size-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground tabular-nums w-8">{Math.round(volume * 100)}%</span>
                </div>
              </div>
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setVolume(v)}
                onValueCommit={() => play('analysisComplete')}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Silent</span>
                <span>Full volume</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!soundEnabled}
                onClick={() => play('analysisComplete')}
              >
                Test sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!soundEnabled}
                onClick={() => play('referralAlert')}
              >
                Test referral alert
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="fade-slide-up stagger-3">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Alert and notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Review reminders</p>
                <p className="text-xs text-muted-foreground">Notify when pending reviews are aging</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Referral alerts</p>
                <p className="text-xs text-muted-foreground">Immediate alert for high-uncertainty referral flags</p>
              </div>
              <Switch checked={referralAlerts} onCheckedChange={setReferralAlerts} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="fade-slide-up stagger-4">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Account security settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Change password</Button>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-28 gap-2">
            {saved ? (
              <><Check className="size-4" />Saved</>
            ) : saving ? (
              <><Save className="size-4 animate-pulse" />Saving…</>
            ) : (
              <><Save className="size-4" />Save changes</>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
