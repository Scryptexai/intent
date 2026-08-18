import { SignupClient } from "@/components/shell/signup-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up · INTENT", robots: "noindex" };

export default function SignupPage() {
  return <SignupClient />;
}
