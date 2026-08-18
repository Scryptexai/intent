import type { Metadata } from "next";
import { TermsClient } from "@/components/shell/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service · INTENT",
  description: "Terms & conditions for using INTENT, including AI-generated content and Google sign-in.",
};

export default function TermsPage() {
  return <TermsClient />;
}
