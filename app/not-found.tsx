import Link from "next/link";
import { ArrowLeft, Compass, ShieldCheck } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="fallback-screen">
      <div className="fallback-card surface">
        <div className="fallback-badge neutral">
          <Compass size={16} />
          <span>404 · ROUTE NOT FOUND</span>
        </div>
        <h1>This workspace route does not exist</h1>
        <p>
          CellShift AI operates as a single-screen pre-change impact review
          workbench at the root localhost URL. Return to the main Network Change
          Lab to inspect the 5-cell synthetic topology.
        </p>
        <div className="fallback-actions">
          <Link href="/" className="primary-btn fallback-link">
            <ArrowLeft size={16} />
            Return to Network Change Lab
          </Link>
        </div>
        <div className="fallback-footnote">
          <ShieldCheck size={15} />
          <span>Synthetic localhost sandbox · Deterministic RF proxy v1.0</span>
        </div>
      </div>
    </main>
  );
}
