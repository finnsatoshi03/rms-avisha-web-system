import { supabase, supabaseUrl, supabaseKey } from "../services/supabase";

/**
 * Authoritative "now" for the whole app.
 *
 * Several client machines in the field run with their clock set hours or days
 * ahead, which used to leak straight into persisted timestamps and into every
 * "how many days old is this?" calculation. This module measures the offset
 * between the browser clock and the Supabase server once at bootstrap, caches
 * it, and hands out a corrected `now`.
 *
 * Primary time source is the `server_now()` RPC — the value arrives in the
 * response body, so it is immune to CORS header restrictions and carries full
 * timestamp precision. The HTTP `Date` header is a fallback for the window
 * before that migration is applied; note PostgREST only marks `Date` as an
 * exposed header on successful responses, so the fallback needs a live session.
 */

const OFFSET_STORAGE_KEY = "rms:server-time-offset";

/** Re-measure this often so a long-lived tab cannot drift. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Offsets under this are ordinary clock jitter and are not worth reporting. */
export const CLOCK_SKEW_WARN_THRESHOLD_MS = 5 * 60 * 1000;

/** A cached offset older than this is discarded rather than trusted. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type OffsetListener = (offsetMs: number) => void;

let offsetMs = 0;
let hasSynced = false;
let inFlight: Promise<number | null> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<OffsetListener>();

/**
 * Seed from localStorage so the first render is already corrected instead of
 * spending a round trip on the raw browser clock.
 */
function loadCachedOffset(): void {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as { offsetMs?: unknown; at?: unknown };
    const cachedOffset = Number(parsed.offsetMs);
    const measuredAt = Number(parsed.at);
    if (!Number.isFinite(cachedOffset) || !Number.isFinite(measuredAt)) return;

    // `at` is a server-corrected stamp, so comparing it against a skewed
    // client clock can only make the cache look older than it is — which
    // fails safe by forcing a fresh measurement.
    if (Math.abs(Date.now() + cachedOffset - measuredAt) > CACHE_MAX_AGE_MS) {
      return;
    }

    offsetMs = cachedOffset;
  } catch {
    // Private-mode / quota errors are non-fatal: we just start at offset 0.
  }
}

function persistOffset(value: number): void {
  try {
    localStorage.setItem(
      OFFSET_STORAGE_KEY,
      JSON.stringify({ offsetMs: value, at: Date.now() + value })
    );
  } catch {
    // Ignore — the in-memory offset is what actually matters this session.
  }
}

loadCachedOffset();

/**
 * Comparing the server instant against the *midpoint* of the round trip keeps
 * network latency from biasing the offset in either direction.
 */
function offsetFrom(
  serverMs: number,
  sentAt: number,
  receivedAt: number
): number {
  return serverMs - (sentAt + (receivedAt - sentAt) / 2);
}

/** Primary source: authoritative clock in the response body, full precision. */
async function measureViaRpc(): Promise<number | null> {
  const sentAt = Date.now();
  const { data, error } = await supabase.rpc("server_now");
  const receivedAt = Date.now();

  if (error || !data) return null;

  const serverMs = new Date(data as string).getTime();
  if (!Number.isFinite(serverMs)) return null;

  return offsetFrom(serverMs, sentAt, receivedAt);
}

/**
 * Fallback source for before the `server_now()` migration is applied. The
 * session's access token is required because PostgREST only lists `Date` in
 * `Access-Control-Expose-Headers` on responses it actually serves — the
 * unauthenticated 401 from the gateway hides it from the browser.
 */
async function measureViaDateHeader(): Promise<number | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const sentAt = Date.now();

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  const receivedAt = Date.now();
  const dateHeader = response.headers.get("Date");
  if (!dateHeader) return null;

  const serverMs = new Date(dateHeader).getTime();
  if (!Number.isFinite(serverMs)) return null;

  // The header is truncated to a whole second, so the true instant sits
  // somewhere in the following second — assume the midpoint.
  return offsetFrom(serverMs + 500, sentAt, receivedAt);
}

/**
 * Measures `serverNow - clientNow` in milliseconds, or null if every probe
 * fails (offline, or logged out before the migration is applied).
 */
async function measureOffset(): Promise<number | null> {
  return (await measureViaRpc()) ?? (await measureViaDateHeader());
}

/**
 * Probes the server and updates the cached offset. Concurrent callers share a
 * single in-flight request. Resolves to the new offset, or null if the probe
 * failed (in which case the previous offset is kept).
 */
export async function syncServerTime(): Promise<number | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const measured = await measureOffset();
    if (measured === null) return null;

    offsetMs = measured;
    hasSynced = true;
    persistOffset(measured);
    listeners.forEach((listener) => listener(measured));
    return measured;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Server-authoritative current time. Falls back to the client clock (plus any
 * cached offset) until the first successful sync — never blocks. */
export function getServerNow(): Date {
  return new Date(Date.now() + offsetMs);
}

/** Server-authoritative current time as an ISO-8601 UTC string. */
export function getServerNowISO(): string {
  return getServerNow().toISOString();
}

/** Server-authoritative epoch milliseconds — the `Date.now()` replacement. */
export function getServerNowEpochMs(): number {
  return Date.now() + offsetMs;
}

/** `serverNow - clientNow`. Positive means the PC clock is running behind. */
export function getClockOffsetMs(): number {
  return offsetMs;
}

/** True once the offset has been measured against the server at least once. */
export function isServerTimeSynced(): boolean {
  return hasSynced;
}

/** Subscribe to offset changes. Returns an unsubscribe function. */
export function subscribeToClockOffset(listener: OffsetListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Starts the background sync: once now, then periodically, on reconnect, and
 * whenever a backgrounded tab becomes visible again (a suspended tab's clock
 * can come back stale). Safe to call more than once.
 */
export function startServerTimeSync(): void {
  if (refreshTimer !== null) return;

  void syncServerTime();

  refreshTimer = setInterval(() => {
    void syncServerTime();
  }, REFRESH_INTERVAL_MS);

  window.addEventListener("online", () => {
    void syncServerTime();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void syncServerTime();
    }
  });
}
