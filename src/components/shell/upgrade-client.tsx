"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Minus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { emitUnauthorized } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/locales/en";
import { useFraming, track } from "@/lib/ab";

/* ── types (mirror /api/billing/subscription) ─────────────────────────────── */
interface Payment {
  id: string;
  method: string;
  amountUsd: number;
  status: "pending" | "confirmed" | "failed";
  payTo: string | null;
  paymentRef: string | null;
  chain: string | null;
}
interface Sub {
  subscription: {
    status: string;
    plan: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    active: boolean;
    provider: string | null;
  };
  effectivePlan: string;
  priceUsd: number;
  payments: Payment[];
}

type Method = "card" | "paypal" | "usdt";

/* ── value tier matrix (pola halaman langganan platform besar) ────────────── */
const COMPARISON: { label: DictKey; free: string | boolean; pro: string | boolean; ult: string | boolean }[] = [
  { label: "upgrade.row.universe", free: true, pro: true, ult: true },
  { label: "upgrade.row.citations", free: true, pro: true, ult: true },
  { label: "upgrade.row.trackrecord", free: true, pro: true, ult: true },
  { label: "upgrade.row.brief1", free: true, pro: true, ult: true },
  { label: "upgrade.row.briefUnl", free: false, pro: true, ult: true },
  { label: "upgrade.row.sentinel", free: false, pro: true, ult: true },
  { label: "upgrade.row.watchlist", free: false, pro: true, ult: true },
  { label: "upgrade.row.edge", free: false, pro: true, ult: true },
  { label: "upgrade.row.export", free: false, pro: true, ult: true },
  { label: "upgrade.row.api", free: false, pro: true, ult: true },
  { label: "upgrade.row.mktStocks", free: false, pro: false, ult: true },
  { label: "upgrade.row.mktAi", free: false, pro: false, ult: true },
  { label: "upgrade.row.mktComm", free: false, pro: false, ult: true },
  { label: "upgrade.row.support", free: false, pro: true, ult: "upgrade.row.supportTop" },
];

const FAQS: { q: DictKey; a: DictKey }[] = [
  { q: "upgrade.faq1.q", a: "upgrade.faq1.a" },
  { q: "upgrade.faq2.q", a: "upgrade.faq2.a" },
  { q: "upgrade.faq3.q", a: "upgrade.faq3.a" },
  { q: "upgrade.faq4.q", a: "upgrade.faq4.a" },
  { q: "upgrade.faq5.q", a: "upgrade.faq5.a" },
];

/* PayPal wordmark + USDT mark (tanpa aset eksternal) */
function PayPalMark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[13px] font-bold italic tracking-tight", className)}>
      <span className="text-[#79b8e8]">Pay</span>
      <span className="text-[#4a90c2]">Pal</span>
    </span>
  );
}
function UsdtMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid h-[18px] w-[18px] place-items-center rounded-full bg-[#26A17B] text-[11px] font-bold leading-none text-white", className)}>₮</span>
  );
}

function Tick({ muted, teal }: { muted?: boolean; teal?: boolean }) {
  return <Check className={cn("mx-auto h-[18px] w-[18px]", teal ? "text-intent-teal" : muted ? "text-muted-foreground" : "text-intent-gold")} />;
}
function Dash() {
  return <Minus className="mx-auto h-[18px] w-[18px] text-muted-foreground/50" />;
}
function Cell({ v, muted, teal }: { v: string | boolean; muted?: boolean; teal?: boolean }) {
  if (v === true) return <Tick muted={muted} teal={teal} />;
  if (v === false) return <Dash />;
  return <span className={cn("mono text-[11px]", teal ? "text-intent-teal" : muted ? "text-muted-foreground" : "text-foreground")}>{v}</span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   Halaman langganan INTENT Pro — pola halaman upgrade platform besar:
   judul tier, satu kalimat nilai, matriks fitur lengkap (✓ / —),
   kartu checkout sticky, FAQ singkat. Copy tenang, tanpa jargon internal.
   ══════════════════════════════════════════════════════════════════════════ */
export function UpgradeClient() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const variant = useFraming();
  /* return dari Stripe/PayPal mendarat di /upgrade?paid=1 — dibaca client-side
     agar halaman tetap full-SSR. */
  const [justPaidParam, setJustPaidParam] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("paid") === "1") setJustPaidParam(true);
  }, []);

  const [method, setMethod] = useState<Method>("card");
  const [tier, setTier] = useState<"pro" | "ultimate">("pro");
  const [tierTouched, setTierTouched] = useState(false);
  const [chain, setChain] = useState<"eth" | "solana">("eth");
  const [busy, setBusy] = useState<string | null>(null);
  const [cryptoPay, setCryptoPay] = useState<Payment | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [converting, setConverting] = useState(false); // user trial → mulai checkout berbayar
  const checkoutRef = useRef<HTMLDivElement>(null);

  const sub = useQuery<Sub>({
    queryKey: ["billing"],
    staleTime: 30_000,
    queryFn: () => fetch("/api/billing/subscription").then((r) => r.json()),
    refetchInterval: justPaidParam || cryptoPay?.status === "pending" ? 8_000 : false,
  });

  const me = useQuery<{ user: { email: string } | null }>({
    queryKey: ["session"],
    staleTime: 60_000,
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });

  useEffect(() => {
    if (!justPaidParam) return;
    qc.invalidateQueries({ queryKey: ["billing"] });
    qc.invalidateQueries({ queryKey: ["session"] });
    window.dispatchEvent(new CustomEvent("cif:plan-changed"));
  }, [justPaidParam, qc]);

  /* default tier mengikuti langganan aktif sampai user memilih sendiri */
  useEffect(() => {
    if (tierTouched) return;
    if (sub.data?.subscription?.plan === "ultimate") setTier("ultimate");
  }, [sub.data?.subscription?.plan, tierTouched]);

  const price = tier === "ultimate" ? 189 : (sub.data?.priceUsd ?? 49);
  const isPro = !!sub.data?.subscription?.active;
  const trialing = sub.data?.subscription?.status === "trialing";
  const trialDays =
    sub.data?.subscription?.trialEndsAt && trialing
      ? Math.max(0, Math.ceil((new Date(sub.data.subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;
  const hasSession = me.isSuccess && !!me.data?.user;
  const isAnon = me.isSuccess && !me.data?.user;

  /* auto-poll verifikasi crypto selama pending (pelengkap watcher berkala) */
  useEffect(() => {
    const id = cryptoPay?.id;
    if (!id || cryptoPay?.status !== "pending") return;
    const t = setInterval(() => verifyCrypto(id, true), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoPay?.id, cryptoPay?.status]);

  async function guard(): Promise<boolean> {
    const d = await fetch("/api/auth/me").then((r) => r.json());
    if (!d.user) {
      emitUnauthorized();
      return false;
    }
    return true;
  }

  async function startCheckout() {
    setMsg(null);
    track("checkout_start", { variant });
    if (method === "card") {
      if (!(await guard())) return;
      setBusy("card");
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "stripe", tier }) });
      const d = await res.json();
      setBusy(null);
      if (d.url) window.location.href = d.url;
      else setMsg(d.message ?? d.error ?? "Metode kartu tidak tersedia di environment ini. Silakan gunakan metode lain.");
    } else if (method === "paypal") {
      if (!(await guard())) return;
      setBusy("paypal");
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "paypal", tier }) });
      const d = await res.json();
      setBusy(null);
      if (d.approveUrl) window.location.href = d.approveUrl;
      else setMsg(d.message ?? d.error ?? "PayPal tidak tersedia di environment ini. Silakan gunakan metode lain.");
    } else {
      if (!(await guard())) return;
      setBusy("usdt");
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "crypto", chain, tier }) });
      const d = await res.json();
      setBusy(null);
      if (d.payment) {
        setCryptoPay(d.payment);
        setMsg(null);
      } else setMsg(d.message ?? d.error ?? "Tidak dapat membuat invoice. Silakan coba lagi.");
    }
  }

  async function verifyCrypto(paymentId: string, silent = false) {
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/billing/crypto/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const d = await res.json().catch(() => null);
      if (d?.payment) {
        setCryptoPay(d.payment);
        if (d.payment.status === "confirmed") {
          qc.invalidateQueries({ queryKey: ["billing"] });
          qc.invalidateQueries({ queryKey: ["session"] });
          window.dispatchEvent(new CustomEvent("cif:plan-changed"));
        } else if (!silent) {
          setMsg(t("upgrade.crypto.pending"));
        }
      }
    } finally {
      setChecking(false);
    }
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    });
  }

  /* ── kartu checkout / invoice / sukses / kelola / masuk ── */

  function CheckoutCard() {
    return (
      <div className="panel overflow-hidden">
        {/* header harga */}
        <div className="border-b border-white/[0.06] p-6">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-semibold">
              INTENT <span className={tier === "ultimate" ? "text-intent-teal" : "text-intent-gold"}>{tier === "ultimate" ? "Ultimate" : "Pro"}</span>
            </div>
            {trialing && trialDays !== null && (
              <span className="text-[11px] text-muted-foreground">{t("upgrade.trial.prefix")} {trialDays} {t("upgrade.trial.suffix")}</span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="mono text-4xl font-bold tracking-tight">${price}</span>
            <span className="text-sm text-muted-foreground">/bulan</span>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* pilih tier */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("upgrade.tier.select")}</div>
            <div className="space-y-2">
              <TierRow
                selected={tier === "pro"}
                onSelect={() => {
                  setTier("pro");
                  setTierTouched(true);
                }}
                name="Pro"
                price={sub.data?.priceUsd ?? 49}
                desc={t("upgrade.tier.pro.desc")}
                accent="gold"
              />
              <TierRow
                selected={tier === "ultimate"}
                onSelect={() => {
                  setTier("ultimate");
                  setTierTouched(true);
                }}
                name="Ultimate"
                price={189}
                desc={t("upgrade.tier.ult.desc")}
                accent="teal"
              />
            </div>
          </div>

          {/* ringkasan nilai */}
          <ul className="space-y-2">
            {[t("upgrade.ben.1"), t("upgrade.ben.2"), t("upgrade.ben.3")].map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px] text-foreground">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-intent-gold" /> {b}
              </li>
            ))}
          </ul>

          {/* metode pembayaran */}
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("upgrade.method.label")}</div>
            <div className="space-y-2">
              <MethodRow
                selected={method === "card"}
                onSelect={() => setMethod("card")}
                icon={<CreditCard className="h-4 w-4 text-foreground" />}
                title="Kartu"
                sub={t("upgrade.method.card.sub")}
              />
              <MethodRow
                selected={method === "paypal"}
                onSelect={() => setMethod("paypal")}
                icon={<Landmark className="h-4 w-4 text-foreground" />}
                title={<PayPalMark />}
                sub={t("upgrade.method.paypal.sub")}
              />
              <MethodRow
                selected={method === "usdt"}
                onSelect={() => setMethod("usdt")}
                icon={<UsdtMark />}
                title="USDT"
                sub={t("upgrade.method.usdt.sub")}
                extra={
                  method === "usdt" && (
                    <div className="mt-2 flex gap-1 rounded-md border border-white/[0.08] bg-black/30 p-0.5" onClick={(e) => e.stopPropagation()}>
                      {([["eth", "Ethereum"], ["solana", "Solana"]] as const).map(([c, label]) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                            chain === c ? "bg-intent-surfaceHover text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => setChain(c)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )
                }
              />
            </div>
          </div>

          {/* CTA utama — pola tombol harga */}
          <Button className="h-12 w-full rounded-full text-[15px] font-semibold" onClick={startCheckout} disabled={busy !== null}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
              </>
            ) : (
              <>{t("upgrade.cta")} ${price}{t("upgrade.cta.per")}</>
            )}
          </Button>

          {msg && <p className="rounded-md border border-white/[0.08] bg-white/[0.03] p-2.5 text-center text-xs text-muted-foreground">{msg}</p>}

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("upgrade.foot.1")}
            <br />
            {t("upgrade.foot.2")}
          </p>
        </div>
      </div>
    );
  }

  function CryptoPaymentCard() {
    const p = cryptoPay!;
    return (
      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] p-6">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">{t("upgrade.crypto.title")}</div>
            <Badge variant="muted" className="mono">ref {p.paymentRef}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("upgrade.crypto.sub.pre")} {p.amountUsd} {t("upgrade.crypto.sub.post")}</p>
        </div>

        <div className="space-y-4 p-6">
          {/* langkah */}
          <ol className="space-y-2">
            {[
              { label: t("upgrade.crypto.step1"), state: "done" },
              { label: t("upgrade.crypto.step2"), state: "active" },
              { label: t("upgrade.crypto.step3"), state: "next" },
            ].map((s, i) => (
              <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-semibold",
                    s.state === "done" && "border-intent-teal/50 bg-intent-teal/10 text-intent-teal",
                    s.state === "active" && "border-intent-gold/50 text-intent-gold",
                    s.state === "next" && "border-white/10 text-muted-foreground",
                  )}
                >
                  {s.state === "done" ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={s.state === "next" ? "text-muted-foreground" : "text-foreground"}>{s.label}</span>
                {s.state === "active" && <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-intent-gold" />}
              </li>
            ))}
          </ol>

          {/* jaringan */}
          <div className="rounded-md border border-intent-rose/25 bg-intent-rose/[0.06] p-3 text-xs leading-relaxed text-intent-rose">
            {t("upgrade.crypto.warn")}
          </div>

          {/* alamat */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t("upgrade.crypto.addr")}</span>
              <span className="mono text-foreground">{p.amountUsd} USDT</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="mono flex-1 break-all rounded-md border border-white/[0.08] bg-black/40 p-2.5 text-[11px] leading-relaxed">{p.payTo}</code>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyAddress(p.payTo ?? "")} aria-label="Salin alamat">
                {copied ? <Check className="h-3.5 w-3.5 text-intent-teal" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("upgrade.crypto.copied") : t("upgrade.crypto.copy")}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-intent-gold opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-intent-gold" />
            </span>
            {t("upgrade.crypto.waiting")}
          </div>

          {msg && <p className="text-center text-xs text-muted-foreground">{msg}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => verifyCrypto(p.id)} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {t("upgrade.crypto.check")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCryptoPay(null);
                setMsg(null);
              }}
            >
              {t("upgrade.crypto.switch")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function SuccessCard() {
    return (
      <div className="panel p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-intent-teal/40 bg-intent-teal/10">
          <Check className="h-5 w-5 text-intent-teal" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{t("upgrade.success.title")}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t("upgrade.success.sub")}</p>
        <div className="mt-5 space-y-2">
          <Button className="w-full rounded-full" asChild>
            <Link href="/">{t("upgrade.success.cta1")}</Link>
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/account">{t("upgrade.success.cta2")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  function ManageCard() {
    const s = sub.data?.subscription;
    const isUlt = s?.plan === "ultimate";
    return (
      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] p-6">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">
              INTENT <span className={isUlt ? "text-intent-teal" : "text-intent-gold"}>{isUlt ? "Ultimate" : "Pro"}</span>
            </div>
            <Badge variant={isUlt ? "default" : "amber"}>{s?.status === "trialing" ? t("upgrade.manage.trial") : t("upgrade.manage.active")}</Badge>
          </div>
        </div>
        <div className="p-6">
          <dl className="space-y-2.5 text-[13px]">
            {s?.provider && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("upgrade.manage.method")}</dt>
                <dd className="mono">{s.provider}</dd>
              </div>
            )}
            {s?.trialEndsAt && trialing && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("upgrade.manage.trialEnds")}</dt>
                <dd className="mono">{s.trialEndsAt.slice(0, 10)}</dd>
              </div>
            )}
            {s?.currentPeriodEnd && !trialing && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("upgrade.manage.renews")}</dt>
                <dd className="mono">{s.currentPeriodEnd.slice(0, 10)}</dd>
              </div>
            )}
          </dl>

          {(sub.data?.payments ?? []).length > 0 && (
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("upgrade.manage.history")}</div>
              <ul className="space-y-2">
                {sub.data!.payments.slice(0, 5).map((p) => (
                  <li key={p.id} className="mono flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{p.method}</span>
                    <span>
                      ${p.amountUsd}{" "}
                      <span className={p.status === "confirmed" ? "text-intent-teal" : p.status === "pending" ? "text-amber-300" : "text-intent-rose"}>{p.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 space-y-2">
            {trialing && (
              <Button
                className="w-full rounded-full"
                onClick={() => {
                  setConverting(true);
                }}
              >
                Upgrade seharga ${price}/bulan
              </Button>
            )}
            <Button variant={trialing ? "ghost" : "outline"} className="w-full rounded-full" asChild>
              <Link href="/account">{t("upgrade.manage.account")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function SignInCard() {
    return (
      <div className="panel p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03]">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-semibold">{t("upgrade.signin.title")}</h3>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{t("upgrade.signin.sub")}</p>
        <Button className="mt-5 w-full rounded-full" onClick={() => emitUnauthorized()}>
          {t("upgrade.signin.cta")}
        </Button>
      </div>
    );
  }

  function TierRow({
    selected,
    onSelect,
    name,
    price,
    desc,
    accent,
  }: {
    selected: boolean;
    onSelect: () => void;
    name: string;
    price: number;
    desc: string;
    accent: "gold" | "teal";
  }) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "w-full rounded-lg border p-3 text-left transition-all",
          selected
            ? accent === "teal"
              ? "border-intent-teal/60 bg-intent-teal/[0.06]"
              : "border-intent-gold/50 bg-intent-gold/[0.05]"
            : "border-white/[0.08] hover:border-white/20",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-baseline gap-2 text-sm font-medium">
              {name}
              <span className="mono text-[12px] text-muted-foreground">${price}/bulan</span>
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{desc}</span>
          </span>
          <span
            className={cn(
              "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
              selected ? (accent === "teal" ? "border-intent-teal bg-intent-teal" : "border-intent-gold bg-intent-gold") : "border-white/20",
            )}
          >
            {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
          </span>
        </div>
      </button>
    );
  }

  function MethodRow({
    selected,
    onSelect,
    icon,
    title,
    sub,
    extra,
  }: {
    selected: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    title: React.ReactNode;
    sub: string;
    extra?: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "w-full rounded-lg border p-3 text-left transition-all",
          selected ? "border-intent-gold/50 bg-intent-gold/[0.05]" : "border-white/[0.08] hover:border-white/20",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md border", selected ? "border-intent-gold/40 bg-intent-gold/10" : "border-white/[0.08] bg-black/30")}>
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-tight">{title}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>
          </span>
          <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border", selected ? "border-intent-gold bg-intent-gold" : "border-white/20")}>
            {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
          </span>
        </div>
        {extra}
      </button>
    );
  }

  /* ── render ─ */
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          {/* ── kiri: judul, nilai, matriks fitur, FAQ ── */}
          <div>
            <div className="eyebrow text-intent-gold">{variant === "A" ? t("framing.confident") : t("brief.framing")}</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight lg:text-5xl">
              INTENT <span className="text-intent-gold">Pro</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {t("upgrade.hero.sub")}
            </p>

            {/* matriks fitur — 3 tier */}
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 text-[13px] font-medium text-muted-foreground">{t("upgrade.table.feature")}</th>
                    <th className="w-20 pb-3 text-center text-[13px] font-medium text-muted-foreground">{t("upgrade.table.free")}</th>
                    <th className="w-20 pb-3 text-center text-[13px] font-semibold text-intent-gold">Pro</th>
                    <th className="w-24 border-t-2 border-intent-teal/60 pb-3 text-center text-[13px] font-semibold text-intent-teal">Ultimate</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.label} className="border-t border-white/[0.06]">
                      <td className="py-3.5 pr-4 text-[14px] text-foreground">{t(row.label)}</td>
                      <td className="py-3.5 text-center">
                        <Cell v={row.free} muted />
                      </td>
                      <td className="py-3.5 text-center">
                        <Cell v={row.pro} />
                      </td>
                      <td className="border-l border-white/[0.04] bg-intent-teal/[0.04] py-3.5 text-center">
                        <Cell v={typeof row.ult === "string" ? t(row.ult as DictKey) : row.ult} teal />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* tautan kelola (pola "Pulihkan langganan") */}
            <div className="mt-8 text-center lg:text-left">
              {hasSession ? (
                <Link href="/account" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t("upgrade.manage.link")}
                </Link>
              ) : (
                <button type="button" onClick={() => emitUnauthorized()} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t("upgrade.already")}
                </button>
              )}
            </div>

            {/* FAQ */}
            <div className="mt-12 max-w-xl">
              <div className="text-[13px] font-medium text-muted-foreground">{t("upgrade.faq.title")}</div>
              <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {FAQS.map((f, i) => (
                  <div key={f.q}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[14px] font-medium transition-colors hover:text-intent-gold"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      aria-expanded={faqOpen === i}
                    >
                      {t(f.q)}
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", faqOpen === i && "rotate-180")} />
                    </button>
                    {faqOpen === i && <p className="pb-4 text-[13px] leading-relaxed text-muted-foreground">{t(f.a)}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── kanan: kartu checkout sticky ── */}
          <div className="mt-10 lg:mt-0">
            <div ref={checkoutRef} className="lg:sticky lg:top-20">
              {isAnon ? (
                <SignInCard />
              ) : cryptoPay?.status === "confirmed" || (justPaidParam && isPro) ? (
                <SuccessCard />
              ) : cryptoPay?.status === "pending" ? (
                <CryptoPaymentCard />
              ) : isPro && !(trialing && converting) ? (
                <ManageCard />
              ) : (
                <>
                  <CheckoutCard />
                  {trialing && converting && (
                    <div className="mt-3 text-center">
                      <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground" onClick={() => setConverting(false)}>
                        {t("upgrade.back")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
