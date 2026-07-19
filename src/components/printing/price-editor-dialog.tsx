import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PRINT_PACKAGES } from "./print-config";
import {
  PriceOverrides,
  useSavePrintPrices,
} from "./use-print-prices";

interface PriceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overrides: PriceOverrides;
}

/**
 * Admin/dev price list editor. Saves overrides to system_settings so every
 * terminal shares the same prices; blank fields fall back to config defaults.
 */
export default function PriceEditorDialog({
  open,
  onOpenChange,
  overrides,
}: PriceEditorDialogProps) {
  // Draft as strings so partially typed values don't fight the inputs.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useSavePrintPrices();

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const pkg of PRINT_PACKAGES) {
      const override = overrides[pkg.id];
      initial[pkg.id] = typeof override === "number" ? String(override) : "";
    }
    setDraft(initial);
  }, [open, overrides]);

  const handleSave = () => {
    const next: PriceOverrides = {};
    for (const pkg of PRINT_PACKAGES) {
      const raw = (draft[pkg.id] ?? "").trim();
      if (raw === "") continue;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error(`Invalid price for ${pkg.name}.`);
        return;
      }
      // Storing only real overrides keeps config defaults live for the rest.
      if (parsed !== pkg.price) next[pkg.id] = parsed;
    }
    save.mutate(next, {
      onSuccess: () => {
        toast.success("Prices updated for all terminals.");
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to save prices."
        ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Package prices</DialogTitle>
          <DialogDescription>
            Prices apply to every branch and terminal. Leave a field blank to
            use the default.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {PRINT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.summary} · default ₱{pkg.price}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">₱</span>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  placeholder={String(pkg.price ?? "")}
                  value={draft[pkg.id] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [pkg.id]: e.target.value }))
                  }
                  className="h-8 w-24 text-sm"
                  aria-label={`Price for ${pkg.name}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() =>
              setDraft(
                Object.fromEntries(PRINT_PACKAGES.map((p) => [p.id, ""]))
              )
            }
          >
            Reset all to defaults
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primaryRed hover:bg-hoveredRed"
              disabled={save.isPending}
              onClick={handleSave}
            >
              {save.isPending ? "Saving..." : "Save prices"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
