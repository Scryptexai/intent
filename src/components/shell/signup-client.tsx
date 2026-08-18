"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Sign up: email+password (scrypt) atau Google. Trial Pro 30 hari otomatis. */
export function SignupClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.message ?? d.error ?? t("signup.failed"));
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid-bg grid min-h-screen place-items-center p-4">
      <img src="/og-image.png" alt="" aria-hidden className="pointer-events-none fixed inset-0 m-auto h-full w-full max-w-none object-cover opacity-20 select-none" />
      <Card className="relative w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-intent-gold" /> {t("signup.title")}
          </CardTitle>
          <CardDescription>{t("signup.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("signup.name")}</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("signup.password")}</Label>
              <Input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </div>
            {error && <p className="text-xs text-intent-rose">{error}</p>}
            <Button className="w-full" disabled={busy}>
              {busy ? t("signup.creating") : t("signup.submit")}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => (window.location.href = "/api/auth/google")}>
              {t("login.google")}
            </Button>
          </form>
          <p className="mt-4 text-center text-[11px] text-intent-muted">
            {t("signup.have")}{" "}
            <Link href="/login" className="text-intent-teal hover:underline">
              {t("login.submit")}
            </Link>{" "}
            · {t("signup.agree")}{" "}
            <Link href="/terms" className="text-intent-teal hover:underline">
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" className="text-intent-teal hover:underline">
              {t("login.privacy")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
