import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useUser } from "../components/auth/useUser";
import { logFeatureVisit, pathToFeature } from "../services/apiFeatureUsage";

// Ignore repeat visits to the same path within this window so that re-renders
// and React StrictMode's double-mount don't double-count a single navigation.
const DEDUPE_MS = 3000;

/**
 * Logs a feature/page visit on every route change for all roles except dev.
 * Dev activity is intentionally not recorded. Mounted once, in AppLayout.
 */
export function useFeatureUsageTracker() {
  const location = useLocation();
  const { user, isDev, isLoading } = useUser();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (isLoading || !user?.id) return;
    // Only dev activity is excluded from tracking.
    if (isDev) return;

    const path = location.pathname;
    const now = Date.now();
    if (
      last.current &&
      last.current.path === path &&
      now - last.current.at < DEDUPE_MS
    ) {
      return;
    }
    last.current = { path, at: now };

    void logFeatureVisit({
      userId: user.id,
      feature: pathToFeature(path),
      path,
    });
  }, [location.pathname, user?.id, isDev, isLoading]);
}
