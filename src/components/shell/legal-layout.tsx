"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-10">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Scale className="h-3.5 w-3.5" /> INTENT
      </div>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("legal.updated")} {updated} · {t("legal.scope")}
      </p>
      <div className="prose-sm mt-6 space-y-5 text-sm leading-relaxed text-foreground/90 [&_h2]:text-base [&_h2]:font-bold [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <div className="mt-10 border-t border-white/10 pt-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link> ·{" "}
        <Link href="/terms" className="hover:text-foreground">Terms</Link> ·{" "}
        <Link href="/about" className="hover:text-foreground">About</Link> ·{" "}
        <a href="mailto:privacy@cif.local" className="hover:text-foreground">privacy@cif.local</a>
      </div>
    </div>
  );
}
