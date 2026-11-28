// Unknown URL: offer a way back instead of a dead end.
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <p className="text-6xl font-semibold tabular-nums text-brand-navy">404</p>
      <p className="text-sm text-slate-500">That page does not exist in this portal.</p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
