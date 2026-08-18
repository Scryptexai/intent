import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "404 · INTENT" };

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <SearchX className="mx-auto h-8 w-8 text-intent-teal" />
        <h2 className="mt-3 text-xl font-bold">Outside the monitored universe</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page or project you requested is not in the INTENT catalog.</p>
        <Link href="/">
          <Button className="mt-4" variant="outline">Back to Sentinel</Button>
        </Link>
      </div>
    </div>
  );
}
