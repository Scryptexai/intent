import type { MetadataRoute } from "next";
import { getStore } from "@/lib/store";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intent.example.com";
  const s = getStore();
  const statics = ["/", "/mirror", "/origin", "/multiverse", "/track-record"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: p === "/" ? 1 : 0.8,
  }));
  const projects = s.projects
    .filter((p) => p.hero)
    .flatMap((p) => [
      { url: `${base}/project/${p.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
      { url: `${base}/brief/${p.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    ]);
  return [...statics, ...projects];
}
