"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/** Enterprise sign-in: scrypt credentials or Sign in with Google (OAuth 2.0 PKCE). */
export function LoginClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("admin@cif.local");
  const [password, setPassword] = useState("cif-enterprise-2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e) setError(`${t("login.error")} ${e.replace(/_/g, " ")}`);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "Login failed");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid-bg grid min-h-screen place-items-center p-4">
      <img src="/og-image.png" alt="INTENT — Know the Intent. See the Signal." className="pointer-events-none fixed inset-0 m-auto h-full w-full max-w-none object-cover opacity-20 select-none" aria-hidden />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-intent-teal" /> INTENT
          </CardTitle>
          <CardDescription>{t("login.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="text-xs text-intent-rose">{error}</p>}
            <Button className="w-full" disabled={busy}>
              {busy ? t("login.signingin") : t("login.submit")}
            </Button>
            <div className="relative py-1 text-center">
              <span className="relative z-10 bg-intent-surface px-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t("login.or")}</span>
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.6z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.8-5l-3.9 3C3.3 21.3 7.3 24 12 24z" />
                <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4l-3.9-3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l3.9-3z" />
                <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.9 1.6l3.4-3.3C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.9 3c1-2.9 3.7-4.9 6.8-4.9z" />
              </svg>
              {t("login.google")}
            </Button>
          </form>
          <p className="mt-3 text-center text-[11px] text-intent-muted">
            {t("login.noaccount")}{" "}
            <Link href="/signup" className="text-intent-teal hover:underline">
              {t("login.signupta")}
            </Link>
          </p>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            {t("login.terms1")}{" "}
            <Link href="/terms" className="text-intent-teal hover:underline">Terms</Link> &{" "}
            <Link href="/privacy" className="text-intent-teal hover:underline">{t("login.privacy")}</Link>.
            <br />
            {t("login.demo")} admin@cif.local · analyst@cif.local · viewer@cif.local — <span className="mono">cif-enterprise-2026</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
