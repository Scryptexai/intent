export interface NavItem {
  href: string;
  label: string;
  sub: string;
  icon: string;
  pro?: boolean;
  short?: string;
}
export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/** Job-centric IA (keputusan maintainer): Daily jobs first, modules = Tools. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "daily",
    title: "Daily",
    items: [
      { href: "/", label: "Morning Brief", sub: "Edge radar · delta semalam", icon: "radar", short: "Brief" },
      { href: "/universe", label: "Universe", sub: "Ranking · watchlist · export", icon: "globe", short: "Universe" },
      { href: "/track-record", label: "Track Record", sub: "Kalibrasi publik", icon: "trophy", short: "Record" },
    ],
  },
  {
    id: "create",
    title: "Create",
    items: [{ href: "/studio", label: "Content Studio", sub: "Output bersitasi", icon: "sparkles", short: "Studio" }],
  },
  {
    id: "tools",
    title: "Tools",
    items: [
      { href: "/sentinel", label: "Sentinel Ops", sub: "Exception console · scans · ack", icon: "sentinel", short: "Ops" },
      { href: "/mirror", label: "The Mirror", sub: "Pattern proximity · analogs", icon: "mirror" },
      { href: "/origin", label: "The Origin", sub: "Credibility · truth matrix", icon: "fingerprint" },
      { href: "/multiverse", label: "The Multiverse", sub: "Causal chains", icon: "branch" },
      { href: "/edge", label: "The Edge", sub: "Counter-factual simulator", icon: "dice", pro: true },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
