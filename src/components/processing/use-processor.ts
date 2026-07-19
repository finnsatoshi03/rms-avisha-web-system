import { useCallback, useEffect, useRef, useState } from "react";
import {
  LnaPermission,
  ProcessorHealth,
  fetchHealth,
  queryLnaPermission,
} from "./processor-client";

/**
 * What the UI should show for the local service right now.
 * - "ready":    /health answered status "ok" — enable the Process button.
 * - "warming":  service up but model still downloading/loading.
 * - "starting": a launch was just requested; the exe can take up to a minute
 *               to unpack and boot, so don't show "not running" yet.
 * - "blocked":  the browser's Local Network Access permission is denied.
 * - "offline":  unreachable (not running, or LNA prompt not yet answered).
 */
export type ProcessorAvailability =
  | "checking"
  | "ready"
  | "warming"
  | "starting"
  | "blocked"
  | "offline";

const POLL_MS = 5000;
const STARTING_POLL_MS = 2000;
const STARTING_GRACE_MS = 90_000;

export function useProcessor(enabled: boolean) {
  const [health, setHealth] = useState<ProcessorHealth | null>(null);
  const [permission, setPermission] = useState<LnaPermission>("unsupported");
  const [availability, setAvailability] =
    useState<ProcessorAvailability>("checking");
  const timerRef = useRef<number>();
  const launchUntilRef = useRef(0);

  const refresh = useCallback(async () => {
    const [h, perm] = await Promise.all([fetchHealth(), queryLnaPermission()]);
    setHealth(h);
    setPermission(perm);
    if (h) {
      launchUntilRef.current = 0;
      setAvailability(h.status === "ok" ? "ready" : "warming");
    } else if (perm === "denied") {
      setAvailability("blocked");
    } else if (Date.now() < launchUntilRef.current) {
      setAvailability("starting");
    } else {
      setAvailability("offline");
    }
  }, []);

  /** Call right after firing the launch protocol: shows "starting" and polls
   * faster until the service answers or the grace period runs out. */
  const markLaunched = useCallback(() => {
    launchUntilRef.current = Date.now() + STARTING_GRACE_MS;
    setAvailability("starting");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setAvailability("checking");
    void refresh();
    const tick = () => {
      void refresh();
      const delay =
        Date.now() < launchUntilRef.current ? STARTING_POLL_MS : POLL_MS;
      timerRef.current = window.setTimeout(tick, delay);
    };
    timerRef.current = window.setTimeout(tick, STARTING_POLL_MS);
    return () => window.clearTimeout(timerRef.current);
  }, [enabled, refresh]);

  return { health, permission, availability, refresh, markLaunched };
}
