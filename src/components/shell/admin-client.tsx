"use client";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/primitives";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { timeAgo } from "@/lib/utils";

interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  resource: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

/** Enterprise audit trail (admin role enforced server-side). */
export function AdminClient() {
  const session = useSession();
  const [limit, setLimit] = useState(100);
  const metrics = useQuery<{ brief_views: number; exports: number; shares: number; watches: number; generations: number }>({
    queryKey: ["metrics"],
    enabled: session.data?.user?.role === "admin",
    queryFn: () => fetch("/api/admin/audit?limit=1").then(async () => {
      const r = await fetch("/api/metrics");
      return r.json();
    }),
  });
  const tickets = useQuery<{ tickets: { id: string; userId: string; subject: string; status: string; createdAt: string }[] }>({
    queryKey: ["tickets"],
    enabled: session.data?.user?.role === "admin",
    queryFn: () => fetch("/api/admin/tickets").then((r) => r.json()),
  });
  const audit = useQuery<{ audit: AuditRow[] }>({
    queryKey: ["audit"],
    enabled: session.data?.user?.role === "admin",
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit?limit=${limit}`);
      if (!res.ok) throw new Error("forbidden");
      return res.json();
    },
  });

  if (session.isLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (session.data?.user?.role !== "admin") {
    return (
      <div className="grid place-items-center p-20 text-center">
        <div>
          <div className="text-xl font-bold">Admin only</div>
          <p className="mt-2 text-sm text-muted-foreground">Audit trail memerlukan role admin. Sign in sebagai admin@cif.local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ScrollText className="h-6 w-6 text-intent-gold" /> Audit trail
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Immutable append-only log: login, generate, share, ack, watch, sim, cron runs.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Support escalations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {(tickets.data?.tickets ?? []).length === 0 && <p className="text-xs text-muted-foreground">Belum ada tiket escalated.</p>}
          {(tickets.data?.tickets ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md bg-white/5 p-2.5 text-xs">
              <span className="mono">{t.id}</span>
              <span className="flex-1 truncate px-3 text-muted-foreground">{t.subject}</span>
              <Badge variant={t.status === "open" ? "amber" : "muted"}>{t.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Value-delivered metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {metrics.data &&
            Object.entries(metrics.data).map(([k, v]) => (
              <div key={k} className="rounded-md bg-white/5 p-3 text-center">
                <div className="data-num text-xl font-extrabold">{v}</div>
                <div className="mono text-[9px] uppercase text-muted-foreground">{k.replace("_", " ")}</div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
          <CardDescription>{audit.data?.audit.length ?? 0} events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {audit.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}
          {audit.data?.audit.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-xs">
              <span className="flex items-center gap-2">
                <Badge variant="muted">{a.action}</Badge>
                <span className="text-muted-foreground">{a.actorEmail ?? "system"}</span>
                {a.resource && <span className="mono text-muted-foreground/70">{a.resource}</span>}
              </span>
              <span className="mono text-muted-foreground/70">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
          {audit.data && audit.data.audit.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Belum ada event tercatat.</p>}
          {audit.data && audit.data.audit.length >= limit && (
            <button className="mt-2 text-xs text-intent-teal hover:underline" onClick={() => setLimit((v) => v + 200)}>Load more</button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
