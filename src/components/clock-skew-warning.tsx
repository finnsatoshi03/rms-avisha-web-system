import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatDistanceStrict } from "date-fns";

import { useSystemDateCheck } from "../hooks/useSystemDateCheck";
import { getServerNow } from "../lib/server-time";

/**
 * Advisory banner shown when this PC's clock disagrees with the server.
 *
 * Deliberately non-blocking: server time is already the source of truth for
 * every saved timestamp and every day-count, so a wrong clock is now a local
 * annoyance rather than a data-integrity problem. The banner exists so whoever
 * is on the terminal knows to fix the machine.
 */
export default function ClockSkewWarning() {
  const { isSkewed, offsetMs } = useSystemDateCheck();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isSkewed || isDismissed) return null;

  // offsetMs is `server - client`, so a negative offset means this PC is ahead.
  const isAhead = offsetMs < 0;
  const magnitude = formatDistanceStrict(0, Math.abs(offsetMs));

  return (
    <div
      role="status"
      className="mx-6 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
    >
      <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          This computer's clock is {magnitude} {isAhead ? "ahead of" : "behind"}{" "}
          the server.
        </p>
        <p className="mt-0.5 text-yellow-700">
          Records are still saved with the correct server time (
          {getServerNow().toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          ), but please fix this PC's date &amp; time so on-screen clocks match.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss clock warning"
        className="shrink-0 rounded p-0.5 text-yellow-700 hover:bg-yellow-100"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
