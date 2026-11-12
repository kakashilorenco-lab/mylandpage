import { useLayoutEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, useMotion } from './lib/gsap'
import { fadeReveal, splitReveal } from './lib/motion'
import Nav from './components/Nav'
import Hero from './sections/Hero'
import Problem from './sections/Problem'
import Method from './sections/Method'
import Mentor from './sections/Mentor'
import Proof from './sections/Proof'
import Pricing from './sections/Pricing'
import Faq from './sections/Faq'
import Closing from './sections/Closing'

export default function App() {
  const page = useRef(null)
  const [theme, setTheme] = useState('light')

  // Tema: seções marcadas com [data-dark] escurecem a página enquanto cruzam o meio da tela.
  // Roda depois dos efeitos das seções, então os pins já estão medidos.
  useLayoutEffect(() => {
    const triggers = gsap.utils.toArray('[data-dark]', page.current).map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => setTheme(self.isActive ? 'dark' : 'light'),
      }),
    )
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => triggers.forEach((t) => t.kill())
  }, [])

  useMotion(page, () => {
    splitReveal(page.current)
    fadeReveal(page.current)

    // Scroll suave, sincronizado com o ticker do GSAP
    const lenis = new Lenis({ anchors: true, lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  })

  return (
    <div ref={page} className="page" data-theme={theme}>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Method />
        <Mentor />
        <Proof />
        <Pricing />
        <Faq />
      </main>
      <Closing />
    </div>
  )
}
