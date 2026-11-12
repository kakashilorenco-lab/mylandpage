import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin, SplitText, CustomEase)

// Easings da casa
CustomEase.create('ink', '0.65, 0, 0.15, 1') // in-out com peso, para a fita
CustomEase.create('soft', '0.22, 1, 0.36, 1') // saída longa, para reveals
export const SPRING = 'elastic.out(1, 0.62)'
export const SPRING_SOFT = 'elastic.out(1, 0.8)'

export const REDUCED = '(prefers-reduced-motion: reduce)'
export const prefersReduced = () => window.matchMedia(REDUCED).matches

/**
 * Roda `fn` só quando o usuário aceita movimento. Tudo que for criado dentro
 * (tweens, ScrollTriggers, SplitText) é revertido no unmount ou quando a
 * media query muda. Sem movimento, o layout fica no estado final do CSS.
 */
export function useMotion(scope, fn, deps = []) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(scope)
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 768px)',
        fine: '(pointer: fine)',
      },
      (ctx) => (ctx.conditions.motion ? fn(ctx.conditions) : undefined),
    )
    return () => mm.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export { gsap, ScrollTrigger, SplitText }
