import { useRef } from "react";
import { ImagePlus, RotateCcw, RotateCw, X } from "lucide-react";
import { Button } from "../ui/button";
import { PhotoSlot } from "./print-config";
import { SlotState, SlotTransform } from "./use-photo-slots";
import { cn } from "../../lib/utils";

interface PhotoSlotControlsProps {
  slotIndex: number;
  slot: PhotoSlot;
  state?: SlotState;
  onPick: (slotIndex: number, file: File) => void;
  onClear: (slotIndex: number) => void;
  onTransform: (slotIndex: number, patch: Partial<SlotTransform>) => void;
  onRotate: (slotIndex: number) => void;
  onReset: (slotIndex: number) => void;
}

/** Upload target + framing controls for one photo slot. */
export default function PhotoSlotControls({
  slotIndex,
  slot,
  state,
  onPick,
  onClear,
  onTransform,
  onRotate,
  onReset,
}: PhotoSlotControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onPick(slotIndex, file);
  };

  const isAdjusted =
    state &&
    (state.zoom !== 1 ||
      state.offsetX !== 0 ||
      state.offsetY !== 0 ||
      state.rotation !== 0);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {slot.label}
          {slot.optional && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              optional — reuses the first photo if empty
            </span>
          )}
        </p>
        {state && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onRotate(slotIndex)}
              title={`Rotate 90° (now ${state.rotation}°)`}
              aria-label={`Rotate ${slot.label} 90 degrees`}
            >
              <RotateCw size={15} />
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onClear(slotIndex)}
              aria-label={`Remove ${slot.label}`}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "w-full rounded-md border border-dashed px-3 py-4 text-sm transition-colors",
          "flex items-center justify-center gap-2",
          state
            ? "border-border bg-muted/40 text-foreground"
            : "border-gray-300 text-muted-foreground hover:border-brand-deep/40 hover:bg-brand-soft/40"
        )}
      >
        <ImagePlus size={16} className="shrink-0 opacity-70" />
        <span className="truncate">
          {state ? state.fileName : "Upload photo or drag & drop"}
        </span>
      </button>

      {state && (
        <div className="space-y-2.5">
          <SlideControl
            label="Zoom"
            value={state.zoom}
            min={1}
            max={3}
            step={0.01}
            display={`${state.zoom.toFixed(2)}×`}
            onChange={(zoom) => onTransform(slotIndex, { zoom })}
          />
          <SlideControl
            label="Horizontal"
            value={state.offsetX}
            min={-1}
            max={1}
            step={0.01}
            display={panLabel(state.offsetX, "Left", "Right")}
            onChange={(offsetX) => onTransform(slotIndex, { offsetX })}
          />
          <SlideControl
            label="Vertical"
            value={state.offsetY}
            min={-1}
            max={1}
            step={0.01}
            display={panLabel(state.offsetY, "Up", "Down")}
            onChange={(offsetY) => onTransform(slotIndex, { offsetY })}
          />
          {isAdjusted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => onReset(slotIndex)}
            >
              <RotateCcw size={12} />
              Reset framing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function panLabel(value: number, negative: string, positive: string): string {
  if (Math.abs(value) < 0.005) return "Centered";
  const pct = Math.round(Math.abs(value) * 100);
  return `${value < 0 ? negative : positive} ${pct}%`;
}

function SlideControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr_72px] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primaryRed"
        aria-label={label}
      />
      <span className="text-right tabular-nums text-muted-foreground">
        {display}
      </span>
    </div>
  );
}
