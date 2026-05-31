/**
 * EyeExamScene
 * Embeds the original eye_exam_color_0F6E56 animation as an iframe.
 * The animation shows a doctor/nurse eye-exam scene with animated iris,
 * pupil pulse, vein tracing, pulse ring and drop-fall — all brand-coloured.
 */

interface EyeExamSceneProps {
  /** Width of the iframe wrapper (default: 100%) */
  width?: string | number
  /** Height of the iframe wrapper (default: 320px) */
  height?: string | number
  className?: string
}

export function EyeExamScene({ width = '100%', height = 320, className = '' }: EyeExamSceneProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/eye-scene.html"
        title="ClaraRetina eye examination animation"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          display: 'block',
        }}
        /* allow transparent background to show through */
        allowTransparency={true}
        scrolling="no"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
