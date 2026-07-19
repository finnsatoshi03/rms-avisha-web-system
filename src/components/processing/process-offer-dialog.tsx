import { Crop, Palette, Ruler, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ProcessorTarget } from "./photo-processor-dialog";

interface ProcessOfferDialogProps {
  offer: ProcessorTarget | null;
  onDismiss: () => void;
  onAccept: () => void;
}

/**
 * Shown right after a photo lands in an ID-sized print slot: offers to run it
 * through the local photo processor. Declining keeps the raw upload in place.
 */
export default function ProcessOfferDialog({
  offer,
  onDismiss,
  onAccept,
}: ProcessOfferDialogProps) {
  return (
    <Dialog open={offer !== null} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-deep" />
            Prepare this ID photo?
          </DialogTitle>
          <DialogDescription>
            The photo processor on this computer can turn the raw shot into a
            print-ready {offer?.label} photo:
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2.5">
            <Palette size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Background removal</span> — the
              person is cut out and placed on a solid color (white, blue, red…).
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Crop size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Auto-crop</span> — the face is
              detected and the head centered at the correct ID ratio.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Ruler size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Exact size</span> — resized to{" "}
              {offer?.widthPx}×{offer?.heightPx} px at 300 DPI to match the
              print cell.
            </span>
          </li>
        </ul>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDismiss}>
            Use as-is
          </Button>
          <Button type="button" className="gap-1.5" onClick={onAccept}>
            <Sparkles size={15} />
            Process photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
