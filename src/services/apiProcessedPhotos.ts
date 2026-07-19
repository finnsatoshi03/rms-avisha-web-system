import { supabase } from "./supabase";

/**
 * Storage for photos produced by the local photo processor. Uploads go
 * straight from the browser to Supabase Storage with the signed-in user's
 * session — never through a server function (see /CONTRACT.md).
 *
 * One-time setup: a private bucket named "processed-photos" must exist in the
 * Supabase project (Dashboard → Storage → New bucket) with read/write policies
 * for authenticated users, mirroring the existing "billing-receipts" bucket.
 */
export const PROCESSED_PHOTOS_BUCKET = "processed-photos";

export interface ProcessedPhotoObject {
  path: string;
  name: string;
  createdAt: string;
}

function describeStorageError(message: string): string {
  if (/bucket.*not.*found/i.test(message)) {
    return `Storage bucket "${PROCESSED_PHOTOS_BUCKET}" does not exist yet — create it in the Supabase dashboard (Storage → New bucket).`;
  }
  if (/row-level security/i.test(message)) {
    return `The "${PROCESSED_PHOTOS_BUCKET}" bucket exists but has no storage policies — add insert/select policies for authenticated users (Supabase dashboard → Storage → ${PROCESSED_PHOTOS_BUCKET} → Policies).`;
  }
  return message;
}

async function userFolder(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? "shared";
}

export async function uploadProcessedPhoto(
  file: File,
  label: string
): Promise<string> {
  const folder = await userFolder();
  const safeLabel = label.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const path = `${folder}/${Date.now()}-${safeLabel}.png`;

  const { error } = await supabase.storage
    .from(PROCESSED_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    });
  if (error) {
    throw new Error("Failed to save photo: " + describeStorageError(error.message));
  }
  return path;
}

/** Most recent processed photos for the signed-in user, newest first. */
export async function listProcessedPhotos(
  limit = 12
): Promise<ProcessedPhotoObject[]> {
  const folder = await userFolder();
  const { data, error } = await supabase.storage
    .from(PROCESSED_PHOTOS_BUCKET)
    .list(folder, {
      limit,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) {
    throw new Error(describeStorageError(error.message));
  }
  return (data ?? [])
    .filter((o) => o.name.endsWith(".png"))
    .map((o) => ({
      path: `${folder}/${o.name}`,
      name: o.name,
      createdAt: o.created_at ?? "",
    }));
}

export async function downloadProcessedPhoto(path: string): Promise<File> {
  const { data, error } = await supabase.storage
    .from(PROCESSED_PHOTOS_BUCKET)
    .download(path);
  if (error || !data) {
    throw new Error(
      "Failed to load saved photo: " + describeStorageError(error?.message ?? "")
    );
  }
  const name = path.split("/").pop() ?? "processed.png";
  return new File([data], name, { type: "image/png" });
}
