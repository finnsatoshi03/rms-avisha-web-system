/**
 * Pure layout math: turns a package config + sheet into absolutely positioned
 * pixel cells on the exact print canvas (300 DPI). No DOM, no canvas — the
 * preview, thumbnails, print, and export all consume this one computation.
 */

import {
  CellGroup,
  PrintPackageConfig,
  SHEETS,
  SheetId,
  formatSize,
  toPx,
} from "./print-config";

export interface LayoutCell {
  x: number;
  y: number;
  /** Full cut-cell size: photo area plus any caption strip. */
  width: number;
  height: number;
  /** Height of the caption strip at the bottom of the cell (0 = none). */
  captionHeight: number;
  /** Photo slot index that fills this cell (photo packages). */
  slot: number;
  /** Index into the package's `groups`, e.g. to label placeholders. */
  groupIndex: number;
  /** Human label of the cell's photo size (e.g. "2×2 in"). */
  sizeLabel: string;
}

export interface SheetLayout {
  /** Exact print canvas size in pixels at 300 DPI. */
  sheetWidth: number;
  sheetHeight: number;
  /** Physical sheet size in inches (for @page and captions). */
  sheetWidthIn: number;
  sheetHeightIn: number;
  cells: LayoutCell[];
  /** Bounding box of all cells — used to clamp draggable placement. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** True when every requested cell fits on the sheet. */
  fits: boolean;
}

export interface LayoutOffset {
  x: number;
  y: number;
}

/**
 * Row-based placement: each group packs into rows of identical cells, rows are
 * centered horizontally, groups stack top-to-bottom and the whole block is
 * centered vertically. Cells sit edge-to-edge (gap 0) so one cut line serves
 * both neighbors; cut guides are drawn on the shared boundaries.
 */
export function computeSheetLayout(
  pkg: PrintPackageConfig,
  sheetId: SheetId
): SheetLayout {
  const sheet = SHEETS[sheetId];
  const portraitW = toPx(sheet.width);
  const portraitH = toPx(sheet.height);
  const landscape = pkg.orientation === "landscape";
  const sheetWidth = landscape ? portraitH : portraitW;
  const sheetHeight = landscape ? portraitW : portraitH;

  const dimToIn = (d: { value: number; unit: "in" | "mm" }) =>
    d.unit === "in" ? d.value : d.value / 25.4;
  const sheetWidthIn = dimToIn(landscape ? sheet.height : sheet.width);
  const sheetHeightIn = dimToIn(landscape ? sheet.width : sheet.height);

  interface GroupPlan {
    group: CellGroup;
    groupIndex: number;
    cellW: number;
    cellH: number;
    captionH: number;
    perRow: number;
    rows: number;
    blockHeight: number;
  }

  let fits = true;
  const plans: GroupPlan[] = pkg.groups.map((group, groupIndex) => {
    const cellW = toPx(group.width);
    const cellH = toPx(group.height);
    // The caption strip is carved out of the declared cell size — a 2×2 name
    // plate cuts at exactly 2×2 in, photo above, name inside the bottom strip.
    // Clamp so a misconfigured caption can never swallow the photo area.
    const captionH = group.captionHeight
      ? Math.min(toPx(group.captionHeight), Math.floor(cellH * 0.6))
      : 0;
    let perRow = Math.min(group.count, Math.floor(sheetWidth / cellW));
    if (perRow < 1) {
      fits = false;
      perRow = 1;
    }
    const rows = Math.ceil(group.count / perRow);
    return {
      group,
      groupIndex,
      cellW,
      cellH,
      captionH,
      perRow,
      rows,
      blockHeight: rows * cellH,
    };
  });

  const totalHeight = plans.reduce((sum, p) => sum + p.blockHeight, 0);
  if (totalHeight > sheetHeight) fits = false;

  const cells: LayoutCell[] = [];
  let y = Math.max(0, Math.round((sheetHeight - totalHeight) / 2));

  for (const plan of plans) {
    const { group, groupIndex, cellW, cellH, captionH, perRow, rows } = plan;
    const sizeLabel = formatSize(group.width, group.height);
    let placed = 0;
    for (let row = 0; row < rows; row++) {
      const inRow = Math.min(perRow, group.count - placed);
      const rowWidth = inRow * cellW;
      const x0 = Math.round((sheetWidth - rowWidth) / 2);
      for (let col = 0; col < inRow; col++) {
        cells.push({
          x: x0 + col * cellW,
          y: y + row * cellH,
          width: cellW,
          height: cellH,
          captionHeight: captionH,
          slot: group.slot ?? 0,
          groupIndex,
          sizeLabel,
        });
      }
      placed += inRow;
    }
    y += plan.blockHeight;
  }

  const bounds = cells.reduce(
    (b, c) => ({
      minX: Math.min(b.minX, c.x),
      minY: Math.min(b.minY, c.y),
      maxX: Math.max(b.maxX, c.x + c.width),
      maxY: Math.max(b.maxY, c.y + c.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 }
  );

  return {
    sheetWidth,
    sheetHeight,
    sheetWidthIn,
    sheetHeightIn,
    cells,
    bounds,
    fits,
  };
}

/**
 * Keep a drag offset within the sheet: the whole block may slide only as far
 * as its slack on each axis (an exact-fill layout cannot move at all).
 */
export function clampLayoutOffset(
  layout: SheetLayout,
  offset: LayoutOffset
): LayoutOffset {
  const { bounds, sheetWidth, sheetHeight } = layout;
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, Math.min(min, max)), Math.max(min, max));
  return {
    x: Math.round(clamp(offset.x, -bounds.minX, sheetWidth - bounds.maxX)),
    y: Math.round(clamp(offset.y, -bounds.minY, sheetHeight - bounds.maxY)),
  };
}

/** Shift every cell by the (already clamped) placement offset. */
export function applyLayoutOffset(
  layout: SheetLayout,
  offset: LayoutOffset
): SheetLayout {
  if (offset.x === 0 && offset.y === 0) return layout;
  return {
    ...layout,
    cells: layout.cells.map((c) => ({
      ...c,
      x: c.x + offset.x,
      y: c.y + offset.y,
    })),
    bounds: {
      minX: layout.bounds.minX + offset.x,
      minY: layout.bounds.minY + offset.y,
      maxX: layout.bounds.maxX + offset.x,
      maxY: layout.bounds.maxY + offset.y,
    },
  };
}

/** Slack available for dragging the block around the sheet, per axis. */
export function layoutSlack(layout: SheetLayout): { x: number; y: number } {
  return {
    x: Math.max(0, layout.sheetWidth - (layout.bounds.maxX - layout.bounds.minX)),
    y: Math.max(0, layout.sheetHeight - (layout.bounds.maxY - layout.bounds.minY)),
  };
}
