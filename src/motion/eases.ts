import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { EASE_PATH } from "./tokens";

let registered = false;

/**
 * Registra as curvas da marca no GSAP. Idempotente; chame antes de qualquer
 * tween que use `ease: "lensPull"` ou `ease: "settle"`.
 */
export function registerEases(): void {
  if (registered) return;
  gsap.registerPlugin(CustomEase);
  CustomEase.create("lensPull", EASE_PATH.lensPull);
  CustomEase.create("settle", EASE_PATH.settle);
  registered = true;
}
