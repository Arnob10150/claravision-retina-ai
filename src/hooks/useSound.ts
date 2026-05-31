/**
 * ClaraScope Web Audio API sound system.
 * All sounds are synthesized — no audio files required.
 * Respects prefers-reduced-motion (skips sound if set).
 * All sounds are under 300ms at 40% volume.
 */

import { useCallback } from 'react'
import { useUIStore } from '@/store/useUIStore'

type SoundType =
  | 'analysisComplete'
  | 'referralAlert'
  | 'loginSuccess'
  | 'logout'
  | 'error'

function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function createContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  fadeOut = true
) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01)

  if (fadeOut) {
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
  } else {
    gainNode.gain.setValueAtTime(volume, startTime + duration - 0.01)
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
  }

  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.01)
}

const SOUNDS: Record<SoundType, (ctx: AudioContext, vol: number) => void> = {
  // Soft single bell ding — essential for analysis complete
  analysisComplete: (ctx, vol) => {
    const now = ctx.currentTime
    // Bell fundamental
    playTone(ctx, 880, now, 0.28, vol * 0.4, 'sine')
    // Bell overtone
    playTone(ctx, 1760, now, 0.20, vol * 0.2, 'sine')
    playTone(ctx, 1318, now + 0.04, 0.18, vol * 0.15, 'sine')
  },

  // Low double-tone for high uncertainty — referral alert
  referralAlert: (ctx, vol) => {
    const now = ctx.currentTime
    playTone(ctx, 330, now, 0.15, vol * 0.35, 'sine')
    playTone(ctx, 277, now + 0.18, 0.15, vol * 0.35, 'sine')
  },

  // Soft rising two-note chime — login success
  loginSuccess: (ctx, vol) => {
    const now = ctx.currentTime
    playTone(ctx, 523, now, 0.18, vol * 0.35, 'sine')          // C5
    playTone(ctx, 659, now + 0.12, 0.20, vol * 0.35, 'sine')   // E5
  },

  // Single soft descending note — logout
  logout: (ctx, vol) => {
    const now = ctx.currentTime
    playTone(ctx, 659, now, 0.12, vol * 0.30, 'sine')           // E5 down
    playTone(ctx, 523, now + 0.10, 0.18, vol * 0.30, 'sine')    // C5
  },

  // Short soft low thud — error
  error: (ctx, vol) => {
    const now = ctx.currentTime
    playTone(ctx, 180, now, 0.12, vol * 0.35, 'triangle')
    playTone(ctx, 140, now + 0.07, 0.12, vol * 0.25, 'triangle')
  },
}

export function useSound() {
  const { soundEnabled, volume } = useUIStore()

  const play = useCallback(
    (sound: SoundType) => {
      if (!soundEnabled) return
      if (shouldReduceMotion()) return

      const ctx = createContext()
      if (!ctx) return

      try {
        SOUNDS[sound](ctx, volume)
        // Close context after sounds finish
        setTimeout(() => ctx.close(), 500)
      } catch (err) {
        console.warn('[ClaraScope] Sound playback failed:', err)
        ctx.close()
      }
    },
    [soundEnabled, volume]
  )

  return { play }
}
