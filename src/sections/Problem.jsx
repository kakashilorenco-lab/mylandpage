import { useRef } from 'react'
import { gsap, useMotion } from '../lib/gsap'
import { RIBBONS } from '../lib/shapes'
import { Dot, Eyebrow, Ribbon } from '../components/ui'

// Cada card tem dois estados: o caos (antes) e a trilha (depois).
const CARDS = [
  { chaos: 'Tutorial #47 — pausado', order: 'Semana 1 · Fundamentos', x: -150, y: -70, r: -14 },
  { chaos: 'Playlist com 132 vídeos', order: 'Semana 2 · Primeiro projeto', x: 130, y: -130, r: 11 },
  { chaos: 'Aba aberta há 3 meses', order: 'Semana 3 · Code review', x: -60, y: 40, r: 7 },
  { chaos: 'Curso salvo pra depois', order: 'Semana 4 · Deploy', x: 170, y: 60, r: -9 },
  { chaos: 'Bootcamp abandonado', order: 'Semana 5 · Portfólio no ar', x: -170, y: 150, r: 16 },
]

export default function Problem() {
  const root = useRef(null)

  useMotion(root, ({ desktop }) => {
    const k = desktop ? 1 : 0.45 // espalha menos no mobile
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.problem-pin', pin: true, start: 'top top', end: '+=230%', scrub: 1 },
    })

    tl.fromTo('.ribbon-path', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 3 }, 0)
      // 1. o caos entra voando
      .fromTo(
        '.p-card',
        { x: (i) => CARDS[i].x * 4 * k, y: (i) => CARDS[i].y * 3 + 500, rotation: (i) => CARDS[i].r * 4, autoAlpha: 0 },
        {
          x: (i) => CARDS[i].x * k,
          y: (i) => CARDS[i].y - (i - 2) * 62,
          rotation: (i) => CARDS[i].r,
          autoAlpha: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.08,
        },
        0,
      )
      // 2. troca de headline
      .to('.p-before', { yPercent: -30, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 1.5)
      .fromTo('.p-after', { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 1.95)
      // 3. o caos vira trilha
      .to('.p-card', { x: 0, y: 0, rotation: 0, duration: 1, ease: 'back.out(1.5)', stagger: 0.07 }, 1.6)
      .to('.p-chaos', { autoAlpha: 0, duration: 0.3 }, 1.8)
      .fromTo('.p-order', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.07 }, 2)
      .fromTo('.p-check', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', stagger: 0.07 }, 2.1)
      .to({}, { duration: 0.35 }) // respiro antes de soltar o pin
  })

  return (
    <section ref={root} className="relative">
      <div className="problem-pin theme-bg relative flex min-h-[100svh] items-center overflow-clip py-24">
        <Ribbon d={RIBBONS.problem} />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 md:grid-cols-2 md:px-10">
          <div className="grid motion-reduce:block">
            <div className="p-before [grid-area:1/1] motion-reduce:hidden">
              <Eyebrow className="mb-6">O problema</Eyebrow>
              <h2 data-split className="display text-[clamp(2.7rem,6.4vw,6rem)]">
                Tutorial demais. <em>Projeto de menos.</em>
              </h2>
              <p data-reveal className="mt-6 max-w-sm leading-relaxed opacity-70">
                Você assiste, salva, promete voltar. O conteúdo se acumula e a sensação de estar
                sempre começando do zero também.
              </p>
            </div>
            <div className="p-after [grid-area:1/1]">
              <p className="mb-6 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">
                <Dot /> A virada
              </p>
              <h2 className="display text-[clamp(2.7rem,6.4vw,6rem)]">
                Pegue o foco <em>antes que ele suma.</em>
              </h2>
              <p className="mt-6 max-w-sm leading-relaxed opacity-70">
                Uma trilha só, na ordem certa. Cada semana termina com algo construído — e não com
                mais uma aba aberta.
              </p>
            </div>
          </div>

          <ul className="relative z-20 mx-auto flex w-full max-w-[340px] flex-col gap-3">
            {CARDS.map((c, i) => (
              <li key={i} className="p-card card relative flex h-[50px] items-center gap-3 px-4 text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-ink">
                  <svg className="p-check" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.2l2 2 4-4.4" stroke="#c6f432" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="relative flex-1">
                  <span className="p-order font-medium">{c.order}</span>
                  <span className="p-chaos absolute inset-0 opacity-60 motion-reduce:hidden">{c.chaos}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
