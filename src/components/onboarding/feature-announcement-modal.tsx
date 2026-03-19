import { Sparkles } from "lucide-react";
import { FeatureOnboarding } from "../../services/apiOnboarding";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface FeatureAnnouncementModalProps {
  open: boolean;
  onboarding: FeatureOnboarding | null;
  onStartTour: () => void;
}

export default function FeatureAnnouncementModal({
  open,
  onboarding,
  onStartTour,
}: FeatureAnnouncementModalProps) {
  if (!onboarding) return null;

  const bulletPoints: string[] = Array.isArray(onboarding.bullet_points)
    ? onboarding.bullet_points
    : [];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              New Feature
            </span>
          </div>
          <DialogTitle className="text-xl">{onboarding.title}</DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {onboarding.description}
          </DialogDescription>
        </DialogHeader>

        {bulletPoints.length > 0 && (
          <ul className="space-y-2 my-2">
            {bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button onClick={onStartTour} className="w-full">
            Start Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
