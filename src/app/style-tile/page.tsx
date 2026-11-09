import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CircleMark, Lambda, Wordmark } from "@/components/brand";
import { EASE_PATH } from "@/motion/tokens";
import { FocusDemo } from "./FocusDemo";
import { LensDemo } from "./LensDemo";

export const metadata: Metadata = {
  title: "Style tile",
  robots: { index: false },
};

const COLORS = [
  { name: "ink", hex: "#000000", use: "Tela principal", note: "—" },
  { name: "carbon", hex: "#0E0E0F", use: "Superfícies elevadas", note: "—" },
  { name: "graphite", hex: "#2A2A2C", use: "Fios de 1px", note: "só bordas" },
  { name: "mist", hex: "#8C8C90", use: "Texto secundário", note: "6.27:1 no preto" },
  { name: "slate", hex: "#5C5C60", use: "Secundário na pérola", note: "5.94:1 · proposta" },
  { name: "pearl", hex: "#F2F2F0", use: "Luz do dia", note: "18.7:1 com preto" },
  { name: "white", hex: "#FFFFFF", use: "Texto e marca", note: "21:1 no preto" },
] as const;

function Section({
  n,
  title,
  children,
  className = "",
}: {
  n: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-graphite ${className}`}>
      <div className="grid-editorial py-16 md:py-24">
        <header className="col-span-12 mb-12 flex items-center gap-4 md:col-span-3 md:mb-0 md:items-start">
          <Lambda className="mt-[0.15em] h-[0.7em] w-auto text-[0.6875rem]" />
          <h2 className="t-micro">
            <span className="opacity-60">{n}</span>
            <span className="mx-3 opacity-60">/</span>
            {title}
          </h2>
        </header>
        <div className="col-span-12 md:col-span-9">{children}</div>
      </div>
    </section>
  );
}

function EaseCurve({ name, d, note }: { name: string; d: string; note: string }) {
  // Path do CustomEase (0–1, y para cima) desenhado num quadro 100×100.
  const flipped = d.replace(
    /(-?[\d.]+),(-?[\d.]+)/g,
    (_, x: string, y: string) => `${+x * 100},${100 - +y * 100}`,
  );
  return (
    <figure>
      <svg viewBox="-1 -1 102 102" className="aspect-square w-full border border-graphite">
        <path d="M0,100 L100,0" className="stroke-graphite" strokeWidth="0.5" fill="none" />
        <path d={flipped} stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
      <figcaption className="mt-4">
        <span className="t-micro block">{name}</span>
        <span className="mt-1 block text-sm text-mist">{note}</span>
      </figcaption>
    </figure>
  );
}

export default function StyleTile() {
  return (
    <main>
      {/* Abertura — simetria central, como no logotipo */}
      <header className="flex min-h-svh flex-col items-center justify-between px-6 py-10 text-center">
        <p className="t-micro text-mist">Style tile · v0.1</p>
        <div className="flex w-full flex-col items-center gap-14">
          <h1 className="w-full max-w-[52rem]">
            <Wordmark descriptor className="w-full" />
          </h1>
          <p className="t-micro">A clareza como assinatura</p>
        </div>
        <p className="t-micro text-mist">Preto é a tela · Branco é a luz</p>
      </header>

      <Section n="01" title="Marca">
        <div className="grid grid-cols-1 gap-px border border-graphite bg-graphite sm:grid-cols-2">
          <div className="grid aspect-square place-items-center bg-ink p-10">
            <CircleMark className="w-full max-w-[22rem]" />
          </div>
          <div className="grid aspect-square place-items-center bg-pearl p-10">
            <CircleMark tone="pearl" className="w-full max-w-[22rem]" />
          </div>
          <div className="flex flex-col items-center justify-center gap-10 bg-ink p-10 sm:col-span-2 sm:flex-row sm:justify-around">
            <div className="flex flex-col items-center gap-5">
              <Wordmark optical="display" decorative className="w-[min(70vw,26rem)]" />
              <span className="t-micro text-mist">Display · traço 2.4</span>
            </div>
            <div className="flex flex-col items-center gap-5">
              <Wordmark optical="text" decorative className="w-40" />
              <span className="t-micro text-mist">Texto · 4.2</span>
            </div>
            <div className="flex flex-col items-center gap-5">
              <Wordmark optical="micro" decorative className="w-24" />
              <span className="t-micro text-mist">Micro · 7</span>
            </div>
          </div>
        </div>
        <p className="mt-8 max-w-[38rem] text-mist">
          A assinatura é desenhada em traços, letra por letra. Por isso o
          preloader pode escrevê-la com DrawSVG, e por isso ela engrossa ao
          encolher, sem nunca perder a leveza.{" "}
          <span className="text-white">[[TODO: substituir pelo SVG oficial]]</span>
        </p>
      </Section>

      <Section n="02" title="O motivo Λ">
        <div className="grid grid-cols-2 gap-px border border-graphite bg-graphite md:grid-cols-4">
          <div className="flex aspect-square flex-col items-center justify-center gap-6 bg-ink p-6">
            <Lambda weight={2.4} className="h-24 w-auto" />
            <span className="t-micro text-mist">Glifo</span>
          </div>
          <div className="flex aspect-square flex-col items-center justify-center gap-6 bg-ink p-6">
            <ul className="space-y-3 text-left">
              {["Acetato italiano", "Titânio", "Aço cirúrgico"].map((m) => (
                <li key={m} className="flex items-baseline gap-3">
                  <Lambda className="h-[0.6em] w-auto shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
            <span className="t-micro text-mist">Marcador</span>
          </div>
          <div className="flex aspect-square flex-col items-center justify-center gap-6 bg-ink p-6">
            <div className="flex items-center gap-6">
              <span className="size-3 rounded-full border border-white" />
              <span className="size-14 rounded-full border border-white" />
              <Lambda weight={9} className="h-3 w-auto" />
            </div>
            <span className="t-micro text-mist">Cursor · anel, lente, Λ</span>
          </div>
          <div className="flex aspect-square flex-col items-center justify-center gap-6 bg-ink p-6">
            <CircleMark ringOnly decorative className="h-20 w-20" />
            <span className="t-micro text-mist">Círculo · íris</span>
          </div>
        </div>
      </Section>

      <Section n="03" title="Cor">
        <ul className="grid grid-cols-2 gap-px border border-graphite bg-graphite sm:grid-cols-4 lg:grid-cols-7">
          {COLORS.map((c) => (
            <li key={c.name} className="bg-ink">
              <div
                className="aspect-[4/5] border-b border-graphite"
                style={{ background: c.hex }}
              />
              <div className="p-4">
                <p className="t-micro">{c.name}</p>
                <p className="mt-2 text-sm text-mist">{c.hex}</p>
                <p className="text-sm text-mist">{c.use}</p>
                <p className="text-sm text-mist">{c.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[38rem] text-mist">
          Sem cor de destaque. A única cor do site vem das armações: tartaruga,
          ouro, acetato cristal.
        </p>
      </Section>

      <Section n="04" title="Tipografia">
        <div className="space-y-16">
          <div>
            <p className="t-micro mb-6 text-mist">Display · Jost 200 · 0.28em</p>
            <p className="font-extralight uppercase leading-[1.05] tracking-display text-[clamp(2rem,7.5vw,7.5rem)]">
              Tudo entra
              <br />
              em foco
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="t-micro mb-6 text-mist">Título · 200 · 0.2em</p>
              <p className="t-h2">Lentes sob medida</p>
            </div>
            <div>
              <p className="t-micro mb-6 text-mist">Subtítulo · 300 · 0.2em</p>
              <p className="t-h3">Exame de vista com hora marcada</p>
            </div>
          </div>
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="t-micro mb-6 text-mist">Corpo · 400 · 17px / 1.6</p>
              <p className="max-w-[32rem]">
                Cada rosto pede uma medida. Cada olhar, uma lente. Na Valentim,
                o exame é feito sem pressa e a armação é escolhida com você,
                diante do espelho, até que tudo pareça seu.
              </p>
              <p className="mt-4 max-w-[32rem] text-mist">
                Texto secundário em mist. Calmo, legível, nunca apagado.
              </p>
            </div>
            <div>
              <p className="t-micro mb-6 text-mist">Micro · 11px · 0.3em</p>
              <dl className="grid grid-cols-3 border-y border-graphite py-5">
                {[
                  ["Lente", "52 mm"],
                  ["Ponte", "18 mm"],
                  ["Haste", "145 mm"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="t-micro text-mist">{k}</dt>
                    <dd className="mt-2 text-xl font-light">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
                <a href="#" className="t-micro hairline-link">
                  Agendar exame
                </a>
                <a
                  href="#"
                  className="t-micro rounded-full border border-white px-7 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-white hover:text-ink"
                >
                  Experimentar virtualmente
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section n="05" title="Movimento · Foco">
        <div className="border border-graphite px-6 py-20">
          <FocusDemo />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <EaseCurve
            name="lensPull"
            d={EASE_PATH.lensPull}
            note="Rápida no início, assenta devagar. Entradas."
          />
          <EaseCurve
            name="settle"
            d={EASE_PATH.settle}
            note="Simétrica, pesada no fim. Cenas e íris."
          />
          <dl className="col-span-2 self-start border-t border-graphite">
            {[
              ["--dur-fast", "240ms", "Hover, sublinhados, cursor"],
              ["--dur-base", "700ms", "Entradas, máscaras de linha"],
              ["--dur-scene", "1.4s", "Íris, inversão, preloader"],
            ].map(([k, v, use]) => (
              <div
                key={k}
                className="grid grid-cols-[1fr_auto] gap-x-6 border-b border-graphite py-4"
              >
                <dt className="t-micro">{k}</dt>
                <dd className="t-micro">{v}</dd>
                <dd className="col-span-2 mt-1 text-sm text-mist">{use}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* Luz do dia — a seção invertida */}
      <section className="daylight">
        <div className="grid-editorial pt-16 md:pt-24">
          <header className="col-span-12 flex items-center gap-4">
            <Lambda className="h-[0.7em] w-auto text-[0.6875rem]" />
            <h2 className="t-micro">
              <span className="text-slate">06 / </span>Luz do dia · a lente
            </h2>
          </header>
        </div>
        <LensDemo />
        <div className="grid-editorial pb-16 md:pb-24">
          <p className="col-span-12 max-w-[38rem] text-slate md:col-start-4 md:col-span-6">
            Seções em pérola são raras: um instante de sol entre páginas
            escuras. Aqui o texto secundário usa slate, porque mist não passa
            em contraste sobre fundo claro.
          </p>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-10 px-6 py-24 text-center">
        <CircleMark decorative className="w-28" />
        <p className="t-micro text-mist">
          Ótica Valentim · [[TODO: CIDADE]] · Style tile para aprovação
        </p>
      </footer>
    </main>
  );
}
