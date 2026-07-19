import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  CUSTOM_SIZE_ID,
  CustomRow,
  MAX_CUSTOM_COUNT,
  MAX_CUSTOM_ROWS,
  PHOTO_SIZE_OPTIONS,
  clampCustomDim,
} from "./print-config";
import { cn } from "../../lib/utils";

interface CustomPackageBuilderProps {
  rows: CustomRow[];
  onChange: (rows: CustomRow[]) => void;
  /** From the layout engine — everything the builder asked for fits the sheet. */
  fits: boolean;
}

/**
 * Mix-and-match sheet builder: each row is a size plus quantity and becomes
 * its own photo slot, so one sheet can serve several sizes (or people).
 */
export default function CustomPackageBuilder({
  rows,
  onChange,
  fits,
}: CustomPackageBuilderProps) {
  const update = (index: number, patch: Partial<CustomRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const remove = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));

  const addRow = () =>
    onChange([...rows, { sizeId: "1x1", count: 4 }]);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border bg-card p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={row.sizeId}
              onValueChange={(sizeId) => update(i, { sizeId })}
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="text-xs">
                    {size.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_SIZE_ID} className="text-xs">
                  Custom size…
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-md border">
              <StepButton
                label="Fewer copies"
                disabled={row.count <= 1}
                onClick={() => update(i, { count: Math.max(1, row.count - 1) })}
              >
                <Minus size={12} />
              </StepButton>
              <span className="w-8 text-center text-xs tabular-nums">
                {row.count}
              </span>
              <StepButton
                label="More copies"
                disabled={row.count >= MAX_CUSTOM_COUNT}
                onClick={() =>
                  update(i, { count: Math.min(MAX_CUSTOM_COUNT, row.count + 1) })
                }
              >
                <Plus size={12} />
              </StepButton>
            </div>

            {rows.length > 1 && (
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
                aria-label={`Remove size ${i + 1}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {row.sizeId === CUSTOM_SIZE_ID && (
            <div className="flex items-center gap-2 text-xs">
              <DimInput
                label="Width"
                value={row.widthIn ?? 2}
                onCommit={(widthIn) => update(i, { widthIn })}
              />
              <span className="text-muted-foreground">×</span>
              <DimInput
                label="Height"
                value={row.heightIn ?? 2}
                onCommit={(heightIn) => update(i, { heightIn })}
              />
              <span className="text-muted-foreground">inches</span>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          disabled={rows.length >= MAX_CUSTOM_ROWS}
          onClick={addRow}
        >
          <Plus size={12} />
          Add size
        </Button>
        {!fits && (
          <span className="text-xs font-medium text-destructive">
            Doesn't fit this paper — reduce copies or sizes.
          </span>
        )}
      </div>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

/** Inch input that clamps on blur/enter instead of fighting every keystroke. */
function DimInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      aria-label={label}
      defaultValue={value}
      key={value}
      min={0.5}
      max={8}
      step={0.25}
      className="h-8 w-20 text-xs"
      onBlur={(e) => {
        const parsed = Number(e.target.value);
        onCommit(clampCustomDim(Number.isFinite(parsed) ? parsed : 2));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
