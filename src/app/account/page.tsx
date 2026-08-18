import { AccountClient } from "@/components/shell/account-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account · INTENT", robots: "noindex" };

export default function AccountPage() {
  return <AccountClient />;
}
