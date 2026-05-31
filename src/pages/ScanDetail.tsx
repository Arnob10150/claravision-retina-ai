import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Layers, Columns2, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2, Brain, GitBranch, Circle as HelpCircle, ClipboardList, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useUIStore'
import { useSound } from '@/hooks/useSound'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DEMO_SCAN = {
  id: 'b1b2c3d4-0001-0001-0001-000000000001',
  patient_code: 'PT-2024-001',
  predicted_class: 'Diabetic Retinopathy',
  confidence: 0.912,
  uncertainty_score: 0.085,
  uncertainty_level: 'low' as const,
  referral_flag: false,
  eye_side: 'right',
  created_at: '2 days ago',
  concepts: [
    { name: 'Microaneurysms', confidence: 0.94, description: 'Small balloon-like swellings in retinal capillaries', icon: '🔴' },
    { name: 'Hard Exudates', confidence: 0.87, description: 'Bright yellow lipid deposits from leaky blood vessels', icon: '🟡' },
    { name: 'Retinal Hemorrhages', confidence: 0.82, description: 'Dot and blot hemorrhages from ruptured microaneurysms', icon: '🔴' },
  ],
  reasons: [
    'Multiple microaneurysms detected in the temporal and nasal quadrants.',
    'Hard exudate clustering near the fovea raises concern for macular edema.',
    'Dot-and-blot hemorrhage density consistent with moderate non-proliferative DR.',
  ],
  differential: [
    { disease: 'Normal', probability: 0.035, reason: 'Structural abnormalities are clearly present across multiple quadrants.' },
    { disease: 'Hypertensive Retinopathy', probability: 0.021, reason: 'AV nicking is absent; hemorrhage pattern differs from hypertensive changes.' },
  ],
  probabilities: {
    'Diabetic Retinopathy': 0.9120,
    'Normal': 0.0350,
    'Hypertensive Retinopathy': 0.0210,
    'Glaucoma': 0.0120,
    'Media Hazy': 0.0080,
    'Myopic Retinopathy': 0.0050,
    'Optic Disc Disorder': 0.0040,
    'Cataract': 0.0020,
    'Retinal Vein Occlusion': 0.0010,
  }
}

const DISEASES = [
  'Diabetic Retinopathy', 'Media Hazy', 'Myopic Retinopathy', 'Optic Disc Disorder',
  'Cataract', 'Glaucoma', 'Retinal Vein Occlusion', 'Hypertensive Retinopathy', 'Normal'
]

type ImageView = 'original' | 'heatmap' | 'sidebyside'

export function ScanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [imageView, setImageView] = useState<ImageView>('heatmap')
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.55)
  const [zoom, setZoom] = useState(1)
  const [agreement, setAgreement] = useState<'agree' | 'disagree' | null>(null)
  const [finalDiagnosis, setFinalDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [signingOff, setSigningOff] = useState(false)
  const [signedOff, setSignedOff] = useState(false)
  const { user, profile } = useAuthStore()
  const { play } = useSound()

  const scan = DEMO_SCAN
  const isOphthalmologist = profile?.role === 'ophthalmologist'

  async function handleSignOff() {
    if (!agreement || !user) return
    setSigningOff(true)

    try {
      const { error } = await supabase.from('reviews').insert({
        scan_id: id || scan.id,
        reviewer_id: user.id,
        agreement,
        final_diagnosis: finalDiagnosis || scan.predicted_class,
        notes,
      })
      if (error) throw error

      play('analysisComplete')
      setSignedOff(true)
      toast.success('Scan signed off', { description: `Final diagnosis: ${finalDiagnosis || scan.predicted_class}` })
    } catch {
      play('error')
      toast.error('Failed to sign off scan')
    } finally {
      setSigningOff(false)
    }
  }

  return (
    <DashboardLayout title="Scan Detail">
      <div className="max-w-7xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">{scan.patient_code}</h2>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground capitalize">{scan.eye_side} eye</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{scan.created_at}</span>
          </div>
          <UncertaintyBadge level={scan.uncertainty_level} size="sm" className="ml-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Image panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold">Retinal Image</CardTitle>
                  <div className="flex border border-border rounded-lg overflow-hidden text-xs">
                    {(['original', 'heatmap', 'sidebyside'] as ImageView[]).map(view => (
                      <button
                        key={view}
                        onClick={() => setImageView(view)}
                        className={cn(
                          'px-2.5 py-1.5 flex items-center gap-1 transition-colors',
                          imageView === view ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {view === 'original' && <Eye className="size-3" />}
                        {view === 'heatmap' && <Layers className="size-3" />}
                        {view === 'sidebyside' && <Columns2 className="size-3" />}
                        <span className="hidden sm:inline capitalize">{view === 'sidebyside' ? 'Side-by-side' : view}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="relative rounded-lg overflow-hidden bg-muted aspect-square"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
                >
                  {/* Placeholder retinal image pattern */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative size-64">
                      <div className="absolute inset-0 rounded-full bg-[#1a0a00] border-4 border-[#2a1200]" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-[#e8a050] opacity-90" />
                      {/* Vessels */}
                      <svg className="absolute inset-0 size-full" viewBox="0 0 256 256">
                        <path d="M 128 128 Q 80 100 40 80" stroke="#c05020" strokeWidth="2" fill="none" opacity="0.6" />
                        <path d="M 128 128 Q 160 90 200 60" stroke="#c05020" strokeWidth="1.5" fill="none" opacity="0.5" />
                        <path d="M 128 128 Q 100 160 70 200" stroke="#c05020" strokeWidth="2" fill="none" opacity="0.6" />
                        <path d="M 128 128 Q 170 155 210 185" stroke="#c05020" strokeWidth="1.5" fill="none" opacity="0.5" />
                        <circle cx="80" cy="105" r="3" fill="#8b0000" opacity="0.8" />
                        <circle cx="100" cy="85" r="2" fill="#8b0000" opacity="0.7" />
                        <circle cx="155" cy="110" r="3" fill="#8b0000" opacity="0.8" />
                      </svg>
                    </div>
                  </div>
                  {imageView === 'heatmap' && (
                    <div
                      className="absolute inset-0 heatmap-pulse pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse 55% 45% at 45% 48%, rgba(239,68,68,${heatmapOpacity}), transparent 65%), radial-gradient(ellipse 25% 20% at 68% 38%, rgba(239,68,68,${heatmapOpacity * 0.7}), transparent 60%)`,
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  {imageView === 'heatmap' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Heatmap opacity</span>
                        <span className="tabular-nums">{Math.round(heatmapOpacity * 100)}%</span>
                      </div>
                      <Slider
                        min={0.1} max={0.9} step={0.05}
                        value={[heatmapOpacity]}
                        onValueChange={([v]) => setHeatmapOpacity(v)}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Zoom</span>
                      <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
                    </div>
                    <Slider
                      min={0.5} max={2.5} step={0.1}
                      value={[zoom]}
                      onValueChange={([v]) => setZoom(v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Reasoning panel */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="diagnosis">
                <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 flex">
                  {[
                    { value: 'diagnosis', label: 'Diagnosis', icon: Brain },
                    { value: 'evidence', label: 'Evidence', icon: CheckCircle2 },
                    { value: 'differential', label: 'Differential', icon: GitBranch },
                    { value: 'uncertainty', label: 'Uncertainty', icon: HelpCircle },
                    { value: 'review', label: 'Review', icon: ClipboardList },
                  ].map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 text-xs"
                    >
                      <tab.icon className="size-3" />
                      <span className="ml-1 hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="diagnosis" className="p-4 space-y-3 mt-0">
                  <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div>
                      <p className="text-xs text-muted-foreground">Primary Prediction</p>
                      <p className="text-lg font-bold text-foreground">{scan.predicted_class}</p>
                      <p className="text-sm tabular-nums font-semibold text-primary mt-0.5">{(scan.confidence * 100).toFixed(1)}% confidence</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(scan.probabilities).sort(([,a],[,b]) => b - a).map(([d, p]) => (
                      <div key={d} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className={cn('font-medium', d === scan.predicted_class ? 'text-primary' : '')}>{d}</span>
                          <span className="tabular-nums">{(p * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', d === scan.predicted_class ? 'bg-primary' : 'bg-muted-foreground/30')} style={{ width: `${(p * 100).toFixed(1)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="p-4 space-y-3 mt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {scan.concepts.map(c => (
                      <Badge key={c.name} variant="secondary" className="text-xs rounded-full">
                        {c.name} <span className="ml-1 tabular-nums opacity-70">{(c.confidence * 100).toFixed(0)}%</span>
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    {scan.reasons.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <ChevronRight className="size-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                  {scan.concepts.map(c => (
                    <div key={c.name} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
                      <span>{c.icon}</span>
                      <div>
                        <p className="text-xs font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="differential" className="p-4 space-y-3 mt-0">
                  {scan.differential.map((d, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold">{d.disease}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{(d.probability * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Ruled out: </span>{d.reason}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="uncertainty" className="p-4 space-y-4 mt-0">
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold tabular-nums">{(scan.uncertainty_score * 100).toFixed(0)}%</p>
                    <UncertaintyBadge level={scan.uncertainty_level} size="lg" className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Low uncertainty — the model prediction is reliable. Standard clinical review recommended.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="review" className="p-4 space-y-4 mt-0">
                  {signedOff ? (
                    <div className="text-center py-6">
                      <div className="flex justify-center mb-3">
                        <div className="size-12 rounded-full bg-[#EAF3DE] flex items-center justify-center check-pop">
                          <CheckCircle2 className="size-6 text-[#3B6D11]" />
                        </div>
                      </div>
                      <p className="font-semibold text-foreground">Signed Off</p>
                      <p className="text-sm text-muted-foreground mt-1">Final diagnosis recorded</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Do you agree with the AI prediction?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAgreement('agree')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                              agreement === 'agree'
                                ? 'bg-[#EAF3DE] border-[#3B6D11] text-[#3B6D11]'
                                : 'border-border hover:border-[#3B6D11]/40 hover:bg-muted/40'
                            )}
                          >
                            <CheckCircle2 className="size-4" /> Agree
                          </button>
                          <button
                            onClick={() => setAgreement('disagree')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                              agreement === 'disagree'
                                ? 'bg-destructive/10 border-destructive text-destructive'
                                : 'border-border hover:border-destructive/40 hover:bg-muted/40'
                            )}
                          >
                            <XCircle className="size-4" /> Disagree
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Final Diagnosis</label>
                        <Select value={finalDiagnosis} onValueChange={setFinalDiagnosis}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder={scan.predicted_class} />
                          </SelectTrigger>
                          <SelectContent>
                            {DISEASES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Clinical Notes</label>
                        <Textarea
                          placeholder="Add clinical observations, context, or reasoning…"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="min-h-20 text-sm resize-none"
                        />
                      </div>

                      {!isOphthalmologist && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                          Sign-off requires Ophthalmologist role. Your notes will be saved for senior review.
                        </p>
                      )}

                      <Button
                        className="w-full"
                        disabled={!agreement || signingOff || !isOphthalmologist}
                        onClick={handleSignOff}
                      >
                        {signingOff ? <><Loader2 className="size-4 animate-spin" /> Signing off…</> : 'Sign Off'}
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
