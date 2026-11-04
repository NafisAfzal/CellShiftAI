"use client";

import { useEffect } from "react";
import { CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CellShift UI boundary caught error:", error.message);
  }, [error]);

  return (
    <main className="fallback-screen" role="alert">
      <div className="fallback-card surface">
        <div className="fallback-badge danger">
          <CircleAlert size={16} />
          <span>APPLICATION RUNTIME ERROR</span>
        </div>
        <h1>Unable to render the change review workbench</h1>
        <p>
          An unexpected client error interrupted the local interface. No live
          network equipment is connected, and deterministic simulation logic
          remains isolated on the server.
        </p>
        {error?.message && (
          <pre className="fallback-code">{error.message}</pre>
        )}
        <div className="fallback-actions">
          <button type="button" className="primary-btn" onClick={() => reset()}>
            <RefreshCw size={16} />
            Retry rendering workbench
          </button>
        </div>
        <div className="fallback-footnote">
          <ShieldCheck size={15} />
          <span>Synthetic localhost sandbox · Zero live RAN access</span>
        </div>
      </div>
    </main>
  );
}
