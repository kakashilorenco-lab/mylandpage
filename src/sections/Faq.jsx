import { useRef, useState } from 'react'
import { gsap, prefersReduced } from '../lib/gsap'
import { Eyebrow } from '../components/ui'

const ITEMS = [
  ['Preciso saber programar para começar?', 'Resposta placeholder — o curso parte do zero e avança no seu ritmo, com exercícios desde a primeira aula.'],
  ['Quanto tempo por semana devo dedicar?', 'Resposta placeholder — recomendamos de 6 a 8 horas semanais para acompanhar a trilha com folga.'],
  ['Por quanto tempo tenho acesso?', 'Resposta placeholder — o acesso ao conteúdo gravado é vitalício, incluindo atualizações.'],
  ['E se eu não gostar?', 'Resposta placeholder — você tem 7 dias de garantia incondicional, com reembolso integral.'],
]

export default function Faq() {
  const [open, setOpen] = useState(0)
  const panels = useRef([])

  const toggle = (i) => {
    const next = open === i ? -1 : i
    const duration = prefersReduced() ? 0 : 0.7
    panels.current.forEach((panel, j) => {
      gsap.to(panel, { height: j === next ? 'auto' : 0, duration, ease: 'soft' })
      gsap.to(panel.firstElementChild, { autoAlpha: j === next ? 1 : 0, y: j === next ? 0 : -8, duration: duration * 0.8 })
    })
    setOpen(next)
  }

  return (
    <section className="theme-bg relative py-24 md:py-32">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:grid-cols-[1fr_1.4fr] md:px-10">
        <div>
          <Eyebrow className="mb-6">Dúvidas</Eyebrow>
          <h2 data-split className="display text-[clamp(2.4rem,5vw,4.5rem)]">
            Antes de <em>você perguntar.</em>
          </h2>
        </div>
        <ul>
          {ITEMS.map(([q, a], i) => (
            <li key={q} data-reveal className="border-t hairline last:border-b">
              <button
                onClick={() => toggle(i)}
                aria-expanded={open === i}
                className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left font-serif text-2xl md:text-3xl"
              >
                {q}
                <span className={`relative size-4 shrink-0 transition-transform duration-700 ${open === i ? 'rotate-[135deg]' : ''}`}>
                  <span className="absolute top-1/2 h-px w-full bg-current" />
                  <span className="absolute left-1/2 h-full w-px bg-current" />
                </span>
              </button>
              <div
                ref={(el) => (panels.current[i] = el)}
                className="overflow-hidden"
                style={{ height: i === 0 ? 'auto' : 0 }}
              >
                <p className="max-w-lg pb-7 leading-relaxed opacity-70" style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}>
                  {a}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
