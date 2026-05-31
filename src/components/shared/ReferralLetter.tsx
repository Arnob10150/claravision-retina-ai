/**
 * ReferralLetter — generates a professional ophthalmology referral letter.
 * Opens as a dialog, fully editable, and prints via browser PDF.
 */
import { useState } from 'react'
import { Printer, Mail, ClipboardCopy, X, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReferralData, TreatmentPriority } from '@/lib/clinical'
import { urgencyToText } from '@/lib/clinical'

interface Props {
  open: boolean
  onClose: () => void
  data: ReferralData
}

const URGENCY_STYLE: Record<TreatmentPriority, { color: string; icon: typeof AlertTriangle; label: string }> = {
  urgent:  { color: 'text-destructive border-destructive/30 bg-destructive/5',  icon: AlertTriangle, label: 'URGENT' },
  soon:    { color: 'text-amber-600 border-amber-400/30 bg-amber-50',            icon: Clock,         label: 'SOON' },
  routine: { color: 'text-blue-600 border-blue-400/30 bg-blue-50',               icon: Clock,         label: 'ROUTINE' },
  monitor: { color: 'text-emerald-600 border-emerald-400/30 bg-emerald-50',      icon: CheckCircle,   label: 'MONITOR' },
}

export function ReferralLetter({ open, onClose, data }: Props) {
  const [urgency, setUrgency]       = useState<TreatmentPriority>(data.urgency)
  const [extraNotes, setExtraNotes] = useState('')
  const [copied, setCopied]         = useState(false)

  const urgencyStyle = URGENCY_STYLE[urgency]
  const UIcon = urgencyStyle.icon

  const letterBody = `Dear Colleague,

Re: ${data.patientCode} — ${data.patientAge ? `${data.patientAge}-year-old` : ''} ${data.patientGender ?? 'patient'}, ${data.eyeSide} eye

I am referring this patient for specialist ${data.specialistType} assessment following retinal fundus photography analysis using the ClaraVision-XAI clinical decision-support platform.

CLINICAL FINDINGS:
${data.clinicalFindings.map(f => `• ${f}`).join('\n')}

AI-ASSISTED DIAGNOSIS:
Predicted Pathology: ${data.diagnosis}
Disease Stage/Grade: ${data.stage}
Model Confidence: ${(data.confidence * 100).toFixed(1)}%
Analysis Date: ${data.date}

REFERRAL REASON:
The fundus image demonstrates features consistent with ${data.diagnosis} (${data.stage}). Based on the clinical findings and AI-assisted assessment, I request ${urgencyToText(urgency).toLowerCase()} specialist review.

${extraNotes ? `ADDITIONAL CLINICAL INFORMATION:\n${extraNotes}\n` : ''}REQUESTED ACTIONS:
• Clinical examination and confirmation of AI findings
• Appropriate investigation and management as per specialist judgement
• Feedback to referring clinician at earliest opportunity

This referral is supported by ClaraVision-XAI image analysis (Analysis ID: generated). Please note that AI predictions are decision-support tools and must be interpreted in full clinical context.

Yours sincerely,

${data.referringClinician}
${data.referringInstitution}
Date: ${data.date}

─────────────────────────────────────────────────────
ClaraVision · Clinical AI for Retinal Disease Diagnosis
Decision-support software — not for autonomous clinical use
`

  function handlePrint() {
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Referral Letter — ${data.patientCode}</title>
<style>
  body { font-family: 'Times New Roman', serif; margin: 48px 56px; color: #111; font-size: 13px; line-height: 1.7; }
  .header { border-bottom: 2px solid #0F6E56; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { color: #0F6E56; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
  .brand-sub { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .urgency { display: inline-block; padding: 3px 12px; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
  .urgent { background: #FCEBEB; color: #A32D2D; border: 1px solid #f5c5c0; }
  .soon    { background: #FAEEDA; color: #854F0B; border: 1px solid #fcd34d; }
  .routine { background: #EBF2FC; color: #1a4e8a; border: 1px solid #93c5fd; }
  .monitor { background: #EAF3DE; color: #3B6D11; border: 1px solid #bbf7d0; }
  pre { font-family: inherit; white-space: pre-wrap; margin: 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
  @media print { @page { margin: 20mm 18mm; } }
</style></head><body>
<div class="header">
  <div class="brand">ClaraVision</div>
  <div class="brand-sub">Clinical AI · Retinal Disease Diagnosis</div>
</div>
<div style="margin-bottom:14px">
  <strong>Ophthalmology Referral Letter</strong>
  <span class="urgency ${urgency}" style="margin-left:10px">${urgencyStyle.label} — ${urgencyToText(urgency)}</span>
</div>
<pre>${letterBody.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
<div class="footer">Generated by ClaraVision Clinical AI Platform · ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</div>
</body></html>`)
    win.document.close()
    win.onload = () => win.print()
  }

  function handleCopy() {
    navigator.clipboard.writeText(letterBody)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Ophthalmology Referral Letter — {data.patientCode}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Urgency selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Referral urgency:</span>
            <Select value={urgency} onValueChange={v => setUrgency(v as TreatmentPriority)}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">URGENT — 24–48 hours</SelectItem>
                <SelectItem value="soon">Soon — 1–2 weeks</SelectItem>
                <SelectItem value="routine">Routine — 4–6 weeks</SelectItem>
                <SelectItem value="monitor">Monitor — 3 months</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className={cn('text-xs font-bold', urgencyStyle.color)}>
              <UIcon className="size-3 mr-1" />{urgencyStyle.label}
            </Badge>
          </div>

          {/* Letter preview */}
          <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
            {letterBody}
          </div>

          {/* Additional notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Additional clinical information (optional)</label>
            <Textarea
              placeholder="Add relevant history, medications, systemic conditions, visual acuity, IOP readings…"
              value={extraNotes}
              onChange={e => setExtraNotes(e.target.value)}
              className="h-24 resize-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handlePrint} className="flex-1 gap-2">
              <Printer className="size-4" />
              Print / Save PDF
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <CheckCircle className="size-4 text-emerald-600" /> : <ClipboardCopy className="size-4" />}
              {copied ? 'Copied!' : 'Copy text'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
