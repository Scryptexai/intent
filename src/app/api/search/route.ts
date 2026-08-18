import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q= — global typeahead across the catalog:
 * projects · registry patterns · entities · narratives · decision events.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const s = getStore();
  const cap = 6;
  const results: { type: string; label: string; sub: string; href: string }[] = [];

  for (const p of s.projects) {
    if (results.filter((r) => r.type === "project").length >= cap) break;
    if (p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.category.toLowerCase().includes(q)) {
      results.push({ type: "project", label: p.name, sub: p.category, href: `/project/${p.slug}` });
    }
  }
  for (const pat of s.cif?.patterns ?? []) {
    if (results.filter((r) => r.type === "pattern").length >= cap) break;
    if (pat.nm.toLowerCase().includes(q) || pat.id.toLowerCase() === q) {
      results.push({ type: "pattern", label: `${pat.id} · ${pat.nm}`, sub: `${pat.instances} instances · ${pat.confidence}`, href: `/mirror` });
    }
  }
  for (const [project, list] of Object.entries(s.cif?.entities ?? {})) {
    for (const e of list) {
      if (results.filter((r) => r.type === "entity").length >= cap) break;
      if ((e.name ?? "").toLowerCase().includes(q)) {
        results.push({ type: "entity", label: e.name ?? "", sub: `${e.type} · ${project}`, href: `/project/${project.toLowerCase()}` });
      }
    }
  }
  for (const n of s.narratives) {
    if (results.filter((r) => r.type === "narrative").length >= cap) break;
    if (n.title.toLowerCase().includes(q)) results.push({ type: "narrative", label: n.title, sub: `heat ${(n.heat * 100).toFixed(0)}`, href: `/origin` });
  }
  for (const [project, des] of Object.entries(s.cif?.decisionEvents ?? {})) {
    for (const de of des) {
      if (results.filter((r) => r.type === "decision").length >= cap) break;
      if (de.title.toLowerCase().includes(q)) results.push({ type: "decision", label: de.title, sub: project, href: `/project/${project.toLowerCase()}` });
    }
  }
  return NextResponse.json({ results: results.slice(0, 24) });
}
