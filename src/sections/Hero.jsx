import { useRef } from 'react'
import { gsap, ScrollTrigger, useMotion, SPRING } from '../lib/gsap'
import { floatCards } from '../lib/motion'
import { BLOBS, RIBBONS } from '../lib/shapes'
import { Button, Dot, FloatCard } from '../components/ui'

const CODE = [
  ['w-10 bg-acid', 'w-24 bg-white/70'],
  ['ml-4 w-16 bg-white/30', 'w-20 bg-white/60'],
  ['ml-4 w-12 bg-white/30', 'w-28 bg-acid/80'],
  ['ml-8 w-24 bg-white/50'],
  ['ml-4 w-8 bg-white/30'],
  ['w-14 bg-white/70', 'w-10 bg-white/30'],
]

export default function Hero() {
  const root = useRef(null)

  useMotion(root, (cond) => {
    const el = root.current
    const cleanup = floatCards(el, cond)

    // Blob: morph contínuo entre formas
    const morph = gsap.timeline({ repeat: -1, defaults: { duration: 3.4, ease: 'sine.inOut' } })
    ;[...BLOBS.slice(1), BLOBS[0]].forEach((d) => morph.to('.hero-blob', { morphSVG: d }))

    // Entrada
    gsap
      .timeline({ delay: 0.2 })
      .from('.ribbon-a', { drawSVG: '0%', duration: 2.4, ease: 'ink' }, 0.1)
      .from('.hero-blob-wrap', { scale: 0, rotation: -50, duration: 1.8, ease: SPRING }, 0.5)
      .from('.hero-code', { scale: 0.6, autoAlpha: 0, y: 40, duration: 1.4, ease: SPRING }, 0.8)
      .from('.code-chip', { scaleX: 0, transformOrigin: '0 50%', duration: 0.7, ease: 'soft', stagger: 0.05 }, 1.1)
      .from('.fc-mouse', { scale: 0, autoAlpha: 0, duration: 1.3, ease: SPRING, stagger: 0.09 }, 1)
      .from('.hero-meta > *', { autoAlpha: 0, y: 24, duration: 1, ease: 'soft', stagger: 0.08 }, 0.7)

    // Scroll: a fita continua, o blob reage e os cards ganham profundidade
    gsap
      .timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          onUpdate: (self) => {
            // quanto mais rápido o scroll, mais agitada a tinta
            const boost = gsap.utils.clamp(1, 5, 1 + Math.abs(self.getVelocity()) / 500)
            gsap.to(morph, { timeScale: boost, duration: 0.3, overwrite: true })
            gsap.to(morph, { timeScale: 1, duration: 1.2, delay: 0.3 })
          },
        },
      })
      .fromTo('.ribbon-b', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none' }, 0)
      .to('.hero-copy', { yPercent: -22, ease: 'none' }, 0)
      .to('.hero-blob-svg', { scale: 1.35, rotation: 70, ease: 'none' }, 0)
      .to('.float-card', { y: (i, c) => -90 * Number(c.dataset.depth), ease: 'none' }, 0)
      .to('.hero-code', { y: -50, ease: 'none' }, 0)

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? morph.resume() : morph.pause()),
    })
    return cleanup
  })

  return (
    <section ref={root} id="top" className="theme-bg relative overflow-clip pt-28 md:pt-36">
      <Ribbon2 />

      <div className="hero-copy relative mx-auto max-w-[1100px] px-5 text-center">
        <p data-reveal className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">
          <Dot /> Turma 01 · Matrículas abertas
        </p>
        <h1 data-split className="display text-[clamp(3.1rem,10.4vw,9rem)]">
          Toda grande carreira começa com <em>uma linha.</em>
        </h1>
        <div className="hero-meta mt-8 flex flex-col items-center gap-7">
          <p className="max-w-md text-[15px] leading-relaxed opacity-70 md:text-base">
            O curso de [tecnologia] da HackSchool leva você do primeiro commit ao primeiro emprego —
            com projetos reais, mentoria e um método que cabe na sua rotina.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button>Garantir minha vaga</Button>
            <Button href="#metodo" variant="ghost">
              Ver a ementa
            </Button>
          </div>
        </div>
      </div>

      {/* Palco: blob + editor + cards flutuantes */}
      <div className="relative mx-auto mt-10 h-[430px] max-w-[1100px] md:mt-6 md:h-[560px]">
        <div className="hero-blob-wrap absolute top-1/2 left-1/2 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 500 500" className="hero-blob-svg block w-full overflow-visible">
            <path className="hero-blob" d={BLOBS[0]} fill="currentColor" />
          </svg>
        </div>

        <div className="hero-code absolute top-1/2 left-1/2 z-20 w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#15151c] p-4 shadow-2xl md:w-[300px]">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-acid" />
            <span className="ml-auto font-mono text-[10px] text-white/40">primeira-linha.js</span>
          </div>
          <div className="space-y-2.5">
            {CODE.map((line, i) => (
              <div key={i} className="flex gap-2">
                {line.map((chip, j) => (
                  <span key={j} className={`code-chip h-2 rounded-full ${chip}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 font-mono text-[10px] text-white/60">
            <Dot /> build passou · 0 erros
          </div>
        </div>

        <FloatCard className="top-[6%] left-[4%] md:left-[10%]" depth={1.4}>
          <p className="font-mono text-[10px] uppercase opacity-50">Módulo 01</p>
          <p className="font-medium">Fundamentos</p>
          <div className="mt-2 h-1 w-28 rounded-full bg-black/10">
            <div className="h-full w-2/3 rounded-full bg-ink" />
          </div>
        </FloatCard>
        <FloatCard className="top-[12%] right-[3%] md:right-[9%]" depth={0.8}>
          <p className="flex items-center gap-2 font-medium">
            <Dot /> Projeto aprovado
          </p>
          <p className="opacity-55">Code review em 24h</p>
        </FloatCard>
        <FloatCard className="bottom-[10%] left-[2%] md:left-[14%]" depth={0.7}>
          <p className="font-serif text-3xl leading-none">12</p>
          <p className="opacity-55">dias seguidos</p>
        </FloatCard>
        <FloatCard className="right-[2%] bottom-[14%] md:right-[13%]" depth={1.2}>
          <p className="font-mono text-[10px] uppercase opacity-50">Ao vivo</p>
          <p className="font-medium">Mentoria · Qui 20h</p>
        </FloatCard>
        <FloatCard className="top-[46%] left-[1%] hidden md:block" depth={1.8}>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['bg-ink', 'bg-acid', 'bg-stone-400'].map((c) => (
                <span key={c} className={`size-6 rounded-full border-2 border-card ${c}`} />
              ))}
            </div>
            <span className="font-medium">+2.400 alunos</span>
          </div>
        </FloatCard>
        <FloatCard className="top-[50%] right-[0%] hidden md:block" depth={1.6}>
          <p className="font-mono text-[11px]">
            <span className="opacity-50">$</span> git push origin carreira
          </p>
        </FloatCard>
      </div>
    </section>
  )
}

// As duas fitas do hero dividem o mesmo canvas: A entra no load, B segue o scroll.
function Ribbon2() {
  return (
    <div aria-hidden className="ribbon pointer-events-none absolute top-0 left-1/2 z-10 w-[max(100%,1100px)] -translate-x-1/2">
      <svg viewBox="0 0 1440 1100" fill="none" className="block h-auto w-full overflow-visible">
        {['heroA', 'heroB'].map((k, i) => (
          <path
            key={k}
            className={`ribbon-path ${i ? 'ribbon-b' : 'ribbon-a'}`}
            d={RIBBONS[k]}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  )
}
