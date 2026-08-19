import type { Metadata } from "next";
import { AboutClient } from "@/components/shell/legal-content";

export const metadata: Metadata = {
  title: "About · INTENT",
  description: "What INTENT is, how its knowledge is built and verified, and who it serves.",
};

export default function AboutPage() {
  return <AboutClient />;
}
