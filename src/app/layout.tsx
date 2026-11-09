import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

// Jost: sans geométrica fina, parente direta do traço do logotipo.
// Atenção: o "A" da Jost tem barra — a palavra VALENTIM é sempre o SVG.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ótica Valentim — A clareza como assinatura",
    template: "%s — Ótica Valentim",
  },
  description:
    "Optometria precisa e armações escolhidas com critério. Veja com clareza.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={jost.variable}>
      <body>{children}</body>
    </html>
  );
}
