import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { PrintPackageConfig, SheetId } from "./print-config";
import { LayoutCell, SheetLayout } from "./layout-engine";
import { SlotState, SlotTransform } from "./use-photo-slots";
import { cn } from "../../lib/utils";

export interface CaptionText {
  name: string;
  subtitle: string;
}

export type InteractionMode = "photo" | "layout";

/**
 * The on-screen canvas carries editing chrome (selection borders, handles,
 * thirds grid) that must never print, so consumers take the sheet through
 * this handle: getPrintCanvas() re-renders the bare sheet offscreen.
 */
export interface SheetCanvasHandle {
  getPrintCanvas: () => HTMLCanvasElement | null;
}

interface SheetCanvasProps {
  pkg: PrintPackageConfig;
  sheetId: SheetId;
  layout: SheetLayout;
  slots: Record<number, SlotState>;
  text: CaptionText;
  mode: InteractionMode;
  /** Thin white matte frame inside each photo cell (easier hand-cutting). */
  whiteBorder: boolean;
  /** Unpaid/demo state: a watermark is baked into every rendered sheet. */
  locked: boolean;
  onTransform: (slotIndex: number, patch: Partial<SlotTransform>) => void;
  /** Incremental drag of the whole layout block, in canvas pixels. */
  onLayoutMove: (dx: number, dy: number) => void;
  className?: string;
}

interface SheetOptions {
  whiteBorder: boolean;
  locked: boolean;
}

const GUIDE_COLOR = "#9b9b9b";
const PLACEHOLDER_BG = "#f4f4f5";
const PLACEHOLDER_TEXT = "#a1a1aa";
const ACCENT = "#f12924"; // primaryRed
const FONT_STACK = '"Inter Variable", "Inter Fallback", system-ui, sans-serif';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Renders the exact print sheet at full 300-DPI pixel size, downscaled by CSS.
 *
 * Interactions: in "photo" mode, dragging a cell pans that photo and the
 * wheel zooms it (applied to every copy of the slot); in "layout" mode,
 * dragging slides the whole block to a free part of the paper.
 */
const SheetCanvas = forwardRef<SheetCanvasHandle, SheetCanvasProps>(
  function SheetCanvas(
    {
      pkg,
      sheetId,
      layout,
      slots,
      text,
      mode,
      whiteBorder,
      locked,
      onTransform,
      onLayoutMove,
      className,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const printCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Live values for handlers and the imperative handle.
    const stateRef = useRef({
      layout,
      slots,
      text,
      mode,
      whiteBorder,
      locked,
      onTransform,
      onLayoutMove,
    });
    stateRef.current = {
      layout,
      slots,
      text,
      mode,
      whiteBorder,
      locked,
      onTransform,
      onLayoutMove,
    };

    useImperativeHandle(ref, () => ({
      getPrintCanvas: () => {
        const { layout, slots, text, whiteBorder, locked } = stateRef.current;
        const canvas =
          printCanvasRef.current ??
          (printCanvasRef.current = document.createElement("canvas"));
        canvas.width = layout.sheetWidth;
        canvas.height = layout.sheetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        drawSheet(ctx, layout, slots, text, { whiteBorder, locked });
        return canvas;
      },
    }));

    const dragRef = useRef<{
      pointerId: number;
      lastX: number;
      lastY: number;
      /** Photo-pan target; null when moving the layout. */
      pan: {
        cellIndex: number;
        slotIndex: number;
        startOffsetX: number;
        startOffsetY: number;
        startClientX: number;
        startClientY: number;
        excessX: number;
        excessY: number;
      } | null;
    } | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const draw = () => {
        drawSheet(ctx, layout, slots, text, { whiteBorder, locked });
        drawEditingChrome(ctx, layout, slots, mode, {
          hoveredIndex,
          activeIndex: dragRef.current?.pan?.cellIndex ?? null,
          dragging,
        });
      };

      draw();
      // Captions depend on the webfont; redraw once fonts finish loading.
      if ("fonts" in document) {
        let cancelled = false;
        document.fonts.ready.then(() => {
          if (!cancelled) draw();
        });
        return () => {
          cancelled = true;
        };
      }
    }, [
      pkg,
      sheetId,
      layout,
      slots,
      text,
      mode,
      whiteBorder,
      locked,
      hoveredIndex,
      dragging,
    ]);

    // Wheel zoom needs a non-passive listener to preventDefault page scroll.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const onWheel = (e: WheelEvent) => {
        const { layout, slots, mode, onTransform } = stateRef.current;
        if (mode !== "photo") return;
        const point = toCanvasPoint(canvas, e.clientX, e.clientY);
        const cellIndex = hitCellIndex(layout, point);
        if (cellIndex === null) return;
        const cell = layout.cells[cellIndex];
        const slotIndex = slots[cell.slot] ? cell.slot : 0;
        const slot = slots[slotIndex];
        if (!slot?.image) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, slot.zoom * factor));
        onTransform(slotIndex, { zoom });
      };
      canvas.addEventListener("wheel", onWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", onWheel);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || e.button !== 0) return;
      const { layout, slots, mode } = stateRef.current;
      const point = toCanvasPoint(canvas, e.clientX, e.clientY);

      if (mode === "photo") {
        const cellIndex = hitCellIndex(layout, point);
        if (cellIndex === null) return;
        const cell = layout.cells[cellIndex];
        const slotIndex = slots[cell.slot] ? cell.slot : 0;
        const slot = slots[slotIndex];
        if (!slot?.image) return;
        const { excessX, excessY } = coverExcess(cell, slot);
        dragRef.current = {
          pointerId: e.pointerId,
          lastX: e.clientX,
          lastY: e.clientY,
          pan: {
            cellIndex,
            slotIndex,
            startOffsetX: slot.offsetX,
            startOffsetY: slot.offsetY,
            startClientX: e.clientX,
            startClientY: e.clientY,
            excessX,
            excessY,
          },
        };
      } else {
        dragRef.current = {
          pointerId: e.pointerId,
          lastX: e.clientX,
          lastY: e.clientY,
          pan: null,
        };
      }
      canvas.setPointerCapture(e.pointerId);
      setDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const drag = dragRef.current;
      const { layout, onTransform, onLayoutMove } = stateRef.current;

      if (!drag) {
        const point = toCanvasPoint(canvas, e.clientX, e.clientY);
        setHoveredIndex(hitCellIndex(layout, point));
        return;
      }
      if (drag.pointerId !== e.pointerId) return;
      const scale = canvasScale(canvas);

      if (drag.pan) {
        const p = drag.pan;
        // Photo follows the pointer: canvas-px drag → pan fraction of excess.
        const dxCanvas = (e.clientX - p.startClientX) * scale;
        const dyCanvas = (e.clientY - p.startClientY) * scale;
        const clampPan = (v: number) => Math.min(1, Math.max(-1, v));
        onTransform(p.slotIndex, {
          offsetX:
            p.excessX > 0
              ? clampPan(p.startOffsetX - (2 * dxCanvas) / p.excessX)
              : p.startOffsetX,
          offsetY:
            p.excessY > 0
              ? clampPan(p.startOffsetY - (2 * dyCanvas) / p.excessY)
              : p.startOffsetY,
        });
      } else {
        onLayoutMove(
          (e.clientX - drag.lastX) * scale,
          (e.clientY - drag.lastY) * scale
        );
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
      }
    };

    const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragRef.current?.pointerId !== e.pointerId) return;
      dragRef.current = null;
      setDragging(false);
    };

    const hoveredCell =
      hoveredIndex !== null ? layout.cells[hoveredIndex] : undefined;
    const hoveredHasImage = Boolean(
      hoveredCell && (slots[hoveredCell.slot] ?? slots[0])?.image
    );

    return (
      <canvas
        ref={canvasRef}
        width={layout.sheetWidth}
        height={layout.sheetHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHoveredIndex(null)}
        className={cn(
          "touch-none",
          mode === "layout"
            ? "cursor-move"
            : dragging
              ? "cursor-grabbing"
              : hoveredHasImage
                ? "cursor-grab"
                : "cursor-default",
          className
        )}
      />
    );
  }
);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** CSS pixels → canvas pixels (the canvas is CSS-downscaled). */
function canvasScale(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 ? canvas.width / rect.width : 1;
}

function toCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvasScale(canvas);
  return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
}

function hitCellIndex(
  layout: SheetLayout,
  point: { x: number; y: number }
): number | null {
  const index = layout.cells.findIndex(
    (c) =>
      point.x >= c.x &&
      point.x <= c.x + c.width &&
      point.y >= c.y &&
      point.y <= c.y + c.height
  );
  return index === -1 ? null : index;
}

/** Image dimensions as seen after the slot's 90°-step rotation. */
function rotatedSize(slot: SlotState) {
  const img = slot.image!;
  const swapped = slot.rotation % 180 !== 0;
  return {
    w: swapped ? img.naturalHeight : img.naturalWidth,
    h: swapped ? img.naturalWidth : img.naturalHeight,
  };
}

/** Cropped-off overflow of the cover-fitted image, in canvas px per axis. */
function coverExcess(cell: LayoutCell, slot: SlotState) {
  const { w, h } = rotatedSize(slot);
  const photoH = cell.height - cell.captionHeight;
  const scale = Math.max(cell.width / w, photoH / h) * slot.zoom;
  return {
    excessX: w * scale - cell.width,
    excessY: h * scale - photoH,
  };
}

// ---------------------------------------------------------------------------
// Sheet drawing (exactly what prints — no editing chrome)
// ---------------------------------------------------------------------------

function drawSheet(
  ctx: CanvasRenderingContext2D,
  layout: SheetLayout,
  slots: Record<number, SlotState>,
  text: CaptionText,
  opts: SheetOptions
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.sheetWidth, layout.sheetHeight);

  for (const cell of layout.cells) {
    // Optional slots (combo's 1×1) fall back to the primary photo.
    const slot = slots[cell.slot] ?? slots[0];
    if (slot?.image) {
      drawPhotoCell(ctx, cell, slot, opts.whiteBorder);
    } else {
      drawPlaceholderCell(ctx, cell);
    }
    if (cell.captionHeight > 0) {
      drawCaption(ctx, cell, text);
    }
  }

  // Cut guides: each cell edge is a cut line; adjacent cells share it.
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
  for (const cell of layout.cells) {
    ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.width - 1, cell.height - 1);
  }

  // Demo watermark is part of the sheet itself while the feature is unpaid —
  // it reaches every output path (preview, print, PNG, PDF) by construction.
  if (opts.locked) {
    drawWatermark(ctx, layout);
  }
}

/** object-fit: cover, plus the slot's uniform zoom/pan/rotation. No resampling. */
function drawPhotoCell(
  ctx: CanvasRenderingContext2D,
  cell: LayoutCell,
  slot: SlotState,
  whiteBorder: boolean
) {
  const img = slot.image!;
  const photoH = cell.height - cell.captionHeight;
  const { w: rw, h: rh } = rotatedSize(slot);
  const scale = Math.max(cell.width / rw, photoH / rh) * slot.zoom;
  const excessX = rw * scale - cell.width;
  const excessY = rh * scale - photoH;
  // Center of the drawn image; offsets pan across the cropped-off excess.
  const cx = cell.x + cell.width / 2 - excessX * (slot.offsetX * 0.5);
  const cy = cell.y + photoH / 2 - excessY * (slot.offsetY * 0.5);

  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.width, photoH);
  ctx.clip();
  ctx.imageSmoothingQuality = "high";
  ctx.translate(cx, cy);
  ctx.rotate((slot.rotation * Math.PI) / 180);
  ctx.drawImage(
    img,
    (-img.naturalWidth * scale) / 2,
    (-img.naturalHeight * scale) / 2,
    img.naturalWidth * scale,
    img.naturalHeight * scale
  );
  ctx.restore();

  if (whiteBorder) {
    // 0.04 in matte frame inside the photo area — a cutting allowance, not
    // an edit of the image.
    const bw = 12;
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = bw;
    ctx.strokeRect(
      cell.x + bw / 2,
      cell.y + bw / 2,
      cell.width - bw,
      photoH - bw
    );
    ctx.restore();
  }
}

/** Diagonal tiled "demo" marking across the whole sheet. */
function drawWatermark(ctx: CanvasRenderingContext2D, layout: SheetLayout) {
  const { sheetWidth: w, sheetHeight: h } = layout;
  const label = "AVISHA RMS · DEMO — NOT FOR SALE";
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = `700 ${Math.round(w * 0.045)}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(120, 120, 120, 0.34)";
  const stepY = Math.round(w * 0.22);
  const span = Math.max(w, h);
  for (let y = -span; y <= span; y += stepY) {
    // Offset alternate rows so cut-out cells can't dodge the marking.
    const xShift = (Math.round(y / stepY) % 2) * Math.round(w * 0.35);
    ctx.fillText(label, xShift, y);
  }
  ctx.restore();
}

function drawPlaceholderCell(ctx: CanvasRenderingContext2D, cell: LayoutCell) {
  const photoH = cell.height - cell.captionHeight;
  ctx.fillStyle = PLACEHOLDER_BG;
  ctx.fillRect(cell.x, cell.y, cell.width, photoH);
  ctx.fillStyle = PLACEHOLDER_TEXT;
  const fontSize = Math.round(Math.min(cell.width, photoH) * 0.11);
  ctx.font = `500 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cell.sizeLabel, cell.x + cell.width / 2, cell.y + photoH / 2);
}

/** Name (+ optional subtitle) in the strip below the photo. */
function drawCaption(
  ctx: CanvasRenderingContext2D,
  cell: LayoutCell,
  text: CaptionText
) {
  const name = text.name.trim();
  const subtitle = text.subtitle.trim();
  const stripY = cell.y + cell.height - cell.captionHeight;
  const stripH = cell.captionHeight;
  const cx = cell.x + cell.width / 2;
  const maxWidth = cell.width * 0.9;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, stripY, cell.width, stripH);
  ctx.clip();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (!name && !subtitle) {
    ctx.fillStyle = PLACEHOLDER_TEXT;
    ctx.font = `500 ${Math.round(stripH * 0.3)}px ${FONT_STACK}`;
    ctx.fillText("Name", cx, stripY + stripH / 2);
    ctx.restore();
    return;
  }

  const nameSize = name
    ? fitFontSize(ctx, name, stripH * (subtitle ? 0.4 : 0.46), maxWidth, 700)
    : 0;
  const subtitleSize = subtitle
    ? fitFontSize(ctx, subtitle, stripH * 0.24, maxWidth, 500)
    : 0;
  const gap = name && subtitle ? stripH * 0.08 : 0;
  const totalH = nameSize + gap + subtitleSize;
  let cursorY = stripY + stripH / 2 - totalH / 2;

  if (name) {
    ctx.fillStyle = "#111111";
    ctx.font = `700 ${nameSize}px ${FONT_STACK}`;
    ctx.fillText(name, cx, cursorY + nameSize / 2);
    cursorY += nameSize + gap;
  }
  if (subtitle) {
    ctx.fillStyle = "#555555";
    ctx.font = `500 ${subtitleSize}px ${FONT_STACK}`;
    ctx.fillText(subtitle, cx, cursorY + subtitleSize / 2);
  }
  ctx.restore();
}

/** Shrink from the target size until the string fits the cell width. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  str: string,
  target: number,
  maxWidth: number,
  weight: number
): number {
  let size = Math.round(target);
  while (size > 8) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(str).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

// ---------------------------------------------------------------------------
// Editing chrome (screen only — never part of getPrintCanvas output)
// ---------------------------------------------------------------------------

interface ChromeState {
  hoveredIndex: number | null;
  activeIndex: number | null;
  dragging: boolean;
}

function drawEditingChrome(
  ctx: CanvasRenderingContext2D,
  layout: SheetLayout,
  slots: Record<number, SlotState>,
  mode: InteractionMode,
  { hoveredIndex, activeIndex, dragging }: ChromeState
) {
  // Chrome line weights are in sheet pixels; ~4px reads as a hairline once
  // the 300-DPI canvas is downscaled to screen size.
  const thin = Math.max(3, Math.round(layout.sheetWidth / 300));
  const thick = thin * 2;

  if (mode === "layout") {
    // The whole block is the draggable object: dashed frame + soft tint.
    const { minX, minY, maxX, maxY } = layout.bounds;
    ctx.save();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = dragging ? thick : thin;
    ctx.setLineDash([thick * 3, thick * 2]);
    ctx.strokeRect(minX + 1, minY + 1, maxX - minX - 2, maxY - minY - 2);
    ctx.restore();
    return;
  }

  const focusIndex = dragging ? activeIndex : hoveredIndex;
  if (focusIndex === null) return;
  const focus = layout.cells[focusIndex];
  if (!focus) return;
  const slot = slots[focus.slot] ?? slots[0];
  if (!slot?.image) return;

  // Sibling copies of the same slot move together — show them faintly.
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = thin;
  for (let i = 0; i < layout.cells.length; i++) {
    const c = layout.cells[i];
    if (i === focusIndex) continue;
    const cSlot = slots[c.slot] ?? slots[0];
    if (cSlot !== slot) continue;
    ctx.strokeRect(c.x + 1, c.y + 1, c.width - 2, c.height - 2);
  }
  ctx.restore();

  // Focused cell: solid selection border with corner handles.
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = thick;
  ctx.strokeRect(focus.x + 1, focus.y + 1, focus.width - 2, focus.height - 2);

  const handle = thick * 3;
  ctx.fillStyle = "#ffffff";
  for (const [hx, hy] of [
    [focus.x, focus.y],
    [focus.x + focus.width, focus.y],
    [focus.x, focus.y + focus.height],
    [focus.x + focus.width, focus.y + focus.height],
  ]) {
    ctx.fillRect(hx - handle / 2, hy - handle / 2, handle, handle);
    ctx.lineWidth = thin;
    ctx.strokeRect(hx - handle / 2, hy - handle / 2, handle, handle);
  }
  ctx.restore();

  // Rule-of-thirds grid over the photo area while actively reframing.
  if (dragging) {
    const photoH = focus.height - focus.captionHeight;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(2, Math.round(thin / 2));
    for (let i = 1; i <= 2; i++) {
      const gx = focus.x + (focus.width * i) / 3;
      const gy = focus.y + (photoH * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, focus.y);
      ctx.lineTo(gx, focus.y + photoH);
      ctx.moveTo(focus.x, gy);
      ctx.lineTo(focus.x + focus.width, gy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export default SheetCanvas;
