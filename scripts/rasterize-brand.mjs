/**
 * Rasterize brand SVGs → PNG assets (favicon/apple/og/splash + brand folder).
 * Run: node scripts/rasterize-brand.mjs  (uses sharp from node_modules)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const A = (f) => readFileSync(new URL(`../assets/brand/${f}`, import.meta.url));
const out = (p, buf) => {
  mkdirSync(new URL(`../${p.substring(0, p.lastIndexOf("/"))}`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../${p}`, import.meta.url), buf);
  console.log("wrote", p);
};

const icon = A("logo-intent-icon.svg");
const stacked = A("logo-intent-stacked.svg");
const splash = A("splash.svg");
const primary = A("logo-intent-primary.svg");

await sharp(icon).resize(512, 512).png().toBuffer().then((b) => out("assets/brand/icon-512.png", b));
await sharp(icon).resize(192, 192).png().toBuffer().then((b) => out("public/favicon.png", b));
await sharp(icon).resize(512, 512).png().toBuffer().then((b) => out("src/app/icon.png", b));
await sharp(icon).resize(180, 180).png().toBuffer().then((b) => out("src/app/apple-icon.png", b));
await sharp(stacked).resize(1080, 1080).png().toBuffer().then((b) => out("public/og-image.png", b));
await sharp(splash).resize(1600, 950).png().toBuffer().then((b) => out("public/splash.png", b));
await sharp(primary).resize(720, 200).png().toBuffer().then((b) => out("assets/brand/logo-primary.png", b));
await sharp(stacked).resize(1080, 1080).png().toBuffer().then((b) => out("assets/brand/logo-stacked.png", b));
console.log("brand rasterization complete");
