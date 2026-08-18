"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/components/shell/plan-context";
import { useI18n } from "@/lib/i18n";
import { useFraming } from "@/lib/ab";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════════
   Promo surfaces — banner, carousel & modal cross-sell yang menghidupkan
   web tanpa menghalangi konten. Media mengikuti docs/MEDIA-PROMPTS.md:
   setiap banner memuat logo + visual robot analis + headline & tagline
   (teks brand selalu English; copy UI mengikuti locale aktif via i18n).
   HTML hanya merender CTA/copy value — tidak menduplikasi teks gambar.
   ════════════════════════════════════════════════════════════════════════ */

const PROMO_KEY = "intent.promo.entry.v1";

/** Modal entry: sekali per sesi, hanya untuk anonim / tier Free. */
export function PromoModal() {
  const router = useRouter();
  const { plan, loading } = usePlan();
  const { t } = useI18n();
  const variant = useFraming();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (plan !== "free") return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(PROMO_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, [plan, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(PROMO_KEY, String(Date.now()));
    } catch {}
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="INTENT Pro"
    >
      <div className="panel w-full max-w-[560px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* banner media 3.2:1 — logo + visual + headline + tagline (English) */}
        <div className="relative aspect-[3.2/1] w-full bg-intent-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/modal-promo.png"
            alt="INTENT — Read the Intent. Not the Noise. Know the Intent. See the Signal."
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/50 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="eyebrow text-intent-gold">{variant === "A" ? t("framing.confident") : t("brief.framing")}</div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("promo.modal.body")}</p>
          <p className="mt-2 text-[12px] text-muted-foreground">{t("promo.modal.trial")}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1 rounded-full"
              onClick={() => {
                dismiss();
                router.push("/upgrade");
              }}
            >
              {t("promo.modal.cta")} <ArrowRight />
            </Button>
            <Button variant="ghost" className="flex-1 rounded-full" onClick={dismiss}>
              {t("promo.modal.later")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Slide {
  img: string;
  alt: string;
  ctaKey: "promo.hero.free.cta" | "promo.hero.pro.cta" | "promo.cross.ult.cta" | "promo.slide.trust.cta";
  href: string;
}

/** Carousel banner home (in-flow, 5:1): beberapa slide cross-sell + trust. */
export function HomeHeroCarousel() {
  const { plan, loading } = usePlan();
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const hover = useRef(false);

  const slides: Slide[] =
    plan === "ultimate"
      ? [{ img: "/media/banner-trust.png", alt: "INTENT — We Grade Ourselves. In Public.", ctaKey: "promo.slide.trust.cta", href: "/track-record" }]
      : plan === "pro"
        ? [
            { img: "/media/banner-ultimate.png", alt: "INTENT — Crypto. Equities. AI & Tech. One Subscription.", ctaKey: "promo.cross.ult.cta", href: "/upgrade" },
            { img: "/media/banner-trust.png", alt: "INTENT — We Grade Ourselves. In Public.", ctaKey: "promo.slide.trust.cta", href: "/track-record" },
          ]
        : [
            { img: "/media/banner-pro.png", alt: "INTENT — One Research Desk for Serious Decisions.", ctaKey: "promo.hero.free.cta", href: "/upgrade" },
            { img: "/media/banner-trust.png", alt: "INTENT — We Grade Ourselves. In Public.", ctaKey: "promo.slide.trust.cta", href: "/track-record" },
            { img: "/media/banner-ultimate.png", alt: "INTENT — Crypto. Equities. AI & Tech. One Subscription.", ctaKey: "promo.cross.ult.cta", href: "/upgrade" },
          ];

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      if (!hover.current) setIdx((i) => (i + 1) % slides.length);
    }, 6_000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setIdx((i) => Math.min(i, slides.length - 1));
  }, [slides.length]);

  if (loading) return null;
  const s = slides[idx];

  return (
    <div
      className="group relative mb-6 aspect-[5/1] max-h-[230px] min-h-[150px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-intent-bg"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      role="region"
      aria-label="INTENT highlights"
    >
      {/* slides crossfade */}
      {slides.map((sl, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={sl.img}
          src={sl.img}
          alt={sl.alt}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", i === idx ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />

      {/* controls */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIdx((idx - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/40 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIdx((idx + 1) % slides.length)}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/40 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-intent-gold" : "w-1.5 bg-white/25 hover:bg-white/50")}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute bottom-2.5 right-3">
        <Button size="sm" className="rounded-full shadow-lg" asChild>
          <Link href={s.href}>
            {t(s.ctaKey)} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Slim cross-sell banner 10:1 (h-110px) — teks brand di gambar; HTML = CTA. */
export function CrossSellBanner({ variant }: { variant: "pro" | "ultimate" }) {
  const { t } = useI18n();
  const img = variant === "ultimate" ? "/media/banner-ultimate.png" : "/media/banner-pro.png";
  const alt =
    variant === "ultimate"
      ? "INTENT — Crypto. Equities. AI & Tech. One Subscription."
      : "INTENT — One Research Desk for Serious Decisions.";
  return (
    <div className="relative mt-6 h-[110px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-intent-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-black/55 to-transparent" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <Button size="sm" variant={variant === "ultimate" ? "outline" : "default"} className="shrink-0 rounded-full shadow-lg" asChild>
          <Link href="/upgrade">{variant === "ultimate" ? t("promo.cross.ult.cta") : t("promo.cross.pro.cta")}</Link>
        </Button>
      </div>
    </div>
  );
}

/** Banner header per halaman (in-flow) — gambar membawa headline+tagline halaman. */
export function PageBanner({ img, alt, className }: { img: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative mb-6 aspect-[4/1] max-h-[180px] min-h-[96px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-intent-bg", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}
