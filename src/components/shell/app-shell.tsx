"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Radar,
  ScanSearch,
  Fingerprint,
  GitBranch,
  Dices,
  Sparkles,
  Search,
  Lock,
  Crown,
  PlayCircle,
  PenSquare,
  ArrowUpRight,
  Bell,
  Globe,
  Trophy,
  Gem,
} from "lucide-react";
import { NAV, NAV_GROUPS } from "@/components/shell/nav";
import { PlanProvider, usePlan } from "@/components/shell/plan-context";
import { QueryProvider } from "@/components/shell/query-provider";
import { useSession, useInvalidateSession } from "@/hooks/use-session";
import { I18nProvider, useI18n, LOCALES, type Locale } from "@/lib/i18n";
import { ConsentBanner } from "@/components/shell/consent-banner";
import { SupportWidget } from "@/components/shell/support-widget";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "@/components/shell/upgrade-dialog";
import { PromoModal } from "@/components/shell/promo-surfaces";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  radar: Radar,
  sentinel: Radar,
  mirror: ScanSearch,
  fingerprint: Fingerprint,
  branch: GitBranch,
  dice: Dices,
  sparkles: Sparkles,
  globe: Globe,
  trophy: Trophy,
};

const NAV_LABEL: Record<string, import('@/lib/i18n/locales/en').DictKey> = { "/": "nav.sentinel", "/mirror": "nav.mirror", "/origin": "nav.origin", "/multiverse": "nav.multiverse", "/edge": "nav.edge", "/studio": "nav.studio" };

function Sidebar() {
  const pathname = usePathname();
  const { plan } = usePlan();
  const { t } = useI18n();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/5 bg-intent-surface/60 backdrop-blur lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.png" alt="INTENT" className="h-8 w-8" />
        <div>
          <div className="text-sm font-bold tracking-[0.18em] text-intent-text">INTENT</div>
          <div className="text-[9px] tracking-[0.08em] text-intent-muted">Know the Intent. See the Signal.</div>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-4 overflow-y-auto px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group.title}</div>
            <div className="space-y-1">
        {group.items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          const locked = item.pro && plan === "free";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-md px-2 py-2 transition-colors",
                active ? "border-l-[3px] border-intent-gold bg-intent-gold/15 text-white" : "border-l-[3px] border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-intent-teal" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {NAV_LABEL[item.href] ? t(NAV_LABEL[item.href]) : item.label}
                  {locked && <Lock className="h-3 w-3 text-intent-gold" />}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground/80">{item.sub}</span>
              </span>
            </Link>
          );
        })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-4 text-[11px] text-muted-foreground">
        <div className="mono">v0.2 · demo universe</div>
        <div>{t("shell.stats")}</div>
        <div className="mt-2 flex gap-2">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </div>
    </aside>
  );
}

function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ type: string; label: string; sub: string; href: string }[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setHits(d.results ?? []))
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="INTENT Command Palette" loop>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
        <div className="mx-auto mt-[12vh] w-full max-w-xl px-4" onClick={(e) => e.stopPropagation()}>
          <div className="panel overflow-hidden shadow-2xl">
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder="Search projects, patterns, entities, narratives…  (Esc to close)"
              className="h-12 w-full border-b border-white/10 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
              {hits.length > 0 && (
                <Command.Group heading="Catalog">
                  {hits.map((h) => (
                    <Command.Item key={`${h.type}-${h.label}`} value={`${h.type} ${h.label} ${h.sub}`} onSelect={() => run(() => router.push(h.href))} className={paletteItem}>
                      <span className="mono w-16 shrink-0 text-[9px] uppercase text-intent-gold">{h.type}</span>
                      <span className="truncate">{h.label}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">{h.sub}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Modules">
                {NAV.map((n) => (
                  <Command.Item key={n.href} value={`${n.label} ${n.sub}`} onSelect={() => run(() => router.push(n.href))} className={paletteItem}>
                    <span>{n.label}</span>
                    <span className="text-xs text-muted-foreground">{n.sub}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Quick actions">
                <Command.Item value="run sentinel scan now" onSelect={() => run(() => void fetch("/api/sentinel/run", { method: "POST" }).then(() => router.push("/")))} className={paletteItem}>
                  <PlayCircle className="h-4 w-4 text-intent-gold" /> Run Sentinel scan now
                </Command.Item>
                <Command.Item value="new draft blur airdrop thread" onSelect={() => run(() => router.push("/studio?sourceType=airdrop&sourceId=p-blur"))} className={paletteItem}>
                  <PenSquare className="h-4 w-4 text-intent-teal" /> New draft · Blur airdrop thread
                </Command.Item>
                <Command.Item value="new draft hyperliquid signal" onSelect={() => run(() => router.push("/studio?sourceType=signal&sourceId=s-1"))} className={paletteItem}>
                  <PenSquare className="h-4 w-4 text-intent-teal" /> New draft · Hyperliquid whale signal
                </Command.Item>
                <Command.Item value="upgrade to pro" onSelect={() => run(() => window.dispatchEvent(new CustomEvent("cif:open-upgrade")))} className={paletteItem}>
                  <Crown className="h-4 w-4 text-intent-gold" /> Upgrade to Pro
                </Command.Item>
              </Command.Group>
            </Command.List>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-muted-foreground">
              <span>INTENT Co-Pilot</span>
              <span className="mono">↑↓ navigate · ↵ select</span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}

const paletteItem =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2.5 text-sm aria-selected:bg-intent-teal/15 aria-selected:text-white data-[disabled]:opacity-50";

function NotificationBell() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const notes = useQuery<{ notifications: { id: string; title: string; body: string; link: string; read: boolean; createdAt: string }[]; unread: number }>({
    queryKey: ["notifications"],
    enabled: !!session.data?.user,
    refetchInterval: 60_000,
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
  });
  const router = useRouter();
  if (!session.data?.user) return null;
  return (
    <div className="relative">
      <button
        aria-label={`Notifications (${notes.data?.unread ?? 0} unread)`}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-white/10 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {(notes.data?.unread ?? 0) > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-intent-gold px-1 text-[9px] font-bold text-black">
            {notes.data!.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 panel p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold">Notifications</span>
            <button
              className="text-[10px] text-intent-teal hover:underline"
              onClick={async () => {
                await fetch("/api/notifications/read", { method: "POST" });
                notes.refetch();
              }}
            >
              mark all read
            </button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {(notes.data?.notifications ?? []).slice(0, 12).map((n) => (
              <button
                key={n.id}
                className={`block w-full rounded-md p-2 text-left text-xs hover:bg-white/5 ${n.read ? "opacity-60" : ""}`}
                onClick={() => {
                  setOpen(false);
                  router.push(n.link);
                }}
              >
                <div className="font-semibold">{n.title}</div>
                <div className="mt-0.5 text-muted-foreground">{n.body}</div>
              </button>
            ))}
            {(notes.data?.notifications ?? []).length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">No notifications yet — watch a project and run a scan.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Topbar() {
  const { plan, loading } = usePlan();
  const { t, locale, setLocale } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const session = useSession();
  const invalidateSession = useInvalidateSession();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    const on401 = () => router.push("/login");
    window.addEventListener("keydown", onKey);
    window.addEventListener("cif:unauthorized", on401);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cif:unauthorized", on401);
    };
  }, [router]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-intent-bg/80 px-4 backdrop-blur lg:px-8">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-white/10 bg-intent-surface/60 px-3 text-sm text-muted-foreground transition-colors hover:border-intent-teal/40 hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.search")}</span>
          <kbd className="mono ml-auto rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              aria-label="Switch language"
              className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
              onClick={() => setLangOpen((v) => !v)}
            >
              {locale}
            </button>
            {langOpen && (
              <div className="absolute right-0 z-50 mt-2 w-40 panel p-1 shadow-2xl">
                {(Object.keys(LOCALES) as Locale[]).map((l) => (
                  <button
                    key={l}
                    className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-white/5 ${l === locale ? "text-intent-teal" : "text-muted-foreground"}`}
                    onClick={() => {
                      setLocale(l);
                      setLangOpen(false);
                    }}
                  >
                    {LOCALES[l].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <NotificationBell />
          <Badge variant={plan === "ultimate" ? "default" : plan === "pro" ? "amber" : "muted"} className="gap-1.5">
            {plan === "ultimate" ? <Gem className="h-3 w-3" /> : plan === "pro" ? <Crown className="h-3 w-3" /> : null}
            {loading ? "…" : plan.toUpperCase()} PLAN
          </Badge>
          <UpgradeDialog />
          <PromoModal />
          {session.data?.user ? (
            <div className="flex items-center gap-2">
              {session.data.user.role === "admin" && (
                <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground" title="Audit trail (admin)">
                  Admin
                </Link>
              )}
              <Link href="/account" className="text-xs text-muted-foreground hover:text-foreground" title="Account & data controls">
                Account
              </Link>
              <span className="hidden text-xs text-muted-foreground md:inline" title={`role: ${session.data.user.role}`}>
                {session.data.user.email}
              </span>
              <button
                aria-label="Sign out"
                className="grid h-8 w-8 place-items-center rounded-full bg-intent-teal/20 text-xs font-bold text-blue-300 ring-1 ring-inset ring-intent-teal/40 hover:bg-intent-teal/30"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  invalidateSession();
                  router.refresh();
                }}
              >
                {session.data.user.email.slice(0, 2).toUpperCase()}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="outline">{t("topbar.signin")}</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="amber">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const labels: Record<string, import("@/lib/i18n/locales/en").DictKey> = { "/": "nav.sentinel", "/mirror": "nav.mirror", "/origin": "nav.origin", "/multiverse": "nav.multiverse", "/edge": "nav.edge", "/studio": "nav.studio" };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-intent-surface/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Primary mobile">
      <div className="grid grid-cols-5">
        {NAV.filter((n) => ["/", "/universe", "/studio", "/track-record", "/sentinel"].includes(n.href)).map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2 text-[9px] ${active ? "text-intent-teal" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
              <span className="max-w-[3.5rem] truncate">{item.short ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  return (
        <div className="min-h-screen">
          <a
            href="#main-content"
            className="sr-only z-[60] rounded-md bg-intent-teal px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
          >
            {t("common.skip")}
          </a>
          <Sidebar />
          <div className="lg:pl-60">
            <Topbar />
            <main id="main-content" className="min-h-[calc(100vh-3.5rem)] pb-16 lg:pb-0">{children}</main>
          </div>
      {isMobile && <BottomNav />}
      <SupportWidget />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <QueryProvider>
        <I18nProvider>
          <ShellFrame>{children}</ShellFrame>
          <ConsentBanner />
        </I18nProvider>
      </QueryProvider>
    </PlanProvider>
  );
}

export { ArrowUpRight };
