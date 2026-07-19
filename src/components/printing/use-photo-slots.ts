import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One uploaded photo plus its framing controls. The transform applies to every
 * cell the slot fills — all copies on the sheet stay identical, which is what
 * ID-photo sheets need. The image content itself is never modified.
 */
export interface SlotState {
  url: string;
  fileName: string;
  /** Original upload, kept so recent jobs can persist the photo. */
  file: Blob;
  image: HTMLImageElement | null;
  /** 1 = exact cover fit; >1 zooms in. */
  zoom: number;
  /** -1..1 pan across the cropped-off excess (0 = centered). */
  offsetX: number;
  offsetY: number;
  /** Clockwise, degrees: 0 | 90 | 180 | 270. Framing only — no resampling. */
  rotation: number;
}

export type SlotTransform = Pick<
  SlotState,
  "zoom" | "offsetX" | "offsetY" | "rotation"
>;

/** A slot as persisted in a recent job (blob instead of object URL). */
export interface RestorableSlot extends SlotTransform {
  index: number;
  blob: Blob;
  fileName: string;
}

const DEFAULT_TRANSFORM: SlotTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export function usePhotoSlots() {
  const [slots, setSlots] = useState<Record<number, SlotState>>({});
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(
    () => () => {
      Object.values(slotsRef.current).forEach((s) => URL.revokeObjectURL(s.url));
    },
    []
  );

  /** Attach the decoded image once it loads, ignoring stale loads. */
  const attachImage = useCallback((slot: number, url: string) => {
    const image = new Image();
    image.onload = () => {
      setSlots((prev) => {
        const current = prev[slot];
        if (!current || current.url !== url) return prev;
        return { ...prev, [slot]: { ...current, image } };
      });
    };
    image.src = url;
  }, []);

  const setPhoto = useCallback(
    (slot: number, file: File) => {
      const url = URL.createObjectURL(file);
      setSlots((prev) => {
        const old = prev[slot];
        if (old) URL.revokeObjectURL(old.url);
        return {
          ...prev,
          [slot]: {
            url,
            fileName: file.name,
            file,
            image: null,
            ...DEFAULT_TRANSFORM,
          },
        };
      });
      attachImage(slot, url);
    },
    [attachImage]
  );

  const clearPhoto = useCallback((slot: number) => {
    setSlots((prev) => {
      const old = prev[slot];
      if (!old) return prev;
      URL.revokeObjectURL(old.url);
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const setTransform = useCallback(
    (slot: number, patch: Partial<SlotTransform>) => {
      setSlots((prev) =>
        prev[slot] ? { ...prev, [slot]: { ...prev[slot], ...patch } } : prev
      );
    },
    []
  );

  const resetTransform = useCallback(
    (slot: number) => setTransform(slot, { ...DEFAULT_TRANSFORM }),
    [setTransform]
  );

  const rotatePhoto = useCallback((slot: number) => {
    setSlots((prev) =>
      prev[slot]
        ? {
            ...prev,
            [slot]: { ...prev[slot], rotation: (prev[slot].rotation + 90) % 360 },
          }
        : prev
    );
  }, []);

  /** Replace all slots with a saved job's photos and framing. */
  const restoreSlots = useCallback(
    (items: RestorableSlot[]) => {
      const next: Record<number, SlotState> = {};
      for (const item of items) {
        next[item.index] = {
          url: URL.createObjectURL(item.blob),
          fileName: item.fileName,
          file: item.blob,
          image: null,
          zoom: item.zoom,
          offsetX: item.offsetX,
          offsetY: item.offsetY,
          rotation: item.rotation,
        };
      }
      setSlots((prev) => {
        Object.values(prev).forEach((s) => URL.revokeObjectURL(s.url));
        return next;
      });
      for (const item of items) {
        attachImage(item.index, next[item.index].url);
      }
    },
    [attachImage]
  );

  return {
    slots,
    setPhoto,
    clearPhoto,
    setTransform,
    resetTransform,
    rotatePhoto,
    restoreSlots,
  };
}
