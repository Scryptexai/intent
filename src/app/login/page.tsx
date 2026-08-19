import { LoginClient } from "@/components/shell/login-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in · INTENT", robots: "noindex" };

export default function LoginPage() {
  return <LoginClient />;
}
