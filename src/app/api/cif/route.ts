import { NextRequest, NextResponse } from "next/server";
import { getCifDataset, cifStats, supabaseServerStatus } from "@/services/cif-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cif — locked-dataset overview (schema, counts, provenance).
 * GET /api/cif?q=layer — flat entity search across the 900+ entity graph.
 */
export async function GET(req: NextRequest) {
  const d = await getCifDataset();
  const q = req.nextUrl.searchParams.get("q");
  if (q) {
    const needle = q.toLowerCase();
    const rows: { id: string; name: string; type: string; project: string; description: string }[] = [];
    for (const [project, list] of Object.entries(d.entities)) {
      for (const e of list) {
        const name = e.name ?? "";
        const type = e.type ?? "";
        if (name.toLowerCase().includes(needle) || type.toLowerCase().includes(needle)) {
          rows.push({ id: e.id, name, type, project, description: (e.description ?? "").slice(0, 220) });
          if (rows.length >= 60) break;
        }
      }
      if (rows.length >= 60) break;
    }
    const total = Object.values(d.entities).reduce((s, l) => s + l.length, 0);
    return NextResponse.json({ entitySearch: { q, total, rows } });
  }
  return NextResponse.json({ stats: cifStats(d), projects: d.projects, benchmarks: d.benchmarks, patterns: d.patterns, supabase: await supabaseServerStatus() });
}
