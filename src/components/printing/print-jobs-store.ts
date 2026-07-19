/**
 * Recent print jobs, kept locally in IndexedDB (photos are Blobs, which
 * localStorage cannot hold). Every print/export auto-saves a job so a botched
 * cut can be reprinted in one click. Device-local by design — nothing is
 * uploaded; per-branch persistence in Supabase can layer on later.
 */

import { CustomRow, SheetId } from "./print-config";
import { CaptionText } from "./sheet-canvas";
import { RestorableSlot } from "./use-photo-slots";

export interface PrintJobRecord {
  id: string;
  createdAt: number;
  packageId: string;
  packageName: string;
  sheetId: SheetId;
  /** Present when the job used the custom builder. */
  customRows?: CustomRow[];
  text: CaptionText;
  slots: RestorableSlot[];
  /** Small JPEG data-URL of the composed sheet for the list. */
  thumbnail: string;
}

const DB_NAME = "rms-print-jobs";
const STORE = "jobs";
const MAX_JOBS = 8;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveJob(record: PrintJobRecord): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await txDone(tx);
    await trimOldJobs(db);
  } finally {
    db.close();
  }
}

async function trimOldJobs(db: IDBDatabase): Promise<void> {
  const jobs = await getAll(db);
  const excess = jobs
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(MAX_JOBS);
  if (excess.length === 0) return;
  const tx = db.transaction(STORE, "readwrite");
  for (const job of excess) tx.objectStore(STORE).delete(job.id);
  await txDone(tx);
}

function getAll(db: IDBDatabase): Promise<PrintJobRecord[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PrintJobRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function listJobs(): Promise<PrintJobRecord[]> {
  const db = await openDb();
  try {
    const jobs = await getAll(db);
    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

export async function deleteJob(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** Small list thumbnail rendered from the composed sheet canvas. */
export function makeThumbnail(canvas: HTMLCanvasElement): string {
  const w = 96;
  const h = Math.round((canvas.height / canvas.width) * w);
  const thumb = document.createElement("canvas");
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, 0, 0, w, h);
  return thumb.toDataURL("image/jpeg", 0.7);
}
