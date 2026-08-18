"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/components/shell/plan-context";

/**
 * Entry point upgrade: semua tombol Upgrade & event `cif:open-upgrade`
 * (fitur locked / kuota habis) membawa user ke halaman full-screen /upgrade —
 * experience subscription production-ready (bukan modal kecil).
 */
export function UpgradeDialog() {
  const { plan } = usePlan();
  const router = useRouter();

  useEffect(() => {
    const handler = () => router.push("/upgrade");
    window.addEventListener("cif:open-upgrade", handler);
    return () => window.removeEventListener("cif:open-upgrade", handler);
  }, [router]);

  if (plan === "ultimate") {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/upgrade")} title="Kelola langganan" className="border-intent-teal/40 text-intent-teal hover:bg-intent-teal/10">
        <Gem /> Ultimate
      </Button>
    );
  }

  if (plan === "pro") {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/upgrade")} title="Kelola langganan">
        <Crown className="text-intent-gold" /> Pro
      </Button>
    );
  }

  return (
    <Button variant="amber" size="sm" onClick={() => router.push("/upgrade")}>
      <Crown /> Upgrade
    </Button>
  );
}
