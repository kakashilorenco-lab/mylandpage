import { useRef } from 'react'
import { gsap, ScrollTrigger, useMotion } from '../lib/gsap'
import { Eyebrow } from '../components/ui'

const STATS = [
  [2400, '+', 'alunos formados'],
  [94, '%', 'concluem o curso'],
  [87, '%', 'empregados em 6 meses'],
  [4.9, '', 'nota média', 1],
]

const QUOTES = Array.from({ length: 8 }, (_, i) => ({
  text: [
    'Depoimento — em poucas semanas eu já tinha um projeto real no ar e confiança para mostrar.',
    'Depoimento — a mentoria mudou a forma como eu estudo. Nunca mais fiquei travado sozinho.',
    'Depoimento — saí de tutoriais soltos para um portfólio que rendeu três entrevistas.',
    'Depoimento — o método é direto: constrói, recebe revisão, melhora. Simples assim.',
  ][i % 4],
  name: `Aluno ${String(i + 1).padStart(2, '0')}`,
  role: ['Dev Front-end', 'Dev Full-stack', 'Engenheira de Software', 'Dev Back-end'][i % 4],
}))

function Row({ items, className }) {
  // conteúdo duplicado para o loop ser contínuo
  return (
    <div className={`marquee motion-reduce:overflow-x-auto ${className}`}>
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-4 pr-4 md:gap-6 md:pr-6">
            {items.map((q) => (
              <li key={q.name} className="card flex w-[300px] flex-col justify-between p-6 md:w-[380px]">
                <p className="font-serif text-[22px] leading-snug md:text-2xl">“{q.text}”</p>
                <div className="mt-8 flex items-center gap-3 text-sm">
                  <span className="grid size-9 place-items-center rounded-full bg-ink font-serif text-card italic">{q.name.at(-1)}</span>
                  <div>
                    <p className="font-medium">{q.name}</p>
                    <p className="opacity-55">{q.role}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

export default function Proof() {
  const root = useRef(null)

  useMotion(root, () => {
    const el = root.current

    // contadores
    gsap.utils.toArray('.stat-num', el).forEach((node) => {
      const end = Number(node.dataset.value)
      const decimals = Number(node.dataset.decimals || 0)
      const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      const state = { v: 0 }
      gsap.to(state, {
        v: end,
        duration: 2.2,
        ease: 'power3.out',
        onUpdate: () => (node.textContent = fmt(state.v)),
        scrollTrigger: { trigger: node, start: 'top 88%', once: true },
      })
    })

    // marquee: velocidade e direção reagem ao scroll
    const loops = gsap.utils.toArray('.marquee-track', el).map((track, i) => {
      const dir = i % 2 ? 1 : -1
      const tween = gsap.fromTo(
        track,
        { xPercent: dir === -1 ? 0 : -50 },
        { xPercent: dir === -1 ? -50 : 0, duration: 46, ease: 'none', repeat: -1 },
      )
      return tween
    })
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => loops.forEach((t) => (self.isActive ? t.resume() : t.pause())),
      onUpdate: (self) => {
        const v = self.getVelocity()
        const boost = gsap.utils.clamp(1, 7, 1 + Math.abs(v) / 250) * (v < 0 ? -1 : 1)
        gsap.to(loops, { timeScale: boost, duration: 0.25, overwrite: true })
        gsap.to(loops, { timeScale: v < 0 ? -1 : 1, duration: 1.4, delay: 0.25 })
        gsap.to('.marquee', { skewX: gsap.utils.clamp(-6, 6, v / -500), duration: 0.4, overwrite: true })
        gsap.to('.marquee', { skewX: 0, duration: 1.2, delay: 0.3, ease: 'elastic.out(1, 0.5)' })
      },
    })
  })

  return (
    <section ref={root} id="alunos" className="theme-bg relative overflow-clip py-28 md:py-40">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <Eyebrow className="mb-6">Resultados</Eyebrow>
        <h2 data-split className="display max-w-4xl text-[clamp(2.7rem,6.4vw,6rem)]">
          Quem começou com uma linha <em>não parou mais.</em>
        </h2>
        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {STATS.map(([value, suffix, label, decimals]) => (
            <div key={label} data-reveal className="border-t hairline pt-4">
              <dd className="font-serif text-[clamp(2.6rem,5vw,4.5rem)] leading-none">
                <span className="stat-num" data-value={value} data-decimals={decimals}>
                  {value.toLocaleString('pt-BR')}
                </span>
                <em>{suffix}</em>
              </dd>
              <dt className="mt-2 text-sm opacity-60">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-20 space-y-4 md:space-y-6">
        <Row items={QUOTES.slice(0, 4)} />
        <Row items={QUOTES.slice(4)} />
      </div>
    </section>
  )
}
