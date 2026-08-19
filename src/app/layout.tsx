import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";

/** Self-hosted variable fonts (Fontsource) — no external Google Fonts calls. */
const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const jetbrains = localFont({
  src: "../fonts/JetBrainsMonoVariable.woff2",
  variable: "--font-mono",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "INTENT — Know the Intent. See the Signal.",
  description:
    "INTENT — forensic intelligence for crypto data. Know the Intent. See the Signal. Decision Briefs, Edge Radar, calibration track record & AI Content Studio.",
  openGraph: { images: ["/media/og-intent.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans min-h-screen`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
