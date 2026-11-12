import { useRef } from 'react'
import { gsap, ScrollTrigger, useMotion } from '../lib/gsap'

const LINKS = [
  ['Método', '#metodo'],
  ['Mentoria', '#mentoria'],
  ['Alunos', '#alunos'],
  ['Planos', '#oferta'],
]

// Branco + blend difference: o nav se adapta sozinho às seções light e dark.
export default function Nav() {
  const ref = useRef(null)

  useMotion(ref, () => {
    gsap.from(ref.current, { yPercent: -120, duration: 1.2, ease: 'soft', delay: 0.2 })
    const show = gsap.quickTo(ref.current, 'yPercent', { duration: 0.7, ease: 'power3.out' })
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => show(self.direction === 1 && self.scroll() > 240 ? -120 : 0),
    })
  })

  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-50 text-white mix-blend-difference">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:h-20 md:px-10">
        <a href="#top" className="font-serif text-2xl tracking-tight">
          Hack<em>School</em>
        </a>
        <ul className="hidden items-center gap-8 text-sm md:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <a href={href} className="group relative py-1">
                {label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current transition-transform duration-500 ease-out group-hover:origin-left group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>
        <a href="#oferta" className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-black">
          Matricule-se
        </a>
      </nav>
    </header>
  )
}
