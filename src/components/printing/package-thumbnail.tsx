import { useMemo } from "react";
import { PrintPackageConfig, SheetId } from "./print-config";
import { computeSheetLayout } from "./layout-engine";
import { cn } from "../../lib/utils";

interface PackageThumbnailProps {
  pkg: PrintPackageConfig;
  sheetId: SheetId;
  active?: boolean;
  className?: string;
}

/**
 * Miniature of the real sheet layout, rendered from the same engine that
 * drives the print canvas — the picker preview can never drift from output.
 */
export default function PackageThumbnail({
  pkg,
  sheetId,
  active,
  className,
}: PackageThumbnailProps) {
  const layout = useMemo(() => computeSheetLayout(pkg, sheetId), [pkg, sheetId]);

  return (
    <svg
      viewBox={`0 0 ${layout.sheetWidth} ${layout.sheetHeight}`}
      className={cn("rounded-[3px] border bg-white shadow-sm", className)}
      aria-hidden="true"
    >
      {layout.cells.map((cell, i) => (
        <g key={i}>
          <rect
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height - cell.captionHeight}
            className={cn(
              active ? "fill-brand-soft" : "fill-muted",
              active ? "stroke-brand-deep/40" : "stroke-border"
            )}
            strokeWidth={layout.sheetWidth / 90}
          />
          {cell.captionHeight > 0 && (
            <rect
              x={cell.x}
              y={cell.y + cell.height - cell.captionHeight}
              width={cell.width}
              height={cell.captionHeight}
              className={cn(
                "fill-white",
                active ? "stroke-brand-deep/40" : "stroke-border"
              )}
              strokeWidth={layout.sheetWidth / 90}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
