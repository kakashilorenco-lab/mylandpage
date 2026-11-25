import { ScrollVideo } from "@/components/scroll-video/ScrollVideo";

export const metadata = { title: "Scroll video demo" };

// Demo: the fly-in clip from the cloned tower site, scrubbed by scroll.
export default function ScrollDemo() {
  return (
    <main style={{ background: "#05070a", color: "#fff", fontFamily: "var(--font-sans)" }}>
      <ScrollVideo
        src="/scroll/torre-demo/manifest.json"
        length={6}
        sections={[
          { from: 0, to: 0.22, eyebrow: "Abu Dhabi · The Corniche", title: "A tower on the water" },
          { from: 0.3, to: 0.55, title: "Rise to level 14", text: "Thirty-two floors over the old harbour. Scroll to fly up the glass." },
          { from: 0.66, to: 0.82, align: "right", title: "Through the glass", text: "The living room opens onto the terrace." },
          { from: 0.88, to: 1, title: "The primary bathroom", text: "A stone bath against lit travertine, beside a window to the sea." },
        ]}
      />
      <section style={{ minHeight: "60dvh", display: "grid", placeItems: "center", padding: 24 }}>
        <p style={{ opacity: 0.7 }}>End of the sequence — the page continues normally from here.</p>
      </section>
    </main>
  );
}
