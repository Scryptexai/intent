"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/**
 * Cookie consent (compliance posture): functional cookies only (session,
 * OAuth state). Choice persisted; no tracking cookies exist either way.
 */
export function ConsentBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cif-consent")) setShow(true);
  }, []);
  if (!show) return null;
  const choose = (v: "accepted" | "rejected") => {
    localStorage.setItem("cif-consent", v);
    setShow(false);
  };
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 panel p-4 shadow-2xl" role="dialog" aria-label="Cookie consent">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("consent.text")}{" "}
        <Link href="/privacy" className="text-intent-teal hover:underline">{t("login.privacy")}</Link>.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => choose("rejected")}>{t("consent.reject")}</Button>
        <Button size="sm" onClick={() => choose("accepted")}>{t("consent.accept")}</Button>
      </div>
    </div>
  );
}
