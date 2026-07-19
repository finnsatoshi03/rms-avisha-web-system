/**
 * Client for the local photo-processor service (see /CONTRACT.md at the
 * project parent folder). The service runs natively on the shop PC at
 * 127.0.0.1:8765; this deployed HTTPS app reaches it via Chromium's Local
 * Network Access (Chrome/Edge 142+): requests are flagged with
 * `targetAddressSpace: "local"`, which exempts them from mixed-content
 * blocking and triggers the LNA permission prompt on first use.
 */

// Always the machine the browser runs on — processing never happens on a
// server, so this is deliberately not configurable via deploy-time env.
export const PROCESSOR_URL = "http://127.0.0.1:8765";

/** Custom scheme the packaged exe registers (HKCU) on its first run. */
export const PROCESSOR_PROTOCOL_URL = "rms-photoprocessor://start";

export const PROCESSOR_DOWNLOAD_URL =
  "https://github.com/finnsatoshi03/photo-processor/releases/latest/download/photo-processor.exe";

/**
 * Ask Windows to start an installed photo-processor via its URL protocol.
 * Uses a throwaway iframe so the page never navigates. If the exe was never
 * run (protocol unregistered) this is a silent no-op — the caller keeps
 * polling /health and falls back to download instructions.
 */
export function launchProcessor(): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = PROCESSOR_PROTOCOL_URL;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 3000);
}

export type ModelState = "unloaded" | "loading" | "ready";

/** Commercial-safe models the service ships; mirrors the contract. */
export const PROCESSOR_MODELS = [
  {
    id: "u2net",
    label: "Standard (fast)",
    description: "Good quality, quick results",
  },
  {
    id: "birefnet-general",
    label: "High quality (slower)",
    description: "Sharper edges — one-time ~1 GB download",
  },
] as const;

export type ProcessorModelId = (typeof PROCESSOR_MODELS)[number]["id"];

export interface ModelProgress {
  done: number;
  /** Approximate — clamp bars at 99% until the model state flips to ready. */
  total: number;
}

export interface ProcessorHealth {
  status: "ok" | "loading";
  version: string;
  model: string;
  license: string;
  gpu: boolean;
  models?: Record<string, ModelState>;
  model_progress?: Record<string, ModelProgress>;
}

export interface ProcessRequest {
  file: File | Blob;
  /** Contract preset; mutually exclusive with widthPx/heightPx. */
  sizePreset?: "1x1" | "2x2" | "passport" | "visa";
  widthPx?: number;
  heightPx?: number;
  bgColor: string;
  autoCrop: boolean;
  model: ProcessorModelId;
}

export interface ProcessResult {
  file: File;
  widthPx: number;
  heightPx: number;
  faceDetected: boolean;
}

export type LnaPermission = "granted" | "denied" | "prompt" | "unsupported";

/** Thrown when the service answered but refused the request. */
export class ProcessorError extends Error {}

/**
 * Chromium's naming for 127.0.0.1 changed between the PNA and LNA specs
 * ("local" vs "loopback"), and a mismatched `targetAddressSpace` fails the
 * fetch outright — while dev pages on localhost need no flag at all. Try each
 * mode and stick with the first one that reaches the service.
 */
type AddressSpaceMode = "local" | "loopback" | "none";
const MODES: AddressSpaceMode[] = ["local", "loopback", "none"];
let workingMode: AddressSpaceMode | null = null;

function fetchWithMode(
  path: string,
  init: RequestInit,
  mode: AddressSpaceMode
): Promise<Response> {
  const opts =
    mode === "none" ? init : { ...init, targetAddressSpace: mode };
  // `fetch` typings don't know LNA yet; keep the cast in one place.
  return fetch(`${PROCESSOR_URL}${path}`, opts as RequestInit);
}

async function localFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  if (workingMode !== null) {
    try {
      return await fetchWithMode(path, init, workingMode);
    } catch {
      workingMode = null; // service or mode changed — rediscover below
    }
  }
  let lastError: unknown = new TypeError("Failed to fetch");
  for (const mode of MODES) {
    try {
      const res = await fetchWithMode(path, init, mode);
      workingMode = mode;
      return res;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Read the Local Network Access permission where the browser exposes it.
 * Only Chromium 142+ knows the name; elsewhere we report "unsupported" and
 * rely on fetch failures to signal blocked access.
 */
export async function queryLnaPermission(): Promise<LnaPermission> {
  try {
    const status = await navigator.permissions.query({
      name: "local-network-access" as PermissionName,
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

/** Probe /health. Returns null when the service is unreachable or blocked. */
export async function fetchHealth(): Promise<ProcessorHealth | null> {
  try {
    const res = await localFetch("/health", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProcessorHealth;
  } catch {
    return null;
  }
}

/** Ask the service to start loading a model; poll /health for readiness. */
export async function warmModel(model: ProcessorModelId): Promise<void> {
  try {
    await localFetch("/models/warm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Health polling surfaces the service being unreachable; nothing to do.
  }
}

export async function processPhoto(req: ProcessRequest): Promise<ProcessResult> {
  const form = new FormData();
  form.append("image", req.file);
  if (req.sizePreset) {
    form.append("size_preset", req.sizePreset);
  } else {
    form.append("width_px", String(req.widthPx));
    form.append("height_px", String(req.heightPx));
  }
  form.append("bg_color", req.bgColor);
  form.append("auto_crop", req.autoCrop ? "true" : "false");
  form.append("model", req.model);

  let res: Response;
  try {
    res = await localFetch("/process", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new ProcessorError(
      "Could not reach the photo processor. It may have stopped, or local network access was blocked."
    );
  }

  if (!res.ok) {
    let detail = `Processing failed (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ProcessorError(detail);
  }

  const body = (await res.json()) as {
    image: string;
    width_px: number;
    height_px: number;
    face_detected?: boolean;
  };
  const bytes = Uint8Array.from(atob(body.image), (c) => c.charCodeAt(0));
  const file = new File([bytes], `processed-${Date.now()}.png`, {
    type: "image/png",
  });
  return {
    file,
    widthPx: body.width_px,
    heightPx: body.height_px,
    faceDetected: body.face_detected ?? true,
  };
}
