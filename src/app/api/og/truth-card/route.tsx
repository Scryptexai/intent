import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * FASE 4A — Shareable "Truth Cards".
 * GET /api/og/truth-card?stat=...&label=...&project=...&accent=amber|blue
 * Renders a branded 1200×630 PNG entirely on the server (next/og — the
 * App-Router successor of @vercel/og) with self-hosted fonts.
 */

const fontCache: { regular?: ArrayBuffer; bold?: ArrayBuffer } = {};
const bgCache: { uri?: string } = {};
async function loadFont(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(process.cwd(), "src/fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const stat = sp.get("stat") ?? "38%";
  const label = sp.get("label") ?? "of BLUR recipients sold within 7 days";
  const project = sp.get("project") ?? "Blur";
  const accent = sp.get("accent") === "blue" ? "#2DD4BF" : "#F59E0B";
  const footnote = sp.get("footnote") ?? "POV Matrix · 127,000 claimants · 90-day window";

  if (!fontCache.regular) fontCache.regular = await loadFont("Inter-Regular.woff");
  if (!fontCache.bold) fontCache.bold = await loadFont("Inter-Bold.woff");
  if (!bgCache.uri) {
    const b = await readFile(path.join(process.cwd(), "public/media/truthcard-bg.png"));
    bgCache.uri = `data:image/png;base64,${b.toString("base64")}`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "linear-gradient(145deg, #0B0E11 0%, #161B22 60%, #0B0E11 100%)",
          color: "#E6EDF3",
          fontFamily: "Inter",
          padding: 64,
        }}
      >
        {/* latar brand (MEDIA-PROMPTS §4) */}
        <img
          src={bgCache.uri}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}
        />
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 38,
              height: 38,
              borderRadius: 9,
              background: accent,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 800,
              color: "#0B0E11",
            }}
          >
            C
          </div>
          <div style={{ display: "flex", fontSize: 21, letterSpacing: 5, color: "#8B949E", fontWeight: 700 }}>
            INTENT · FORENSIC INTELLIGENCE
          </div>
        </div>

        <div style={{ display: "flex", height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, marginTop: 18, marginBottom: 44 }} />

        {/* headline stat */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 148, fontWeight: 800, color: accent, lineHeight: 1.05, letterSpacing: -4 }}>{stat}</div>
          <div style={{ display: "flex", fontSize: 50, fontWeight: 600, color: "#E6EDF3", marginTop: 18, maxWidth: 980, lineHeight: 1.25 }}>{label}</div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 23, color: "#8B949E" }}>{footnote}</div>
            <div style={{ display: "flex", fontSize: 22, color: "#2DD4BF", fontWeight: 600 }}>Project: {project}</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: `1px solid ${accent}`,
              color: accent,
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            POWERED BY INTENT
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fontCache.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fontCache.bold, weight: 700, style: "normal" },
      ],
    },
  );
}
