import { useRef } from 'react'
import { gsap, useMotion, SPRING } from '../lib/gsap'
import { floatCards, popCards, scrubDraw } from '../lib/motion'
import { RIBBONS } from '../lib/shapes'
import { Dot, Eyebrow, FloatCard, Ribbon } from '../components/ui'

export default function Mentor() {
  const root = useRef(null)

  useMotion(root, (cond) => {
    const el = root.current
    const cleanup = floatCards(el, cond)
    scrubDraw('.ribbon-path', el)
    popCards(el, '.chat')

    // a conversa acontece: pergunta → digitando → resposta linha a linha
    gsap
      .timeline({ scrollTrigger: { trigger: '.chat', start: 'top 72%', once: true } })
      .from('.chat', { y: 80, autoAlpha: 0, scale: 0.92, duration: 1.3, ease: SPRING })
      .from('.chat-q', { scale: 0, transformOrigin: '100% 100%', duration: 0.9, ease: SPRING }, 0.35)
      .from('.chat-typing', { autoAlpha: 0, y: 8, duration: 0.3 }, 0.9)
      .to('.chat-typing', { autoAlpha: 0, height: 0, marginTop: 0, duration: 0.3 }, 1.7)
      .from('.chat-a', { scale: 0, transformOrigin: '0% 100%', duration: 0.9, ease: SPRING }, 1.8)
      .from('.chat-line', { autoAlpha: 0, y: 10, duration: 0.5, ease: 'soft', stagger: 0.14 }, 2)

    gsap.to('.typing-dot', { y: -4, duration: 0.4, ease: 'sine.inOut', repeat: 5, yoyo: true, stagger: 0.12, scrollTrigger: { trigger: '.chat', start: 'top 72%', once: true } })
    gsap.to('.float-card', {
      y: (i, c) => -70 * Number(c.dataset.depth),
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
    })
    return cleanup
  })

  return (
    <section ref={root} id="mentoria" className="theme-bg relative overflow-clip py-28 md:py-44">
      <Ribbon d={RIBBONS.mentor} height={1000} />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-16 px-5 md:grid-cols-2 md:px-10">
        <div>
          <Eyebrow className="mb-6">Mentoria</Eyebrow>
          <h2 data-split className="display text-[clamp(2.7rem,6.4vw,6rem)]">
            Pergunte <em>qualquer coisa.</em>
          </h2>
          <p data-reveal className="mt-6 max-w-sm leading-relaxed opacity-70">
            Travou? Você nunca fica sozinho com o erro. Mentores, comunidade e revisão de código
            acompanham cada entrega.
          </p>
          <ul className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-6 text-sm">
            {[
              ['24h', 'para ter seu código revisado'],
              ['1:1', 'sessões individuais mensais'],
              ['2×', 'aulas ao vivo por semana'],
              ['∞', 'acesso à comunidade'],
            ].map(([n, t]) => (
              <li key={n} data-reveal className="border-t hairline pt-3">
                <span className="font-serif text-4xl">{n}</span>
                <p className="mt-1 opacity-60">{t}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] py-10">
          <div className="chat card relative z-20 p-5">
            <div className="mb-5 flex items-center gap-2 border-b border-black/10 pb-4 text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-ink font-serif text-card italic">H</span>
              <span className="font-medium">Mentoria HackSchool</span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase opacity-60">
                <Dot /> online
              </span>
            </div>
            <div className="flex flex-col text-sm">
              <p className="chat-q max-w-[80%] self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-card">
                Por que meu componente renderiza duas vezes?
              </p>
              <div className="chat-typing mt-3 flex h-8 w-14 items-center justify-center gap-1 self-start overflow-hidden rounded-full bg-black/5 motion-reduce:hidden">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot size-1.5 rounded-full bg-ink/50" />
                ))}
              </div>
              <div className="chat-a mt-3 max-w-[90%] space-y-2 self-start rounded-2xl rounded-bl-md bg-black/5 px-4 py-3">
                <p className="chat-line">Boa pergunta — isso é o modo estrito em desenvolvimento.</p>
                <p className="chat-line opacity-70">Ele monta duas vezes de propósito, para revelar efeitos sem limpeza.</p>
                <p className="chat-line rounded-lg bg-ink px-3 py-2 font-mono text-[11px] text-acid">return () =&gt; controller.abort()</p>
                <p className="chat-line opacity-70">Deixei um comentário no seu PR com o ajuste.</p>
              </div>
            </div>
          </div>

          <FloatCard className="-top-2 -left-2 md:-left-16" depth={1.3}>
            <p className="font-mono text-[10px] uppercase opacity-50">Pull request #12</p>
            <p className="flex items-center gap-2 font-medium"><Dot /> Aprovado com sugestões</p>
          </FloatCard>
          <FloatCard className="-right-2 -bottom-4 md:-right-14" depth={0.8}>
            <p className="font-medium">Plantão de dúvidas</p>
            <p className="opacity-55">Seg a sex · 19h–22h</p>
          </FloatCard>
        </div>
      </div>
    </section>
  )
}
