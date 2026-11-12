import { useRef } from 'react'
import { gsap, useMotion } from '../lib/gsap'
import { RIBBONS } from '../lib/shapes'
import { Eyebrow, Ribbon } from '../components/ui'

const MODULES = [
  ['Fundamentos', ['Lógica e sintaxe', 'Git e terminal', 'Primeiro projeto'], '3 semanas'],
  ['Interfaces', ['HTML e CSS modernos', 'Componentes', 'Design responsivo'], '4 semanas'],
  ['Aplicações', ['Estado e dados', 'Rotas', 'Consumo de APIs'], '5 semanas'],
  ['Back-end', ['Servidores', 'Banco de dados', 'Autenticação'], '5 semanas'],
  ['Produção', ['Testes', 'Deploy e CI', 'Performance'], '3 semanas'],
  ['Carreira', ['Portfólio', 'Entrevistas técnicas', 'Projeto final'], '4 semanas'],
]

export default function Method() {
  const root = useRef(null)

  useMotion(root, () => {
    const track = root.current.querySelector('.m-track')
    const distance = () => track.scrollWidth - window.innerWidth

    gsap
      .timeline({
        scrollTrigger: {
          trigger: '.method-pin',
          pin: true,
          start: 'top top',
          end: () => `+=${distance() + window.innerHeight * 0.5}`,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
      .to(track, { x: () => -distance(), ease: 'none', duration: 1 }, 0)
      .fromTo('.ribbon-path', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 1 }, 0)
      .fromTo('.m-progress', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)
      // cada card entra levemente inclinado e assenta enquanto cruza a tela
      .fromTo(
        '.m-card',
        { rotation: 5, y: 50 },
        { rotation: 0, y: 0, ease: 'power2.out', duration: 0.35, stagger: 0.11 },
        0,
      )
  })

  return (
    <section ref={root} id="metodo" data-dark className="relative">
      <div className="method-pin theme-bg relative flex min-h-[100svh] flex-col justify-center overflow-clip py-24">
        <Ribbon d={RIBBONS.method} />

        <div className="relative mx-auto mb-10 w-full max-w-[1400px] px-5 md:mb-14 md:px-10">
          <Eyebrow className="mb-5">O método</Eyebrow>
          <h2 data-split className="display max-w-3xl text-[clamp(2.7rem,6.4vw,6rem)]">
            O caminho <em>se organiza sozinho.</em>
          </h2>
        </div>

        <div className="relative z-20 motion-reduce:overflow-x-auto">
          <ol className="m-track flex w-max gap-4 px-5 md:gap-6 md:px-10">
            {MODULES.map(([title, topics, time], i) => (
              <li key={title} className="m-card card flex h-[340px] w-[78vw] max-w-[380px] flex-col p-6 md:h-[380px] md:p-7">
                <div className="flex items-start justify-between">
                  <span className="font-serif text-6xl leading-none italic md:text-7xl">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rounded-full border border-black/10 px-3 py-1 font-mono text-[10px] uppercase">{time}</span>
                </div>
                <h3 className="mt-auto font-serif text-3xl md:text-4xl">Módulo {i + 1} — {title}</h3>
                <ul className="mt-4 space-y-1.5 border-t border-black/10 pt-4 text-sm opacity-70">
                  {topics.map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-ink" />
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            <li aria-hidden className="w-[6vw] shrink-0" />
          </ol>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-[1400px] px-5 md:px-10">
          <div className="h-px w-full bg-[var(--line)]">
            <div className="m-progress h-full origin-left bg-acid" />
          </div>
          <p className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase opacity-60">
            <span>Do zero</span>
            <span>Ao primeiro emprego</span>
          </p>
        </div>
      </div>
    </section>
  )
}
