import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Choose your floor — The Tower",
  description: "Pick a floor of the tower and step inside the residence.",
};

export const viewport: Viewport = {
  themeColor: "#0b2b44",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Substitute for the source typeface (identified visually, not confirmed) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@200;300;400;500;600&display=swap" />
        <link rel="preload" as="image" href="/sites/torre/tower.jpg" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
