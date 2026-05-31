import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { calculateDRRisk, calculateGlaucomaRisk, type RiskInput } from '@/lib/clinical'
import { cn } from '@/lib/utils'

interface NumberField { key: keyof RiskInput; label: string; placeholder: string; unit: string; min: number; max: number; hint: string }

const DR_FIELDS: NumberField[] = [
  { key: 'age',               label: 'Age',                       placeholder: '65',   unit: 'years', min: 18,  max: 120, hint: 'Patient age in years' },
  { key: 'hba1c',             label: 'HbA1c',                     placeholder: '7.2',  unit: '%',     min: 4,   max: 16,  hint: 'Most recent HbA1c (target < 7.0%)' },
  { key: 'diabetesDuration',  label: 'Diabetes duration',         placeholder: '10',   unit: 'years', min: 0,   max: 80,  hint: 'Years since diabetes diagnosis' },
  { key: 'systolicBP',        label: 'Systolic blood pressure',   placeholder: '130',  unit: 'mmHg',  min: 80,  max: 250, hint: 'Most recent systolic BP reading' },
]

const GLAUCOMA_FIELDS: NumberField[] = [
  { key: 'age',   label: 'Age',                       placeholder: '55',  unit: 'years', min: 18, max: 120, hint: 'Patient age' },
  { key: 'iop',   label: 'Intraocular pressure (IOP)',placeholder: '18',  unit: 'mmHg',  min: 5,  max: 60,  hint: 'GAT measurement (normal < 21 mmHg)' },
  { key: 'cdr',   label: 'Cup-to-disc ratio (C/D)',   placeholder: '0.5', unit: '',      min: 0,  max: 1,   hint: 'Vertical C/D ratio (normal < 0.65)' },
]

const RISK_STYLE = {
  High:     { bg: 'bg-destructive/8',   border: 'border-destructive/30', text: 'text-destructive',  bar: 'bg-destructive',  icon: AlertTriangle },
  Moderate: { bg: 'bg-amber-500/8',     border: 'border-amber-400/30',   text: 'text-amber-600',    bar: 'bg-amber-500',    icon: TrendingUp },
  Low:      { bg: 'bg-emerald-500/8',   border: 'border-emerald-400/30', text: 'text-emerald-600',  bar: 'bg-emerald-500',  icon: CheckCircle },
}

function RiskResult({ score, riskLevel, factors, title }: {
  score: number; riskLevel: 'Low' | 'Moderate' | 'High'; factors: string[]; title: string
}) {
  const S = RISK_STYLE[riskLevel]
  const Icon = S.icon
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className={cn('border-2', S.border)}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn('size-12 rounded-2xl flex items-center justify-center', S.bg)}>
              <Icon className={cn('size-6', S.text)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className={cn('text-2xl font-black', S.text)}>{riskLevel} Risk</p>
            </div>
            <div className="ml-auto text-right">
              <p className={cn('text-4xl font-black tabular-nums', S.text)}>{score}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', S.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {/* Risk factors */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">Risk Factors Identified</p>
            {factors.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-start gap-2"
              >
                <div className={cn('mt-1 size-1.5 rounded-full shrink-0', S.bar)} />
                <p className="text-sm text-muted-foreground leading-snug">{f}</p>
              </motion.div>
            ))}
            {factors.length === 0 && (
              <p className="text-sm text-muted-foreground">No significant risk factors identified with the provided data.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function RiskCalculator() {
  // DR state
  const [drInput, setDrInput] = useState<Partial<RiskInput>>({})
  const [drSmoker, setDrSmoker] = useState(false)
  const [drResult, setDrResult] = useState<ReturnType<typeof calculateDRRisk> | null>(null)

  // Glaucoma state
  const [gInput, setGInput]  = useState<Partial<RiskInput>>({})
  const [gFH, setGFH]        = useState(false)
  const [gResult, setGResult] = useState<ReturnType<typeof calculateGlaucomaRisk> | null>(null)

  function runDR() {
    setDrResult(calculateDRRisk({ ...drInput, smoker: drSmoker } as RiskInput))
  }
  function runGlaucoma() {
    setGResult(calculateGlaucomaRisk({ ...gInput, familyHistoryGlaucoma: gFH } as RiskInput))
  }

  function Field({ f, val, onChange }: { f: NumberField; val: number | undefined; onChange: (v: number) => void }) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-semibold text-foreground">{f.label}</label>
          {f.unit && <span className="text-xs text-muted-foreground">({f.unit})</span>}
        </div>
        <input
          type="number"
          min={f.min} max={f.max} step={f.key === 'cdr' ? 0.05 : 1}
          placeholder={f.placeholder}
          value={val ?? ''}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">{f.hint}</p>
      </div>
    )
  }

  return (
    <DashboardLayout title="Clinical Risk Calculator">
      <div className="w-full space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Clinical Risk Calculators</h2>
            <p className="text-sm text-muted-foreground">Evidence-based risk stratification tools for ophthalmology practice</p>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-600 bg-amber-50">
              <Info className="size-3 mr-1" /> Decision-support only — not a diagnostic tool
            </Badge>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Diabetic Retinopathy Risk ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingUp className="size-4 text-red-500" />
                  </div>
                  Diabetic Retinopathy Risk
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Based on UKPDS, DCCT/EDIC, and WESDR cohort data. Identifies modifiable risk factors for DR progression.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {DR_FIELDS.map(f => (
                    <Field key={f.key} f={f} val={(drInput as any)[f.key]}
                      onChange={v => setDrInput(p => ({ ...p, [f.key]: v }))} />
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={drSmoker} onChange={e => setDrSmoker(e.target.checked)}
                    className="rounded border-input" />
                  <span className="text-sm text-foreground">Current smoker</span>
                </label>
                <Button onClick={runDR} className="w-full gap-2">
                  <Calculator className="size-4" /> Calculate DR Risk
                </Button>
              </CardContent>
            </Card>
            <AnimatePresence>
              {drResult && (
                <div className="mt-4">
                  <RiskResult {...drResult} title="Diabetic Retinopathy Risk Score" />
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Glaucoma Risk ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="size-4 text-blue-500" />
                  </div>
                  Glaucoma Risk Stratification
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Based on Ocular Hypertension Treatment Study (OHTS) and European Glaucoma Prevention Study (EGPS) parameters.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {GLAUCOMA_FIELDS.map(f => (
                    <Field key={f.key} f={f} val={(gInput as any)[f.key]}
                      onChange={v => setGInput(p => ({ ...p, [f.key]: v }))} />
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={gFH} onChange={e => setGFH(e.target.checked)}
                    className="rounded border-input" />
                  <span className="text-sm text-foreground">First-degree family history of glaucoma</span>
                </label>
                <Button onClick={runGlaucoma} className="w-full gap-2">
                  <Calculator className="size-4" /> Calculate Glaucoma Risk
                </Button>
              </CardContent>
            </Card>
            <AnimatePresence>
              {gResult && (
                <div className="mt-4">
                  <RiskResult {...gResult} title="Glaucoma Risk Score" />
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="border-amber-400/20 bg-amber-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Clinical Disclaimer:</strong> These calculators are decision-support tools based on published epidemiological data. They are not diagnostic instruments and do not replace clinical examination, investigation, or specialist judgement. Risk scores should be interpreted in the full clinical context of each individual patient. All management decisions must be made by a qualified clinician.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
