import { AdminClient } from "@/components/shell/admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · INTENT", robots: "noindex" };

export default function AdminPage() {
  return <AdminClient />;
}
