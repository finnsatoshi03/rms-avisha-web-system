/**
 * Progress tracking for the Statement of Account onboarding checklist.
 *
 * Steps are checked off when the user performs the REAL action in the app
 * (learn-by-doing), not by reading. State lives in localStorage per browser —
 * this is a tutorial aid, not audit data.
 */

export const SOA_STEPS = [
  "visit_billing",
  "open_account",
  "attach_charge",
  "generate_statement",
  "send_statement",
  "record_payment",
] as const;

export type SoaStep = (typeof SOA_STEPS)[number];

export type SoaLang = "en" | "tl";

export type SoaProgressState = {
  steps: Partial<Record<SoaStep, boolean>>;
  dismissed: boolean;
  celebrated: boolean;
  lang: SoaLang;
};

const STORAGE_KEY = "soa-tutorial-progress";
const PROGRESS_EVENT = "soa-progress-changed";

/** Fired by the checklist's "Show me" buttons. Listeners that can handle the
 *  requested tour call `event.preventDefault()` to claim it. */
export const SOA_SHOW_ME_EVENT = "soa-show-me";

const defaultState: SoaProgressState = {
  steps: {},
  dismissed: false,
  celebrated: false,
  lang: "en",
};

export function getSoaProgress(): SoaProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as Partial<SoaProgressState>;
    return { ...defaultState, ...parsed, steps: parsed.steps ?? {} };
  } catch {
    return { ...defaultState };
  }
}

function saveSoaProgress(state: SoaProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked — tutorial state is non-critical.
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

/** Mark a step complete. Safe to call repeatedly from mutation successes. */
export function markSoaStep(step: SoaStep) {
  const state = getSoaProgress();
  if (state.steps[step]) return;
  state.steps[step] = true;
  saveSoaProgress(state);
}

export function setSoaDismissed(dismissed: boolean) {
  const state = getSoaProgress();
  state.dismissed = dismissed;
  saveSoaProgress(state);
}

export function setSoaCelebrated() {
  const state = getSoaProgress();
  state.celebrated = true;
  saveSoaProgress(state);
}

export function setSoaLang(lang: SoaLang) {
  const state = getSoaProgress();
  state.lang = lang;
  saveSoaProgress(state);
}

/** Restart the tutorial (used by the "Tutorial" button on the Billing page). */
export function resetSoaTutorial() {
  saveSoaProgress({ ...defaultState, lang: getSoaProgress().lang });
}

export function subscribeSoaProgress(callback: () => void): () => void {
  window.addEventListener(PROGRESS_EVENT, callback);
  // Cross-tab updates
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Ask whichever billing surface is mounted to spotlight a tour.
 * Returns true if a listener claimed the request (called preventDefault).
 */
export function requestSoaShowMe(featureKey: string): boolean {
  const event = new CustomEvent(SOA_SHOW_ME_EVENT, {
    detail: { featureKey },
    cancelable: true,
  });
  return !window.dispatchEvent(event);
}
