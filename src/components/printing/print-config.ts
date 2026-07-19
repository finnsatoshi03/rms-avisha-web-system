/**
 * Print layout configuration — the single source of truth for the Printing page.
 *
 * Every dimension is declared physically (inches or millimeters) and converted
 * to pixels at 300 DPI. Adding a new package is one entry in PRINT_PACKAGES;
 * the layout engine, preview, print, and export all derive from it.
 */

export const DPI = 300;
export const MM_PER_INCH = 25.4;

/** A physical length. Kept unit-tagged so configs read like the real-world spec. */
export interface PhysicalDim {
  value: number;
  unit: "in" | "mm";
}

export const inches = (value: number): PhysicalDim => ({ value, unit: "in" });
export const mm = (value: number): PhysicalDim => ({ value, unit: "mm" });

/** Convert a physical length to pixels at 300 DPI (rounded to whole device pixels). */
export function toPx(dim: PhysicalDim): number {
  const inchesValue = dim.unit === "in" ? dim.value : dim.value / MM_PER_INCH;
  return Math.round(inchesValue * DPI);
}

/** Human label like `2×2 in` or `35×45 mm` for captions and placeholders. */
export function formatSize(width: PhysicalDim, height: PhysicalDim): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
  if (width.unit === height.unit) {
    return `${fmt(width.value)}×${fmt(height.value)} ${width.unit}`;
  }
  return `${fmt(width.value)} ${width.unit} × ${fmt(height.value)} ${height.unit}`;
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

export type SheetId = "4r" | "a4";

export interface SheetConfig {
  id: SheetId;
  label: string;
  /** Portrait dimensions; the engine swaps them for landscape packages. */
  width: PhysicalDim;
  height: PhysicalDim;
}

export const SHEETS: Record<SheetId, SheetConfig> = {
  "4r": {
    id: "4r",
    label: "4R (4×6 in)",
    width: inches(4),
    height: inches(6),
  },
  a4: {
    id: "a4",
    label: "A4 (210×297 mm)",
    width: mm(210),
    height: mm(297),
  },
};

export const DEFAULT_SHEET: SheetId = "4r";

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

/** One run of identical cells within a package (e.g. "8 pcs of 1×1 in"). */
export interface CellGroup {
  /** Physical size of the PHOTO area of the cell. */
  width: PhysicalDim;
  height: PhysicalDim;
  count: number;
  /**
   * Which photo slot fills these cells (index into `slots`). Groups sharing a
   * slot tile the same upload. Defaults to slot 0.
   */
  slot?: number;
  /**
   * Strip at the bottom of the cell where the typed name/subtitle prints
   * (name-plate style cells). Carved out of the declared width×height, so the
   * cut cell is exactly the stated size and the photo area shrinks above it.
   */
  captionHeight?: PhysicalDim;
}

/** An upload target. Most packages have one; combos may offer a second. */
export interface PhotoSlot {
  label: string;
  /** Optional slots fall back to slot 0's photo when left empty. */
  optional?: boolean;
}

export interface PrintPackageConfig {
  id: string;
  name: string;
  /** Short spec line shown under the name, e.g. "6 pcs · 2×2 in". */
  summary: string;
  /** Sheet orientation for this package. Default: portrait. */
  orientation?: "portrait" | "landscape";
  groups: CellGroup[];
  slots: PhotoSlot[];
  /** Counter price in PHP shown on the card and totaled at print time. */
  price?: number;
}

/** Packages with a caption strip also take typed name/subtitle input. */
export function packageHasCaption(pkg: PrintPackageConfig): boolean {
  return pkg.groups.some((g) => g.captionHeight);
}

/**
 * Package catalog. Counts are designed for the default 4R sheet; on A4 the
 * same physical block is centered on the larger page.
 *
 * Worked math at 300 DPI: 1×1 in → 300×300 px, 2×2 in → 600×600 px,
 * 35×45 mm → 413×531 px, 4R sheet → 1200×1800 px.
 */
export const PRINT_PACKAGES: PrintPackageConfig[] = [
  {
    id: "combo-2x2-1x1",
    price: 60,
    name: "2×2 + 1×1 Combo",
    summary: "4 pcs 2×2 in · 8 pcs 1×1 in",
    groups: [
      { width: inches(2), height: inches(2), count: 4, slot: 0 },
      { width: inches(1), height: inches(1), count: 8, slot: 1 },
    ],
    slots: [
      { label: "2×2 photo" },
      { label: "1×1 photo", optional: true },
    ],
  },
  {
    id: "2x2-6",
    price: 50,
    name: "2×2",
    summary: "6 pcs · 2×2 in",
    groups: [{ width: inches(2), height: inches(2), count: 6 }],
    slots: [{ label: "2×2 photo" }],
  },
  {
    id: "1x1-8",
    price: 40,
    name: "1×1",
    summary: "8 pcs · 1×1 in",
    groups: [{ width: inches(1), height: inches(1), count: 8 }],
    slots: [{ label: "1×1 photo" }],
  },
  {
    id: "visa-2x2",
    price: 60,
    name: "Visa",
    summary: "4 pcs · 2×2 in (51×51 mm)",
    groups: [{ width: inches(2), height: inches(2), count: 4 }],
    slots: [{ label: "Visa photo (2×2 in)" }],
  },
  {
    id: "passport-35x45",
    price: 70,
    name: "Passport",
    summary: "6 pcs · 35×45 mm",
    groups: [{ width: mm(35), height: mm(45), count: 6 }],
    slots: [{ label: "Passport photo (35×45 mm)" }],
  },
  {
    id: "name-plate",
    price: 80,
    name: "Name Plate 2×2",
    summary: "6 pcs · 2×2 in incl. name",
    groups: [
      {
        width: inches(2),
        height: inches(2),
        captionHeight: inches(0.5),
        count: 6,
      },
    ],
    slots: [{ label: "2×2 photo" }],
  },
  {
    id: "name-plate-1x1",
    price: 60,
    name: "Name Plate 1×1",
    summary: "8 pcs · 1×1 in incl. name",
    groups: [
      {
        width: inches(1),
        height: inches(1),
        captionHeight: inches(0.3),
        count: 8,
      },
    ],
    slots: [{ label: "1×1 photo" }],
  },
  {
    id: "wallet-2",
    price: 50,
    name: "Wallet",
    summary: "2 pcs · 2.5×3.5 in",
    orientation: "landscape",
    groups: [{ width: inches(2.5), height: inches(3.5), count: 2 }],
    slots: [{ label: "Wallet photo" }],
  },
  {
    id: "3r-1",
    price: 40,
    name: "3R / Half Body",
    summary: "1 pc · 3.5×5 in",
    groups: [{ width: inches(3.5), height: inches(5), count: 1 }],
    slots: [{ label: "3R photo" }],
  },
  {
    id: "full-4r",
    price: 50,
    name: "Full 4R / Whole Body",
    summary: "1 pc · 4×6 in",
    groups: [{ width: inches(4), height: inches(6), count: 1 }],
    slots: [{ label: "4R photo" }],
  },
];

export function getPackage(id: string): PrintPackageConfig | undefined {
  return PRINT_PACKAGES.find((pkg) => pkg.id === id);
}

// ---------------------------------------------------------------------------
// Custom package builder
// ---------------------------------------------------------------------------

export const CUSTOM_PACKAGE_ID = "custom";
export const CUSTOM_SIZE_ID = "custom";

/** Preset photo sizes offered by the custom builder. */
export const PHOTO_SIZE_OPTIONS = [
  { id: "1x1", label: "1×1 in", width: inches(1), height: inches(1) },
  { id: "2x2", label: "2×2 in", width: inches(2), height: inches(2) },
  { id: "passport", label: "Passport 35×45 mm", width: mm(35), height: mm(45) },
  { id: "wallet", label: "Wallet 2.5×3.5 in", width: inches(2.5), height: inches(3.5) },
  { id: "3r", label: "3R 3.5×5 in", width: inches(3.5), height: inches(5) },
] as const;

/** One line of the custom builder: a size and how many copies. */
export interface CustomRow {
  /** A PHOTO_SIZE_OPTIONS id, or CUSTOM_SIZE_ID for free dimensions. */
  sizeId: string;
  count: number;
  /** Free dimensions in inches; used only when sizeId === CUSTOM_SIZE_ID. */
  widthIn?: number;
  heightIn?: number;
}

export const DEFAULT_CUSTOM_ROWS: CustomRow[] = [{ sizeId: "2x2", count: 4 }];

export const MAX_CUSTOM_ROWS = 4;
export const MAX_CUSTOM_COUNT = 30;
const MIN_CUSTOM_DIM_IN = 0.5;
const MAX_CUSTOM_DIM_IN = 8;

export const clampCustomDim = (v: number) =>
  Math.min(MAX_CUSTOM_DIM_IN, Math.max(MIN_CUSTOM_DIM_IN, v));

function customRowSize(row: CustomRow): { width: PhysicalDim; height: PhysicalDim } {
  const preset = PHOTO_SIZE_OPTIONS.find((s) => s.id === row.sizeId);
  if (preset) return { width: preset.width, height: preset.height };
  return {
    width: inches(clampCustomDim(row.widthIn ?? 2)),
    height: inches(clampCustomDim(row.heightIn ?? 2)),
  };
}

/**
 * Turn builder rows into a regular package config: each row is its own cell
 * group AND its own photo slot, so a mixed sheet can carry different photos
 * (rows beyond the first fall back to photo 1 when left empty).
 */
export function buildCustomPackage(rows: CustomRow[]): PrintPackageConfig {
  const safeRows = rows.length > 0 ? rows : DEFAULT_CUSTOM_ROWS;
  return {
    id: CUSTOM_PACKAGE_ID,
    name: "Custom",
    summary: "Mix sizes & quantities",
    groups: safeRows.map((row, i) => {
      const size = customRowSize(row);
      return {
        ...size,
        count: Math.min(MAX_CUSTOM_COUNT, Math.max(1, Math.round(row.count))),
        slot: i,
      };
    }),
    slots: safeRows.map((row, i) => {
      const size = customRowSize(row);
      return {
        label: `Photo ${i + 1} — ${formatSize(size.width, size.height)}`,
        optional: i > 0,
      };
    }),
  };
}
