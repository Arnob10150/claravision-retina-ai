import { Printer, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { UncertaintyBadge } from '@/components/shared/UncertaintyBadge'
import type { InferenceResult } from '@/lib/inference'

interface Props {
  open: boolean
  onClose: () => void
  result: InferenceResult
  metadata: { age: string; gender: string; eye_side: string }
}

export function AnalysisReport({ open, onClose, result, metadata }: Props) {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const eyeLabel = metadata.eye_side === 'left' ? 'Left Eye (OS)' : metadata.eye_side === 'right' ? 'Right Eye (OD)' : 'Not specified'

  function handlePrint() {
    const win = window.open('', '_blank', 'width=850,height=1100')
    if (!win) { alert('Please allow pop-ups to generate PDF reports.'); return }

    const probRows = Object.entries(result.all_probabilities)
      .filter(([, p]) => p > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([d, p]) => `
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:5px 8px;font-weight:${d === result.predicted_class ? '700' : '400'};color:${d === result.predicted_class ? '#0F6E56' : '#374151'}">${d}</td>
          <td style="padding:5px 8px;text-align:right;font-family:monospace">${(p * 100).toFixed(1)}%</td>
          <td style="padding:5px 8px;width:180px">
            <div style="height:6px;background:#f3f4f6;border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${d === result.predicted_class ? '#0F6E56' : '#9ca3af'};border-radius:99px"></div>
            </div>
          </td>
        </tr>`).join('')

    const conceptChips = result.activated_concepts.map(c =>
      `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:99px;padding:2px 10px;font-size:11px;color:#166534;font-weight:600;margin:2px">${c.name} ${(c.confidence * 100).toFixed(0)}%</span>`
    ).join('')

    const reasonsList = result.supporting_reasons.map(r =>
      `<li style="margin-bottom:5px;color:#374151">${r}</li>`
    ).join('')

    const diffRows = result.differential.map(d =>
      `<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:5px 8px">${d.disease}</td>
        <td style="padding:5px 8px;text-align:right;font-family:monospace">${(d.probability * 100).toFixed(1)}%</td>
        <td style="padding:5px 8px;font-size:11px;color:#6b7280">${(d as any).ruled_out_because ?? ''}</td>
      </tr>`
    ).join('')

    win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>ClaraVision — Analysis Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:white;font-size:12px;line-height:1.55}
  .page{max-width:760px;margin:0 auto;padding:48px 40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0F6E56;padding-bottom:18px;margin-bottom:24px}
  .brand-name{font-size:20px;font-weight:800;color:#0F6E56}
  .brand-sub{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;margin-top:1px}
  .disclaimer{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:24px;font-weight:500}
  .section{margin-bottom:20px}
  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:10px}
  .diagnosis-card{background:#f0fdf4;border:1.5px solid #0F6E56;border-radius:8px;padding:14px 16px;margin-bottom:12px}
  .diagnosis-name{font-size:22px;font-weight:800;color:#0F6E56}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  .badge-low{background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
  .badge-medium{background:#FAEEDA;color:#854F0B;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
  .badge-high{background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
  .footer{margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:20mm 16mm;size:A4 portrait}}
</style></head><body><div class="page">
  <div class="header">
    <div>
      <div class="brand-name">ClaraVision</div>
      <div class="brand-sub">Clinical AI · Retinal Disease Diagnosis</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:700">Preliminary Analysis Report</div>
      <div style="font-size:10px;color:#6b7280;font-family:monospace">ID: ${result.analysis_id}</div>
      <div style="font-size:10px;color:#6b7280">${date}</div>
    </div>
  </div>
  <div class="disclaimer">⚠ This is a preliminary AI-assisted analysis. It must be reviewed and confirmed by a qualified clinician before any diagnostic or treatment decision.</div>

  <div class="section">
    <div class="section-title">Scan Information</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div><div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase">Laterality</div><div style="font-size:13px;font-weight:600;margin-top:2px">${eyeLabel}</div></div>
      <div><div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase">Age</div><div style="font-size:13px;font-weight:600;margin-top:2px">${metadata.age || '–'}</div></div>
      <div><div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase">Sex</div><div style="font-size:13px;font-weight:600;margin-top:2px;text-transform:capitalize">${metadata.gender || '–'}</div></div>
      <div><div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase">Inference Time</div><div style="font-size:13px;font-weight:600;margin-top:2px">${result.processing_time_ms} ms</div></div>
      <div><div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase">Report Date</div><div style="font-size:13px;font-weight:600;margin-top:2px">${date}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">ClaraVision-XAI Primary Finding</div>
    <div class="diagnosis-card">
      <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Primary Diagnosis</div>
      <div class="diagnosis-name">${result.predicted_class}</div>
      <div style="display:flex;gap:20px;margin-top:10px;flex-wrap:wrap">
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600">Confidence</div><div style="font-size:16px;font-weight:700">${(result.confidence * 100).toFixed(1)}%</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600">Uncertainty</div><div style="margin-top:3px"><span class="badge-${result.uncertainty_level}">${result.uncertainty_level.toUpperCase()}</span></div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600">Referral Flag</div><div style="font-size:13px;font-weight:600;margin-top:2px">${result.referral_flag ? '⚠ Yes' : '✓ No'}</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Probability Distribution</div>
    <table><tbody>${probRows}</tbody></table>
  </div>

  <div class="section">
    <div class="section-title">Activated Clinical Features (Grad-CAM)</div>
    <div>${conceptChips}</div>
  </div>

  <div class="section">
    <div class="section-title">Supporting Clinical Reasoning</div>
    <ul style="padding-left:18px">${reasonsList}</ul>
  </div>

  ${result.differential.length > 0 ? `
  <div class="section">
    <div class="section-title">Differential Diagnoses</div>
    <table><thead><tr style="background:#f9fafb"><th style="padding:5px 8px;text-align:left;font-size:10px;color:#6b7280;font-weight:600">Condition</th><th style="padding:5px 8px;text-align:right;font-size:10px;color:#6b7280;font-weight:600">Probability</th><th style="padding:5px 8px;font-size:10px;color:#6b7280;font-weight:600">Ruled Out Because</th></tr></thead><tbody>${diffRows}</tbody></table>
  </div>` : ''}

  <div class="footer">
    <span>ClaraVision · Clinical AI for Retinal Disease | HIPAA · FDA · CE · ISO 13485</span>
    <span>Generated: ${date}</span>
  </div>
</div><script>window.onload=function(){window.print()}</script></body></html>`)
    win.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Preliminary Analysis Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Header info */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Eye</p>
              <p className="font-semibold mt-0.5">
                {metadata.eye_side === 'left' ? 'Left (OS)' : metadata.eye_side === 'right' ? 'Right (OD)' : '–'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Age / Sex</p>
              <p className="font-semibold mt-0.5 capitalize">{metadata.age || '–'} / {metadata.gender || '–'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Analysis ID</p>
              <p className="font-mono text-xs mt-0.5 text-muted-foreground">{result.analysis_id}</p>
            </div>
          </div>

          <Separator />

          {/* Primary finding */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Primary Finding</p>
            <p className="text-2xl font-bold text-foreground">{result.predicted_class}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="tabular-nums text-sm font-semibold">{(result.confidence * 100).toFixed(1)}% confidence</span>
              <UncertaintyBadge level={result.uncertainty_level} score={result.uncertainty_score} showScore size="sm" />
              {result.referral_flag && (
                <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Referral Recommended</Badge>
              )}
            </div>
          </div>

          {/* Concepts */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Activated Clinical Features</p>
            <div className="flex flex-wrap gap-1.5">
              {result.activated_concepts.map(c => (
                <Badge key={c.name} variant="secondary" className="text-xs">
                  {c.name} <span className="ml-1 opacity-60">{(c.confidence * 100).toFixed(0)}%</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Supporting Reasoning</p>
            <ul className="space-y-1.5">
              {result.supporting_reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">›</span>{r}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="size-4 mr-1.5" /> Print / Save PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="size-4 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
