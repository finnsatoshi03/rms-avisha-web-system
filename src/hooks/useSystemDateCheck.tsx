import { useEffect, useState } from "react";

import {
  CLOCK_SKEW_WARN_THRESHOLD_MS,
  getClockOffsetMs,
  isServerTimeSynced,
  subscribeToClockOffset,
} from "../lib/server-time";

export type ClockSkew = {
  /**
   * `serverNow - clientNow`. Negative means the PC clock runs AHEAD of the
   * server, which is the failure mode seen in the field.
   */
  offsetMs: number;
  /** True once the offset has actually been measured against the server. */
  isSynced: boolean;
  /** True when the offset is large enough to be worth telling the user about. */
  isSkewed: boolean;
};

/**
 * Reports how far this machine's clock is from the server's.
 *
 * This used to poll worldtimeapi.org and hard-redirect to /date-error, which
 * was both flaky and dead code. It now reads the offset that src/lib/server-time
 * already measures, so there is no extra network call — and because that module
 * corrects every persisted timestamp, a skewed clock no longer corrupts data.
 * The remaining value is telling the user their PC clock needs fixing, so this
 * is advisory only and never blocks the app.
 */
export function useSystemDateCheck(
  thresholdMs: number = CLOCK_SKEW_WARN_THRESHOLD_MS
): ClockSkew {
  const [offsetMs, setOffsetMs] = useState(getClockOffsetMs);
  const [isSynced, setIsSynced] = useState(isServerTimeSynced);

  useEffect(() => {
    // The bootstrap sync may already have landed before this mounted.
    setOffsetMs(getClockOffsetMs());
    setIsSynced(isServerTimeSynced());

    return subscribeToClockOffset((next) => {
      setOffsetMs(next);
      setIsSynced(true);
    });
  }, []);

  return {
    offsetMs,
    isSynced,
    isSkewed: isSynced && Math.abs(offsetMs) > thresholdMs,
  };
}
