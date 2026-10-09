import { useCallback, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Shared data-table rules: numbers right / text left, one hairline + hover,
// density, pinned identity columns, one-line cells, hover-revealed actions.

export type Density = "compact" | "default" | "comfortable";

// compact 40px / default 48px / comfortable 56px.
const DENSITY_ROW_CLASS: Record<Density, string> = {
  compact: "h-10",
  default: "h-12",
  comfortable: "h-14",
};

export function useDensity(storageKey: string) {
  const [density, setDensity] = useState<Density>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved && saved in DENSITY_ROW_CLASS ? (saved as Density) : "default";
    } catch {
      return "default";
    }
  });
  const changeDensity = (next: Density) => {
    setDensity(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Preference only; ignore storage failures.
    }
  };
  return [density, changeDensity] as const;
}

/** `group/table` must be on the <table> for the pinned-edge divider. */
export const dataTableClass = "group/table";

export const dataTableHeaderRowClass =
  "bg-muted border-none [&>th]:whitespace-nowrap";

export function dataTableRowClass(density: Density, warn = false) {
  return cn(
    "group text-gray-500 cursor-pointer [&>td]:py-0 [&>td]:whitespace-nowrap [&>td]:rounded-none",
    DENSITY_ROW_CLASS[density],
    warn ? "bg-red-50 hover:bg-red-100" : "bg-background hover:bg-slate-100"
  );
}

// Pinned identity columns. Offsets = widths of the pinned columns before them.
// Use `bg-inherit` so the pinned cells follow the row's hover/warn background.
const PIN_BASE = "sticky z-[1] bg-inherit";
const PIN_EDGE =
  "transition-shadow group-data-[scrolled=true]/table:shadow-[inset_-1px_0_0_hsl(var(--border)),6px_0_8px_-6px_rgb(0_0_0/0.15)]";
export const pin = {
  /** Checkbox column, first. */
  checkbox: cn(PIN_BASE, "left-0 w-11 min-w-11 max-w-11"),
  /** ID column after the checkbox. */
  id: cn(PIN_BASE, "left-11 w-28 min-w-28 max-w-28"),
  /** Name column after checkbox + ID; carries the edge divider. */
  name: cn(PIN_BASE, PIN_EDGE, "left-[9.75rem] w-56 min-w-56 max-w-56"),
  /** Name column right after the checkbox/index column (no ID column). */
  nameAfterCheckbox: cn(PIN_BASE, PIN_EDGE, "left-11 w-64 min-w-64 max-w-64"),
  /** Name column when it is the first column (no checkbox/ID). */
  nameFirst: cn(PIN_BASE, PIN_EDGE, "left-0 w-56 min-w-56 max-w-56"),
};

/** Left accent bar on row hover; put on the first body cell. */
export const rowAccentClass =
  "group-hover:shadow-[inset_3px_0_0_hsl(var(--primary))]";

/** Wrap per-row action buttons: revealed on hover/focus, always on touch. */
export const rowActionsClass =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100";

/** Right-aligned, non-truncating numbers. */
export const numericCellClass = "text-right tabular-nums";

/**
 * Ref for the <table>: marks `data-scrolled` when scrolled sideways (pinned-edge
 * divider) and flags the hovered column's <th> with `data-col-hover` (sort hint).
 * DOM-only, so hovering never re-renders the table.
 */
export function useDataTableRef() {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback((table: HTMLTableElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    const scroller = table?.parentElement;
    if (!table || !scroller) return;

    const onScroll = () => {
      table.dataset.scrolled = String(scroller.scrollLeft > 0);
    };
    let hoveredHeader: HTMLElement | null = null;
    const setHoveredHeader = (th: HTMLElement | null) => {
      if (th === hoveredHeader) return;
      hoveredHeader?.removeAttribute("data-col-hover");
      th?.setAttribute("data-col-hover", "");
      hoveredHeader = th;
    };
    const onOver = (event: MouseEvent) => {
      const cell = (event.target as HTMLElement).closest("td");
      setHoveredHeader(
        cell ? table.tHead?.rows[0]?.cells[cell.cellIndex] ?? null : null
      );
    };
    const onLeave = () => setHoveredHeader(null);

    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    table.addEventListener("mouseover", onOver);
    table.addEventListener("mouseleave", onLeave);
    cleanup.current = () => {
      scroller.removeEventListener("scroll", onScroll);
      table.removeEventListener("mouseover", onOver);
      table.removeEventListener("mouseleave", onLeave);
    };
  }, []);
}

export function DensityToggle({
  value,
  onChange,
}: {
  value: Density;
  onChange: (density: Density) => void;
}) {
  const options: { value: Density; label: string }[] = [
    { value: "compact", label: "Compact" },
    { value: "default", label: "Default" },
    { value: "comfortable", label: "Comfortable" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Row density"
      className="hidden sm:inline-flex rounded-md border p-0.5 text-xs"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-2 py-1 transition-colors",
            value === option.value
              ? "bg-slate-800 text-white"
              : "text-muted-foreground hover:bg-slate-100"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** One-line text; the tooltip only opens when the text is actually cut off. Needs a TooltipProvider above. */
export function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        const el = ref.current;
        setOpen(next && !!el && el.scrollWidth > el.clientWidth);
      }}
    >
      <TooltipTrigger asChild>
        <span ref={ref} className={cn("block truncate", className)}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}
