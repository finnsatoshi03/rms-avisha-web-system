import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTourDefinition, TourStep } from "./tour-definitions";

interface GuidedTourProps {
  featureKey: string;
  active: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

function simulateTyping(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function GuidedTour({
  featureKey,
  active,
  onComplete,
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [validSteps, setValidSteps] = useState<TourStep[]>([]);
  const [stepReady, setStepReady] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const tour = getTourDefinition(featureKey);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const tourActiveRef = useRef(false);
  tourActiveRef.current = active;
  const allowEscapeRef = useRef(false);

  // Block Escape key and outside clicks/pointerdown from dismissing popovers/dialogs while tour is active
  useEffect(() => {
    if (!active) return;

    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Allow intentional cleanup escapes through
        if (allowEscapeRef.current) {
          allowEscapeRef.current = false;
          return;
        }
        e.stopPropagation();
        e.preventDefault();
      }
    };

    // Block pointer events that could dismiss popovers (outside click detection)
    const blockPointerDown = (e: PointerEvent | MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow clicks inside the tour tooltip
      if (target.closest(".tour-tooltip")) return;
      // Block everything else from propagating so popovers/dialogs stay open
      e.stopPropagation();
      e.preventDefault();
    };

    // Capture phase so we intercept before any popover/dialog handler
    document.addEventListener("keydown", blockEscape, true);
    document.addEventListener("pointerdown", blockPointerDown, true);
    document.addEventListener("mousedown", blockPointerDown, true);

    return () => {
      document.removeEventListener("keydown", blockEscape, true);
      document.removeEventListener("pointerdown", blockPointerDown, true);
      document.removeEventListener("mousedown", blockPointerDown, true);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !tour) return;
    const valid = tour.steps.filter((step) => {
      return document.querySelector(step.target) !== null || step.clickBefore;
    });
    setValidSteps(valid);
    setCurrentStep(0);
    setStepReady(false);
  }, [active, tour]);

  // Step execution logic
  useEffect(() => {
    if (!active || validSteps.length === 0) return;
    const step = validSteps[currentStep];
    if (!step) return;

    setStepReady(false);

    const findAndShow = (maxAttempts: number, delay: number) => {
      let attempts = 0;
      const tryFind = () => {
        const el = document.querySelector(step.target);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Sanity check: rect must have dimensions (not hidden/collapsed)
          if (rect.width > 0 && rect.height > 0) {
            setTargetRect(rect);
            setStepReady(true);
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryFind, delay);
        } else {
          // Element not found — skip this step automatically
          if (currentStep < validSteps.length - 1) {
            setCurrentStep((prev) => prev + 1);
          } else {
            cleanup();
            onComplete();
          }
        }
      };
      tryFind();
    };

    if (step.clickBefore) {
      // Check if the popover is already open (carried over from previous step with same trigger)
      const alreadyOpen = !cleanupRef.current && document.querySelector(step.target);

      if (alreadyOpen) {
        // Popover already open — just set up cleanup and find the target
        const trigger = document.querySelector(step.clickBefore) as HTMLElement;
        cleanupRef.current = () => {
          allowEscapeRef.current = true;
          const tempEscape = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          });
          (document.activeElement || trigger || document.body).dispatchEvent(tempEscape);
        };
        // Clear any typed value from previous step
        if (step.typeInto) {
          const input = document.querySelector(step.typeInto.selector) as HTMLInputElement;
          if (input) {
            input.focus();
            simulateTyping(input, step.typeInto.value);
          }
          setTimeout(() => findAndShow(10, 250), 500);
        } else {
          // Clear previous typed text if the input exists
          const cmdkInput = document.querySelector("[cmdk-input]") as HTMLInputElement;
          if (cmdkInput && cmdkInput.value) {
            simulateTyping(cmdkInput, "");
          }
          setTimeout(() => findAndShow(10, 250), 200);
        }
      } else {
        // Need to open the popover
        const trigger = document.querySelector(step.clickBefore) as HTMLElement;
        if (trigger) {
          trigger.click();
          cleanupRef.current = () => {
            allowEscapeRef.current = true;
            const tempEscape = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });
            (document.activeElement || trigger).dispatchEvent(tempEscape);
          };
        }

        const afterClick = () => {
          if (step.typeInto) {
            const input = document.querySelector(step.typeInto.selector) as HTMLInputElement;
            if (input) {
              input.focus();
              simulateTyping(input, step.typeInto.value);
            }
          }
          setTimeout(() => findAndShow(10, 250), step.typeInto ? 500 : 100);
        };

        setTimeout(afterClick, 300);
      }
    } else {
      findAndShow(5, 200);
    }
  }, [active, currentStep, validSteps, cleanup, onComplete]);

  // Keep rect in sync on resize/scroll
  const updateRect = useCallback(() => {
    if (!active || !stepReady || validSteps.length === 0) return;
    const step = validSteps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      }
    }
  }, [active, stepReady, currentStep, validSteps]);

  useEffect(() => {
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const handleNext = () => {
    if (currentStep < validSteps.length - 1) {
      const currentStepDef = validSteps[currentStep];
      const nextStep = validSteps[currentStep + 1];
      // If both steps use the same clickBefore trigger, keep the popover open — don't cleanup
      if (currentStepDef?.clickBefore && nextStep?.clickBefore && currentStepDef.clickBefore === nextStep.clickBefore) {
        // Clear cleanup so the step effect doesn't re-click the same trigger
        cleanupRef.current = null;
        setCurrentStep((prev) => prev + 1);
      } else if (cleanupRef.current && nextStep?.clickBefore) {
        // Different trigger — close current popover first, then advance
        cleanup();
        setTimeout(() => setCurrentStep((prev) => prev + 1), 250);
      } else {
        cleanup();
        setCurrentStep((prev) => prev + 1);
      }
    } else {
      // Tour ending — delay cleanup so event blockers are removed first
      if (cleanupRef.current) {
        const cleanupFn = cleanupRef.current;
        cleanupRef.current = null;
        setTimeout(cleanupFn, 50);
      }
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep <= 0) return;
    const currentStepDef = validSteps[currentStep];
    const prevStep = validSteps[currentStep - 1];
    // If both steps use the same clickBefore trigger, keep the popover open
    if (currentStepDef?.clickBefore && prevStep?.clickBefore && currentStepDef.clickBefore === prevStep.clickBefore) {
      cleanupRef.current = null;
      setCurrentStep((prev) => prev - 1);
    } else if (cleanupRef.current && prevStep?.clickBefore) {
      cleanup();
      setTimeout(() => setCurrentStep((prev) => prev - 1), 250);
    } else {
      cleanup();
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!active || !tour || validSteps.length === 0 || !stepReady || !targetRect) return null;

  const step = validSteps[currentStep];
  const isLast = currentStep === validSteps.length - 1;
  const isFirst = currentStep === 0;
  const pad = 8;

  const getTooltipPos = (): React.CSSProperties => {
    const s: React.CSSProperties = { position: "fixed", zIndex: 10002 };
    const w = 320;

    switch (step.placement) {
      case "bottom":
        s.top = targetRect.bottom + pad + 8;
        s.left = Math.max(8, Math.min(targetRect.left + targetRect.width / 2 - w / 2, window.innerWidth - w - 8));
        break;
      case "top":
        s.bottom = window.innerHeight - targetRect.top + pad + 8;
        s.left = Math.max(8, Math.min(targetRect.left + targetRect.width / 2 - w / 2, window.innerWidth - w - 8));
        break;
      case "left":
        s.top = targetRect.top + targetRect.height / 2 - 60;
        s.right = window.innerWidth - targetRect.left + pad + 8;
        break;
      case "right":
        s.top = targetRect.top + targetRect.height / 2 - 60;
        s.left = targetRect.right + pad + 8;
        break;
    }
    return s;
  };

  return createPortal(
    <div
      className="tour-overlay fixed inset-0 z-[10000]"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Spotlight cutout */}
      <div
        style={{
          position: "fixed",
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
          borderRadius: 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          zIndex: 10000,
          pointerEvents: "none",
        }}
      />

      {/* Tooltip */}
      <div
        className="tour-tooltip bg-white rounded-lg shadow-xl border p-4 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ ...getTooltipPos(), width: 320 }}
      >
        <p className="text-sm font-semibold mb-1">{step.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {validSteps.map((_, i) => (
              <span
                key={i}
                className={`inline-block h-1.5 w-1.5 rounded-full ${i === currentStep ? "bg-primary" : "bg-gray-300"}`}
              />
            ))}
          </div>

          <div className="flex gap-1.5">
            {!isFirst && (
              <button
                onClick={handleBack}
                className="inline-flex items-center h-7 px-2 text-xs rounded-md border bg-white hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="inline-flex items-center h-7 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ChevronRight className="h-3 w-3 ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
