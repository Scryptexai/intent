"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Trust architecture §3.1 — one-click path from any surfaced claim to its raw
 * citation: Evidence Level + provenance + dossier passage + source link.
 */
export function CitationPanel({
  level,
  provenance,
  passage,
  href,
  defaultOpen = false,
}: {
  level: "HIGH" | "MED" | "LOW";
  provenance: string;
  passage: string;
  href?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const variant = level === "HIGH" ? "success" : level === "MED" ? "amber" : "danger";
  return (
    <div className="mt-2 rounded-md border border-white/10 bg-black/20">
      <button
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[10px] text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <FileSearch className="h-3 w-3" />
          <Badge variant={variant}>{level}</Badge>
          <span className="truncate">{provenance}</span>
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-white/10 px-2.5 py-2">
          <p className="mono text-[10px] leading-relaxed text-muted-foreground/90">“{passage}”</p>
          {href && (
            <a className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-intent-teal hover:underline" href={href} target="_blank" rel="noreferrer noopener">
              Open full dossier <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
