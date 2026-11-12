import { useRef } from 'react'
import { gsap, SplitText, useMotion } from '../lib/gsap'
import { floatCards, popCards } from '../lib/motion'
import { RIBBONS } from '../lib/shapes'
import { Button, Dot, FloatCard, Ribbon } from '../components/ui'

const COLS = [
  ['Curso', ['Método', 'Ementa', 'Mentoria', 'Planos']],
  ['Escola', ['Sobre', 'Alunos', 'Blog', 'Contato']],
  ['Legal', ['Termos', 'Privacidade']],
]

// CTA final + footer: um único bloco dark, para a transição de tema acontecer uma vez só.
export default function Closing() {
  const root = useRef(null)

  useMotion(root, (cond) => {
    const el = root.current
    const cta = el.querySelector('.cta')
    const cleanup = floatCards(cta, cond)
    popCards(cta, cta, 'top 55%')

    gsap.fromTo(
      '.ribbon-cta',
      { drawSVG: '0%' },
      { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: cta, start: 'top 80%', end: 'bottom 60%', scrub: 1 } },
    )
    gsap.to(cta.querySelectorAll('.float-card'), {
      y: (i, c) => -80 * Number(c.dataset.depth),
      ease: 'none',
      scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom top', scrub: 1 },
    })

    // wordmark: letras sobem conforme o footer aparece, a fita atravessa por cima
    const st = { trigger: '.wordmark', start: 'top 100%', end: 'bottom 100%', scrub: 1 }
    SplitText.create('.wordmark', {
      type: 'chars',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.chars, { yPercent: 110, ease: 'power2.out', stagger: 0.06, scrollTrigger: st }),
    })
    gsap.fromTo('.ribbon-footer', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { ...st, start: 'top 90%' } })
    return cleanup
  })

  return (
    <div ref={root} data-dark className="theme-bg relative overflow-clip">
      <section className="cta relative flex min-h-[110svh] items-center justify-center px-5 py-32">
        <Ribbon d={RIBBONS.cta} pathClass="ribbon-cta" className="top-1/2 -translate-y-1/2" />
        <div className="relative text-center">
          <p data-reveal className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">
            <Dot /> Vagas limitadas · Turma 01
          </p>
          <h2 data-split className="display text-[clamp(3.4rem,11vw,10rem)]">
            Comece com <em>uma linha.</em>
          </h2>
          <div data-reveal className="mt-10 flex justify-center">
            <Button variant="acid">Garantir minha vaga</Button>
          </div>
        </div>

        <FloatCard className="top-[16%] left-[6%] md:left-[18%]" depth={1.3}>
          <p className="font-mono text-[10px] uppercase opacity-50">Início</p>
          <p className="font-medium">Próxima turma · 00/00</p>
        </FloatCard>
        <FloatCard className="top-[22%] right-[5%] md:right-[17%]" depth={0.8}>
          <p className="flex items-center gap-2 font-medium"><Dot /> 7 dias de garantia</p>
        </FloatCard>
        <FloatCard className="bottom-[16%] left-[8%] md:left-[22%]" depth={0.9}>
          <p className="font-mono text-[11px]"><span className="opacity-50">$</span> npm run carreira</p>
        </FloatCard>
        <FloatCard className="right-[6%] bottom-[20%] md:right-[20%]" depth={1.5}>
          <p className="font-serif text-3xl leading-none">26</p>
          <p className="opacity-55">semanas até o portfólio</p>
        </FloatCard>
      </section>

      <footer className="relative px-5 pt-16 md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-t hairline pt-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <p className="max-w-xs text-sm leading-relaxed opacity-60">
            HackSchool — escola de tecnologia para quem quer construir de verdade. Conteúdo de
            demonstração.
          </p>
          {COLS.map(([title, links]) => (
            <div key={title}>
              <p className="mb-4 font-mono text-[10px] tracking-[0.14em] uppercase opacity-50">{title}</p>
              <ul className="space-y-2 text-sm">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#top" className="opacity-80 transition-opacity hover:opacity-100">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-clip">
          <p aria-hidden className="wordmark display pb-[0.12em] text-center text-[21vw] leading-[0.9] whitespace-nowrap">
            Hack<em>School</em>
          </p>
          <Ribbon d={RIBBONS.footer} height={470} pathClass="ribbon-footer" className="!w-full" />
        </div>
        <p className="py-6 text-center font-mono text-[10px] tracking-[0.14em] uppercase opacity-50">
          © 2026 HackSchool · Demo
        </p>
      </footer>
    </div>
  )
}
