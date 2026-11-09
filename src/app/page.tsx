import Link from "next/link";
import { Wordmark } from "@/components/brand";

// Página de espera até o marco 2 (Home). Não é o design final.
export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-12 px-6 text-center">
      <h1 className="w-full max-w-[34rem]">
        <Wordmark descriptor className="w-full" />
      </h1>
      <p className="t-micro text-mist">A clareza como assinatura</p>
      <Link href="/style-tile" className="t-micro hairline-link">
        Ver style tile
      </Link>
    </main>
  );
}
