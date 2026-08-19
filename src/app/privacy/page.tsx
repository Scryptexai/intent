import type { Metadata } from "next";
import { PrivacyClient } from "@/components/shell/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy · INTENT",
  description: "How INTENT collects, uses, and protects your data, including Google account data.",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
