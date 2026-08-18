"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession, useInvalidateSession, emitUnauthorized } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

/** GDPR self-service: portability (export) + right-to-erasure (delete). */
export function AccountClient() {
  const session = useSession();
  const invalidate = useInvalidateSession();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { t } = useI18n();
  const u = session.data?.user;
  const billing = useQuery<{ subscription: { status: string; trialEndsAt: string | null }; payments: { id: string; method: string; status: string; amountUsd: number }[] }>({
    queryKey: ["billing"],
    enabled: !!u,
    queryFn: () => fetch("/api/billing/subscription").then((r) => r.json()),
  });

  if (session.isLoading) return null;
  if (!u) {
    return (
      <div className="grid place-items-center p-20 text-center">
        <p className="text-sm text-muted-foreground">{t("account.signin")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <UserRound className="h-6 w-6 text-intent-teal" /> {t("account.title")}
      </h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">{t("account.profile")}</CardTitle>
          <CardDescription>{t("account.profileSub")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email: <span className="mono">{u.email}</span></p>
          <p className="flex gap-2">
            <Badge variant="muted">role {u.role}</Badge>
            <Badge variant={u.plan === "ultimate" ? "default" : u.plan === "pro" ? "amber" : "muted"}>{u.plan}</Badge>
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">{t("account.billing")}</CardTitle>
          <CardDescription>
            {t("account.billingSub")} <Badge variant="muted">{billing.data?.subscription.status ?? "—"}</Badge>{" "}
            {billing.data?.subscription.trialEndsAt && <span className="text-xs">({t("account.trialEnds")} {billing.data.subscription.trialEndsAt.slice(0, 10)})</span>}{" "}
            · <Link href="/upgrade" className="text-intent-teal hover:underline">{t("upgrade.manage.link")}</Link> · {t("account.billingNote")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          {(billing.data?.payments ?? []).map((p) => (
            <p key={p.id} className="mono">{p.method} · ${p.amountUsd} · {p.status}</p>
          ))}
          {(billing.data?.payments ?? []).length === 0 && <p>{t("account.noPayments")}</p>}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">{t("account.privacy")}</CardTitle>
          <CardDescription>{t("account.privacySub")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetch("/api/account/export");
              if (res.status === 401) return emitUnauthorized();
              const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "cif-account-export.json";
              a.click();
            }}
          >
            <Download /> {t("account.export")}
          </Button>
          {!confirming ? (
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 /> {t("account.delete")}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={async () => {
                const res = await fetch("/api/account/delete", { method: "POST" });
                if (res.ok) {
                  invalidate();
                  router.push("/");
                  router.refresh();
                }
              }}
            >
              {t("account.deleteConfirm")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
