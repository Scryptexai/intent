import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SearchHit {
  type: "project" | "pattern" | "decision" | "entity" | "narrative" | "knowledge";
  label: string;
  sub: string;
  href: string;
}

/**
 * GET /api/search?q= — global typeahead lintas katalog dengan deep-link
 * bermakna: project→/brief, pattern→brief analog teratas, decision→
 * /multiverse proyek, entity→dossier proyek, narrative→/origin,
 * knowledge→dossier proyek.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const s = getStore();
  const cap = 6;
  const results: SearchHit[] = [];
  const byType = (t: SearchHit["type"]) => results.filter((r) => r.type === t).length;
  const projByName = (name: string) => s.projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
  const projBySlugKey = (key: string) => s.projects.find((p) => p.slug === key.toLowerCase() || p.name.toLowerCase() === key.toLowerCase());

  for (const p of s.projects) {
    if (byType("project") >= cap) break;
    if (p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.category.toLowerCase().includes(q)) {
      results.push({ type: "project", label: p.name, sub: `${p.category} · ${p.isDemo || p.hero ? "brief terbuka" : "brief"}`, href: `/brief/${p.slug}` });
    }
  }

  for (const pat of s.cif?.patterns ?? []) {
    if (byType("pattern") >= cap) break;
    if (pat.nm.toLowerCase().includes(q) || pat.id.toLowerCase() === q) {
      const analog = (pat.analogs ?? []).map(projByName).find(Boolean);
      results.push({
        type: "pattern",
        label: `${pat.id} · ${pat.nm}`,
        sub: `${pat.instances} instances · ${pat.confidence}`,
        href: analog ? `/brief/${analog.slug}` : "/mirror",
      });
    }
  }

  for (const [project, des] of Object.entries(s.cif?.decisionEvents ?? {})) {
    for (const de of des) {
      if (byType("decision") >= cap) break;
      if (de.title.toLowerCase().includes(q)) {
        const pj = projBySlugKey(project);
        results.push({ type: "decision", label: de.title, sub: project, href: pj ? `/multiverse?projectId=${pj.id}` : "/multiverse" });
      }
    }
  }

  for (const [project, list] of Object.entries(s.cif?.entities ?? {})) {
    for (const e of list) {
      if (byType("entity") >= cap) break;
      if ((e.name ?? "").toLowerCase().includes(q)) {
        const pj = projBySlugKey(project);
        results.push({ type: "entity", label: e.name ?? "", sub: `${e.type} · ${project}`, href: pj ? `/project/${pj.slug}` : "/origin" });
      }
    }
  }

  for (const n of s.narratives) {
    if (byType("narrative") >= cap) break;
    if (n.title.toLowerCase().includes(q)) results.push({ type: "narrative", label: n.title, sub: `heat ${(n.heat * 100).toFixed(0)}`, href: "/origin" });
  }

  for (const [project, list] of Object.entries(s.cif?.knowledge ?? {})) {
    for (const k of list) {
      if (byType("knowledge") >= cap) break;
      const name = (k as { name?: string; nm?: string }).name ?? (k as { nm?: string }).nm ?? "";
      if (name.toLowerCase().includes(q)) {
        const pj = projBySlugKey(project);
        results.push({ type: "knowledge", label: name, sub: project, href: pj ? `/project/${pj.slug}` : "/universe" });
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 24) });
}
