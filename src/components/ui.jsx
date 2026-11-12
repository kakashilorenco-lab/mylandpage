import { useRef } from 'react'
import { gsap, useMotion } from '../lib/gsap'

/** Fita de tinta. A animação (drawSVG) fica a cargo da seção. */
export function Ribbon({ d, height = 900, className = '', pathClass = '' }) {
  return (
    <div
      aria-hidden
      className={`ribbon pointer-events-none absolute top-0 left-1/2 z-10 w-[max(100%,1100px)] -translate-x-1/2 ${className}`}
    >
      <svg viewBox={`0 0 1440 ${height}`} fill="none" className="block h-auto w-full overflow-visible">
        <path
          className={`ribbon-path ${pathClass}`}
          d={d}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** Card flutuante — ver floatCards() em lib/motion.js para as camadas. */
export function FloatCard({ className = '', depth = 1, children }) {
  return (
    <div className={`float-card absolute z-20 ${className}`} data-depth={depth}>
      <div className="fc-mouse">
        <div className="fc-idle card px-4 py-3 text-[13px] leading-snug">{children}</div>
      </div>
    </div>
  )
}

/** Botão pílula com efeito magnético (só em ponteiro fino). */
export function Button({ href = '#oferta', variant = 'solid', className = '', children }) {
  const ref = useRef(null)
  useMotion(ref, ({ fine }) => {
    if (!fine) return
    const el = ref.current
    const label = el.firstElementChild
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left - r.width / 2
      const y = e.clientY - r.top - r.height / 2
      gsap.to(el, { x: x * 0.28, y: y * 0.4, duration: 0.5, ease: 'power3.out' })
      gsap.to(label, { x: x * 0.12, y: y * 0.16, duration: 0.5, ease: 'power3.out' })
    }
    const leave = () => gsap.to([el, label], { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' })
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  })

  const styles =
    variant === 'solid'
      ? 'bg-[var(--fg)] text-[var(--bg)]'
      : variant === 'acid'
        ? 'bg-acid text-ink'
        : 'border hairline text-[var(--fg)]'
  return (
    <a
      ref={ref}
      href={href}
      className={`group relative z-20 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-700 ${styles} ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        {children}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-500 group-hover:translate-x-1">
          <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  )
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p data-reveal className={`flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 ${className}`}>
      <span className="inline-block size-1.5 rounded-full bg-acid ring-1 ring-black/20" />
      {children}
    </p>
  )
}

export function Dot({ className = '' }) {
  return <span className={`inline-block size-2 rounded-full bg-acid ring-1 ring-black/15 ${className}`} />
}
