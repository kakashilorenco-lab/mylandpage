import { useRef } from 'react'
import { gsap, useMotion, SPRING } from '../lib/gsap'
import { scrubDraw } from '../lib/motion'
import { RIBBONS } from '../lib/shapes'
import { Button, Dot, Eyebrow, Ribbon } from '../components/ui'

const PLANS = [
  { name: 'Essencial', price: '000', note: 'ou 12× de R$ 00', items: ['Todos os módulos gravados', 'Projetos guiados', 'Comunidade', 'Certificado'] },
  { name: 'Completo', price: '000', note: 'ou 12× de R$ 00', featured: true, items: ['Tudo do Essencial', 'Aulas ao vivo semanais', 'Code review em 24h', 'Plantão de dúvidas', 'Projeto final avaliado'] },
  { name: 'Mentoria', price: '000', note: 'ou 12× de R$ 00', items: ['Tudo do Completo', 'Sessões 1:1 mensais', 'Revisão de portfólio', 'Simulação de entrevistas'] },
]

export default function Pricing() {
  const root = useRef(null)

  useMotion(root, ({ fine }) => {
    const el = root.current
    scrubDraw('.ribbon-path', el)

    gsap.from('.plan', {
      y: 140,
      rotation: (i) => [-7, 0, 7][i],
      autoAlpha: 0,
      duration: 1.5,
      ease: SPRING,
      stagger: 0.12,
      scrollTrigger: { trigger: '.plans', start: 'top 78%', once: true },
    })

    if (!fine) return
    // tilt 3D: o card inclina na direção do ponteiro e volta com mola
    const cleanups = gsap.utils.toArray('.plan-inner', el).map((card) => {
      gsap.set(card, { transformPerspective: 900 })
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' })
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
      const move = (e) => {
        const r = card.getBoundingClientRect()
        ry(((e.clientX - r.left) / r.width - 0.5) * 12)
        rx(((e.clientY - r.top) / r.height - 0.5) * -10)
      }
      const leave = () => gsap.to(card, { rotationX: 0, rotationY: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)' })
      card.addEventListener('pointermove', move)
      card.addEventListener('pointerleave', leave)
      return () => {
        card.removeEventListener('pointermove', move)
        card.removeEventListener('pointerleave', leave)
      }
    })
    return () => cleanups.forEach((fn) => fn())
  })

  return (
    <section ref={root} id="oferta" className="theme-bg relative overflow-clip py-28 md:py-40">
      <Ribbon d={RIBBONS.pricing} height={800} />
      <div className="relative mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="text-center">
          <Eyebrow className="mb-6 justify-center">A oferta</Eyebrow>
          <h2 data-split className="display mx-auto max-w-3xl text-[clamp(2.7rem,6.4vw,6rem)]">
            Um investimento. <em>Uma carreira inteira.</em>
          </h2>
        </div>

        <div className="plans relative z-20 mt-16 grid items-end gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className="plan">
              <article
                className={`plan-inner card flex flex-col p-7 ${p.featured ? '!bg-ink !text-paper md:pt-10 md:pb-9' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-3xl">{p.name}</h3>
                  {p.featured && (
                    <span className="rounded-full bg-acid px-3 py-1 font-mono text-[10px] text-ink uppercase">Mais escolhido</span>
                  )}
                </div>
                <p className="mt-8 font-serif text-7xl leading-none">
                  <span className="align-top text-2xl opacity-60">R$ </span>
                  {p.price}
                </p>
                <p className="mt-2 text-sm opacity-55">{p.note}</p>
                <ul className={`my-8 space-y-2.5 border-t pt-6 text-sm ${p.featured ? 'border-white/15' : 'border-black/10'}`}>
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-2.5">
                      <Dot /> {it}
                    </li>
                  ))}
                </ul>
                <a
                  href="#top"
                  className={`mt-auto inline-flex h-12 items-center justify-center rounded-full text-sm font-medium transition-transform duration-500 hover:scale-[1.03] ${
                    p.featured ? 'bg-acid text-ink' : 'bg-ink text-paper'
                  }`}
                >
                  Quero o {p.name}
                </a>
              </article>
            </div>
          ))}
        </div>

        <p data-reveal className="mt-10 text-center text-sm opacity-60">
          Garantia incondicional de 7 dias · Pagamento seguro · Acesso imediato
        </p>
        <div className="mt-8 flex justify-center md:hidden">
          <Button>Garantir minha vaga</Button>
        </div>
      </div>
    </section>
  )
}
