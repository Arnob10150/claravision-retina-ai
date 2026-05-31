import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UncertaintyLevel } from '@/lib/inference'

interface UncertaintyBadgeProps {
  level: UncertaintyLevel
  score?: number
  showScore?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const CONFIG = {
  low: {
    label: 'Low uncertainty',
    icon: CheckCircle,
    className: 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20',
    darkClassName: 'dark:bg-[#3B6D11]/20 dark:text-[#86C95A] dark:border-[#86C95A]/20',
  },
  medium: {
    label: 'Medium uncertainty',
    icon: AlertTriangle,
    className: 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/20',
    darkClassName: 'dark:bg-[#854F0B]/20 dark:text-[#F5B95A] dark:border-[#F5B95A]/20',
  },
  high: {
    label: 'High — refer',
    icon: AlertCircle,
    className: 'bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20',
    darkClassName: 'dark:bg-[#A32D2D]/20 dark:text-[#F77A7A] dark:border-[#F77A7A]/20',
  },
}

const SIZE = {
  sm: { badge: 'px-2 py-0.5 text-xs gap-1', icon: 'size-3' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5', icon: 'size-3.5' },
  lg: { badge: 'px-3 py-1.5 text-sm gap-2', icon: 'size-4' },
}

export function UncertaintyBadge({
  level,
  score,
  showScore = false,
  size = 'md',
  className,
}: UncertaintyBadgeProps) {
  const config = CONFIG[level]
  const sizeConfig = SIZE[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium tabular-nums',
        sizeConfig.badge,
        config.className,
        config.darkClassName,
        className
      )}
    >
      <Icon className={cn('shrink-0', sizeConfig.icon)} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-70">({(score * 100).toFixed(0)}%)</span>
      )}
    </span>
  )
}
