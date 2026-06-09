import type { InferenceResult } from '@/lib/inference'

export function openAnalysisReport(
  result: InferenceResult,
  metadata: { age: string; gender: string; eye_side: string },
) {
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) { alert('Please allow pop-ups to open reports in a new tab.'); return }

  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const eyeLabel = metadata.eye_side === 'left' ? 'Left Eye (OS)' : metadata.eye_side === 'right' ? 'Right Eye (OD)' : 'Not specified'

  const probRows = Object.entries(result.all_probabilities)
    .filter(([, p]) => p > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([d, p]) => `
      <tr>
        <td style="padding:6px 10px;font-weight:${d === result.predicted_class ? '700' : '400'};color:${d === result.predicted_class ? '#0F6E56' : '#374151'}">${d}</td>
        <td style="padding:6px 10px;text-align:right;font-family:monospace;width:70px">${(p * 100).toFixed(1)}%</td>
        <td style="padding:6px 10px;width:200px">
          <div style="height:7px;background:#f3f4f6;border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${d === result.predicted_class ? '#0F6E56' : '#9ca3af'};border-radius:99px"></div>
          </div>
        </td>
      </tr>`)
    .join('')

  const conceptChips = result.activated_concepts.map(c =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:99px;padding:3px 12px;font-size:11px;color:#166534;font-weight:600;margin:3px">${c.name} <span style="opacity:.65">${(c.confidence * 100).toFixed(0)}%</span></span>`
  ).join('')

  const reasonsList = result.supporting_reasons.map(r =>
    `<li style="margin-bottom:7px;color:#374151;line-height:1.6">${r}</li>`
  ).join('')

  const diffRows = result.differential.length > 0 ? result.differential.map(d =>
    `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:6px 10px">${d.disease}</td>
      <td style="padding:6px 10px;text-align:right;font-family:monospace">${(d.probability * 100).toFixed(1)}%</td>
      <td style="padding:6px 10px;font-size:11px;color:#6b7280">${(d as any).ruled_out_because ?? ''}</td>
    </tr>`
  ).join('') : ''

  const uncertaintyColor = result.uncertainty_level === 'low' ? '#3B6D11' : result.uncertainty_level === 'medium' ? '#854F0B' : '#A32D2D'
  const uncertaintyBg    = result.uncertainty_level === 'low' ? '#EAF3DE' : result.uncertainty_level === 'medium' ? '#FAEEDA' : '#FCEBEB'

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ClaraVision — ${result.predicted_class} — Analysis Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#111;background:#f8f9fa;font-size:13px;line-height:1.6}
  .page{max-width:800px;margin:32px auto;background:white;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}
  .header{background:#0F6E56;padding:28px 36px;color:white;display:flex;justify-content:space-between;align-items:flex-start}
  .brand-name{font-size:22px;font-weight:800;letter-spacing:-0.5px}
  .brand-sub{font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
  .report-label{font-size:13px;font-weight:600;opacity:.9;text-align:right}
  .report-id{font-size:10px;font-family:monospace;opacity:.65;margin-top:4px;text-align:right}
  .body{padding:32px 36px}
  .disclaimer{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:11px;color:#92400e;margin-bottom:28px;font-weight:500}
  .section{margin-bottom:28px}
  .section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#6b7280;border-bottom:2px solid #f3f4f6;padding-bottom:6px;margin-bottom:14px}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .info-item .label{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px}
  .info-item .value{font-size:14px;font-weight:700;color:#111;margin-top:3px}
  .diagnosis-card{background:#f0fdf4;border:2px solid #0F6E56;border-radius:10px;padding:18px 20px;margin-bottom:14px}
  .diagnosis-name{font-size:26px;font-weight:800;color:#0F6E56;line-height:1.2}
  .diagnosis-meta{display:flex;gap:24px;margin-top:12px;flex-wrap:wrap}
  .meta-item .meta-label{font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:.6px}
  .meta-item .meta-value{font-size:17px;font-weight:700;margin-top:2px}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;font-size:12px}
  tr:nth-child(even){background:#fafafa}
  .notes-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:12px;color:#374151;white-space:pre-wrap}
  .footer{background:#f8f9fa;border-top:1px solid #e5e7eb;padding:14px 36px;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
  .print-btn{display:block;margin:0 auto 28px;padding:10px 32px;background:#0F6E56;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.3px}
  .print-btn:hover{background:#0d5e49}
  @media print{
    body{background:white}
    .page{margin:0;border-radius:0;box-shadow:none}
    .print-btn{display:none}
    @page{margin:16mm 14mm;size:A4 portrait}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">ClaraVision</div>
      <div class="brand-sub">Clinical AI · Retinal Disease Diagnosis</div>
    </div>
    <div>
      <div class="report-label">Preliminary Analysis Report</div>
      <div class="report-id">ID: ${result.analysis_id}</div>
      <div class="report-id">${date}</div>
    </div>
  </div>

  <div class="body">
    <div class="disclaimer">⚠ Preliminary AI-assisted analysis only. Must be reviewed and confirmed by a qualified clinician before any diagnostic or treatment decision.</div>

    <div class="section">
      <div class="section-title">Scan Information</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Laterality</div><div class="value">${eyeLabel}</div></div>
        <div class="info-item"><div class="label">Patient Age</div><div class="value">${metadata.age || '–'}</div></div>
        <div class="info-item"><div class="label">Sex</div><div class="value" style="text-transform:capitalize">${metadata.gender || '–'}</div></div>
        <div class="info-item"><div class="label">Inference Time</div><div class="value">${result.processing_time_ms} ms</div></div>
        <div class="info-item"><div class="label">Report Date</div><div class="value">${date}</div></div>
        <div class="info-item"><div class="label">Analysis ID</div><div class="value" style="font-size:11px;font-family:monospace;font-weight:600">${result.analysis_id}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">ClaraVision-XAI Primary Finding</div>
      <div class="diagnosis-card">
        <div style="font-size:10px;color:#0F6E56;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Primary Diagnosis</div>
        <div class="diagnosis-name">${result.predicted_class}</div>
        <div class="diagnosis-meta">
          <div class="meta-item">
            <div class="meta-label">Confidence</div>
            <div class="meta-value">${(result.confidence * 100).toFixed(1)}%</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Uncertainty</div>
            <div class="meta-value" style="margin-top:4px">
              <span class="badge" style="background:${uncertaintyBg};color:${uncertaintyColor}">${result.uncertainty_level.toUpperCase()}</span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Uncertainty Score</div>
            <div class="meta-value">${(result.uncertainty_score * 100).toFixed(1)}%</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Referral Flag</div>
            <div class="meta-value" style="font-size:14px">${result.referral_flag ? '⚠ Yes' : '✓ No'}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Probability Distribution</div>
      <table>
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:#6b7280;font-weight:600">Condition</th>
            <th style="padding:6px 10px;text-align:right;font-size:10px;color:#6b7280;font-weight:600">Probability</th>
            <th style="padding:6px 10px;font-size:10px;color:#6b7280;font-weight:600">Distribution</th>
          </tr>
        </thead>
        <tbody>${probRows}</tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Activated Clinical Features (Grad-CAM XAI)</div>
      <div style="margin-top:2px">${conceptChips}</div>
    </div>

    <div class="section">
      <div class="section-title">Supporting Clinical Reasoning</div>
      <ul style="padding-left:20px;margin-top:4px">${reasonsList}</ul>
    </div>

    ${result.differential.length > 0 ? `
    <div class="section">
      <div class="section-title">Differential Diagnoses</div>
      <table>
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:#6b7280;font-weight:600">Condition</th>
            <th style="padding:6px 10px;text-align:right;font-size:10px;color:#6b7280;font-weight:600">Probability</th>
            <th style="padding:6px 10px;font-size:10px;color:#6b7280;font-weight:600">Notes</th>
          </tr>
        </thead>
        <tbody>${diffRows}</tbody>
      </table>
    </div>` : ''}

    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="footer">
    <span>ClaraVision · Clinical AI for Retinal Disease &nbsp;|&nbsp; HIPAA · FDA · CE · ISO 13485</span>
    <span>Generated: ${date}</span>
  </div>
</div>
</body>
</html>`)
  win.document.close()
}
