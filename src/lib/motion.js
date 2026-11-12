import { gsap, ScrollTrigger, SplitText, SPRING } from './gsap'

/** Headlines: linhas sobem de dentro de uma máscara. Marque com [data-split]. */
export function splitReveal(scope) {
  gsap.utils.toArray('[data-split]', scope).forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          rotation: 3,
          transformOrigin: '0% 100%',
          duration: 1.25,
          ease: 'soft',
          stagger: 0.09,
          delay: Number(el.dataset.split) || 0,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    })
  })
}

/** Blocos secundários: fade + subida curta, em lote. Marque com [data-reveal]. */
export function fadeReveal(scope) {
  const els = gsap.utils.toArray('[data-reveal]', scope)
  if (!els.length) return
  gsap.set(els, { autoAlpha: 0, y: 28 })
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: 'soft', stagger: 0.08 }),
  })
}

/** Desenha uma fita conforme o scroll passa pela seção. */
export function scrubDraw(path, trigger, { start = 'top 75%', end = 'bottom 35%' } = {}) {
  return gsap.fromTo(
    path,
    { drawSVG: '0%' },
    { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger, start, end, scrub: 1 } },
  )
}

/**
 * Cards flutuantes: três camadas de transform independentes.
 *  .float-card → parallax de scroll (controlado pela seção)
 *  .fc-mouse   → parallax do ponteiro + entrada
 *  .fc-idle    → flutuação ociosa + hover com mola
 */
export function floatCards(scope, { fine }) {
  const cards = gsap.utils.toArray('.float-card', scope)
  const cleanups = []

  const idles = cards.map((card, i) =>
    gsap.to(card.querySelector('.fc-idle'), {
      y: gsap.utils.random(-16, -8),
      rotation: gsap.utils.random(-2.5, 2.5),
      duration: gsap.utils.random(2.6, 4.2),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: i * 0.17,
    }),
  )
  // não gasta frames com o que está fora da tela
  ScrollTrigger.create({
    trigger: scope,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => idles.forEach((t) => (self.isActive ? t.resume() : t.pause())),
  })

  if (fine) {
    cards.forEach((card) => {
      const idle = card.querySelector('.fc-idle')
      const enter = () => gsap.to(idle, { scale: 1.07, duration: 0.9, ease: 'elastic.out(1, 0.45)' })
      const leave = () => gsap.to(idle, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)' })
      card.addEventListener('pointerenter', enter)
      card.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        card.removeEventListener('pointerenter', enter)
        card.removeEventListener('pointerleave', leave)
      })
    })

    const movers = cards.map((card) => {
      const el = card.querySelector('.fc-mouse')
      const depth = Number(card.dataset.depth) || 1
      return {
        depth,
        x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.out' }),
      }
    })
    const move = (e) => {
      const r = scope.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      movers.forEach((m) => {
        m.x(nx * -34 * m.depth)
        m.y(ny * -26 * m.depth)
      })
    }
    scope.addEventListener('pointermove', move)
    cleanups.push(() => scope.removeEventListener('pointermove', move))
  }

  return () => cleanups.forEach((fn) => fn())
}

/** Entrada com mola para os cards flutuantes de uma seção. */
export function popCards(scope, trigger, start = 'top 65%') {
  return gsap.from(scope.querySelectorAll('.fc-mouse'), {
    scale: 0,
    autoAlpha: 0,
    duration: 1.3,
    ease: SPRING,
    stagger: 0.09,
    scrollTrigger: { trigger, start, once: true },
  })
}
