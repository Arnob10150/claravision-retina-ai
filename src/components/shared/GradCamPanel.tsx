/**
 * GradCamPanel — interactive Grad-CAM saliency visualisation with annotated
 * anatomical region labels. Mirrors real Grad-CAM overlays used in published
 * retinal AI literature.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Eye, Layers } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DiseaseClass } from '@/lib/inference'
import { GRAD_CAM_REGIONS_BY_DISEASE, type GradCamRegion } from '@/lib/clinical'

interface Props {
  imageUri: string | null
  disease: DiseaseClass
  opacity?: number
}

const SIGNIFICANCE_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Low:    'bg-slate-100 text-slate-600 border-slate-200',
}

export function GradCamPanel({ imageUri, disease, opacity: initOpacity = 0.55 }: Props) {
  const [opacity, setOpacity] = useState(initOpacity)
  const [activeRegion, setActiveRegion] = useState<GradCamRegion | null>(null)
  const [showOverlay, setShowOverlay] = useState(true)

  const regions = GRAD_CAM_REGIONS_BY_DISEASE[disease] ?? []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Layers className="size-4 text-primary" />
          <span className="font-medium text-foreground">Grad-CAM Overlay</span>
        </div>
        <button
          onClick={() => setShowOverlay(v => !v)}
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full border transition-all',
            showOverlay
              ? 'bg-primary text-white border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/40'
          )}
        >
          {showOverlay ? 'On' : 'Off'}
        </button>
        {showOverlay && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Intensity</span>
            <div className="w-24">
              <Slider
                min={0.1} max={0.9} step={0.05}
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-7">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Image with overlay + region markers */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-black">
        {imageUri ? (
          <img src={imageUri} alt="Fundus scan" className="w-full object-contain" />
        ) : (
          /* Simulated fundus placeholder when no real image */
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-900 via-[#0a1f14] to-slate-900 flex items-center justify-center">
            <Eye className="size-16 text-primary/30" />
          </div>
        )}

        {/* Grad-CAM heat blobs */}
        <AnimatePresence>
          {showOverlay && regions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute rounded-full blur-xl pointer-events-none"
              style={{
                left: `${r.cx - r.radius}%`,
                top:  `${r.cy - r.radius * 1.3}%`,
                width:  `${r.radius * 2}%`,
                height: `${r.radius * 2}%`,
                background: `radial-gradient(circle, ${r.color}${Math.round(opacity * 255).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Region annotation dots */}
        {regions.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveRegion(prev => prev?.id === r.id ? null : r)}
            className="absolute group"
            style={{ left: `${r.cx}%`, top: `${r.cy}%`, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              animate={{ scale: activeRegion?.id === r.id ? 1.3 : 1 }}
              className="relative"
            >
              {/* Pulsing ring */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ backgroundColor: r.color }}
              />
              {/* Core dot */}
              <div
                className="relative w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: r.color }}
              />
              {/* Label chip on hover */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg text-white"
                  style={{ backgroundColor: r.color }}
                >
                  {r.label}
                </span>
              </div>
            </motion.div>
          </button>
        ))}
      </div>

      {/* Active region clinical detail */}
      <AnimatePresence>
        {activeRegion && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border p-4 space-y-2"
            style={{ borderColor: activeRegion.color + '40', backgroundColor: activeRegion.color + '08' }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeRegion.color }} />
              <span className="font-bold text-foreground text-sm">{activeRegion.label}</span>
              <Badge variant="outline" className={cn('text-[10px] font-bold', SIGNIFICANCE_BADGE[activeRegion.significance])}>
                {activeRegion.significance} Significance
              </Badge>
              <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setActiveRegion(null)}>
                <span className="text-xs">✕</span>
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{activeRegion.clinicalNote}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Region legend */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Info className="size-3" /> Click any dot on the image for clinical annotation
        </p>
        <div className="flex flex-wrap gap-2">
          {regions.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRegion(prev => prev?.id === r.id ? null : r)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                activeRegion?.id === r.id
                  ? 'border-current text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
              style={activeRegion?.id === r.id ? { borderColor: r.color + '60', backgroundColor: r.color + '12' } : {}}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
