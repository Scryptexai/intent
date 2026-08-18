"use client";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // structured error sink hook (Sentry DSN via env in production)
    console.error("[cif:error]", error.message, error.digest ?? "");
  }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <TriangleAlert className="mx-auto h-8 w-8 text-intent-gold" />
        <h2 className="mt-3 text-xl font-bold">Something broke on our side</h2>
        <p className="mt-2 text-sm text-muted-foreground">The incident has been logged. You can retry, or return to the Sentinel.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>Back to Sentinel</Button>
        </div>
      </div>
    </div>
  );
}
