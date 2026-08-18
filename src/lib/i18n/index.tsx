"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type DictKey } from "./locales/en";
export type { DictKey };
import { id } from "./locales/id";
import { zh } from "./locales/zh";
import { es } from "./locales/es";

/**
 * Global-ready i18n architecture (not a translation bolt-on):
 * - locale registry: add a language by dropping a partial dictionary file;
 *   missing keys fall back to English automatically.
 * - detection: localStorage → navigator.languages → en.
 * - formatting: Intl (numbers/dates/compact currency) per active locale, so
 *   data renders correctly for every market without touching components.
 */

export type Locale = "en" | "id" | "zh" | "es";

export const LOCALES: Record<Locale, { label: string; dict: Partial<Record<DictKey, string>>; bcp47: string }> = {
  en: { label: "English", dict: {}, bcp47: "en-US" },
  id: { label: "Bahasa Indonesia", dict: id, bcp47: "id-ID" },
  zh: { label: "中文", dict: zh, bcp47: "zh-CN" },
  es: { label: "Español", dict: es, bcp47: "es-ES" },
};

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: DictKey) => string;
  fmtNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtMoney: (usd: number) => string;
  fmtDate: (iso: string) => string;
}

const Ctx = createContext<I18nCtx>({
  locale: "en",
  setLocale: () => {},
  t: (k) => en[k],
  fmtNumber: (n) => String(n),
  fmtMoney: (n) => `$${n}`,
  fmtDate: (iso) => iso.slice(0, 10),
});

function detect(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("cif-locale") as Locale | null;
  if (saved && LOCALES[saved]) return saved;
  return "en"; // default produk: English; locale lain via switcher eksplisit
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const l = detect();
    setLocaleState(l);
    document.documentElement.lang = LOCALES[l].bcp47;
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const bcp = LOCALES[locale].bcp47;
    const dict = LOCALES[locale].dict;
    return {
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        localStorage.setItem("cif-locale", l);
        document.documentElement.lang = LOCALES[l].bcp47;
      },
      t: (k) => dict[k] ?? en[k],
      fmtNumber: (n, opts) => new Intl.NumberFormat(bcp, opts).format(n),
      fmtMoney: (usd) =>
        new Intl.NumberFormat(bcp, { style: "currency", currency: "USD", notation: usd >= 1000 ? "compact" : "standard", maximumFractionDigits: usd >= 1000 ? 1 : 2 }).format(usd),
      fmtDate: (iso) => new Intl.DateTimeFormat(bcp, { dateStyle: "medium" }).format(new Date(iso)),
    };
  }, [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Back-compat alias used across the app. */
export function useI18n() {
  const ctx = useContext(Ctx);
  return {
    ...ctx,
    lang: ctx.locale,
    setLang: ctx.setLocale,
  };
}
