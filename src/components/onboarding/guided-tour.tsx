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
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 220 });

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
      const hasTarget = document.querySelector(step.target) !== null;
      const hasClickBefore = step.clickBefore
        ? document.querySelector(step.clickBefore) !== null
        : false;
      return hasTarget || hasClickBefore;
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
          // Scroll the element into view before measuring
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              setTargetRect(rect);
              setStepReady(true);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(tryFind, delay);
              } else if (currentStep < validSteps.length - 1) {
                setCurrentStep((prev) => prev + 1);
              } else {
                cleanup();
                onComplete();
              }
            }
          }, 350);
          return;
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
          const subSheetBack = document.querySelector(
            '[data-tour="billing-detail-subsheet-back"]'
          ) as HTMLElement | null;
          if (subSheetBack) {
            subSheetBack.click();
            return;
          }

          const alertCancel = document.querySelector(
            "[data-radix-alert-dialog-cancel]"
          ) as HTMLElement | null;
          if (alertCancel) {
            alertCancel.click();
            return;
          }

          allowEscapeRef.current = true;
          const tempEscape = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: false,
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
          setTimeout(
            () => findAndShow(10, 250),
            step.waitMs ?? 500
          );
        } else {
          // Clear previous typed text if the input exists
          const cmdkInput = document.querySelector("[cmdk-input]") as HTMLInputElement;
          if (cmdkInput && cmdkInput.value) {
            simulateTyping(cmdkInput, "");
          }
          setTimeout(
            () => findAndShow(10, 250),
            step.waitMs ?? 200
          );
        }
      } else {
        // Need to open the popover
        const trigger = document.querySelector(step.clickBefore) as HTMLElement;
        if (trigger) {
          trigger.click();
          cleanupRef.current = () => {
            const subSheetBack = document.querySelector(
              '[data-tour="billing-detail-subsheet-back"]'
            ) as HTMLElement | null;
            if (subSheetBack) {
              subSheetBack.click();
              return;
            }

            const alertCancel = document.querySelector(
              "[data-radix-alert-dialog-cancel]"
            ) as HTMLElement | null;
            if (alertCancel) {
              alertCancel.click();
              return;
            }

            allowEscapeRef.current = true;
            const tempEscape = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: false,
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
          setTimeout(
            () => findAndShow(10, 250),
            step.waitMs ?? (step.typeInto ? 500 : 100)
          );
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

  useEffect(() => {
    if (!active || !stepReady) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const measure = () => {
      const next = {
        width: Math.round(tooltipEl.offsetWidth || 320),
        height: Math.round(tooltipEl.offsetHeight || 220),
      };
      setTooltipSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(tooltipEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [active, stepReady, currentStep]);

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
  const maxVisibleBullets = 10;
  const visibleBulletCount = Math.min(validSteps.length, maxVisibleBullets);
  const activeBulletIndex =
    validSteps.length <= maxVisibleBullets
      ? currentStep
      : Math.min(
          maxVisibleBullets - 1,
          Math.round(
            (currentStep / Math.max(validSteps.length - 1, 1)) *
              (maxVisibleBullets - 1)
          )
        );
  const pad = 8;

  const getTooltipPos = (): React.CSSProperties => {
    const viewportPadding = 8;
    const s: React.CSSProperties = { position: "fixed", zIndex: 10002 };
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const tooltipWidth = Math.max(
      180,
      Math.min(360, vw - viewportPadding * 2)
    );
    const tooltipHeight = Math.min(
      Math.max(160, tooltipSize.height || 220),
      vh - viewportPadding * 2
    );
    const gap = pad + 8;
    const highlightLeft = targetRect.left - pad;
    const highlightTop = targetRect.top - pad;
    const highlightRight = targetRect.right + pad;
    const highlightBottom = targetRect.bottom + pad;

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(value, max));

    const placementOrder: TourStep["placement"][] = [
      step.placement,
      ...(["bottom", "right", "left", "top"] as TourStep["placement"][]).filter(
        (p) => p !== step.placement
      ),
    ];

    const getCandidate = (placement: TourStep["placement"]) => {
      let left = 0;
      let top = 0;

      if (placement === "bottom") {
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      } else if (placement === "top") {
        top = targetRect.top - tooltipHeight - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      } else if (placement === "left") {
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      } else {
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      }

      return {
        left: clamp(left, viewportPadding, vw - tooltipWidth - viewportPadding),
        top: clamp(top, viewportPadding, vh - tooltipHeight - viewportPadding),
      };
    };

    const overlapsHighlight = (left: number, top: number) => {
      const right = left + tooltipWidth;
      const bottom = top + tooltipHeight;
      return !(
        right <= highlightLeft ||
        left >= highlightRight ||
        bottom <= highlightTop ||
        top >= highlightBottom
      );
    };

    const targetCoversMostOfViewport =
      targetRect.height > vh * 0.7 || targetRect.width > vw * 0.85;

    for (const placement of placementOrder) {
      const candidate = getCandidate(placement);
      if (!overlapsHighlight(candidate.left, candidate.top)) {
        return {
          ...s,
          left: candidate.left,
          top: candidate.top,
          width: tooltipWidth,
          maxHeight: vh - viewportPadding * 2,
          overflowY: "auto",
        };
      }
    }

    if (targetCoversMostOfViewport) {
      return {
        ...s,
        left: viewportPadding,
        top: viewportPadding,
        width: tooltipWidth,
        maxHeight: Math.max(180, Math.floor(vh * 0.45)),
        overflowY: "auto",
      };
    }

    const freeSpace = {
      top: targetRect.top - gap - viewportPadding,
      bottom: vh - targetRect.bottom - gap - viewportPadding,
      left: targetRect.left - gap - viewportPadding,
      right: vw - targetRect.right - gap - viewportPadding,
    };
    const bestPlacement = (Object.entries(freeSpace).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? "bottom") as TourStep["placement"];
    const fallback = getCandidate(bestPlacement);

    if ((freeSpace[bestPlacement] ?? 0) < 160) {
      const dockedHeight = Math.min(
        Math.max(180, tooltipHeight),
        vh - viewportPadding * 2
      );
      return {
        ...s,
        left: viewportPadding,
        top: vh - dockedHeight - viewportPadding,
        width: vw - viewportPadding * 2,
        maxHeight: dockedHeight,
        overflowY: "auto",
      };
    }

    const maxHeight =
      bestPlacement === "top" || bestPlacement === "bottom"
        ? Math.max(160, Math.min(freeSpace[bestPlacement], vh - viewportPadding * 2))
        : vh - viewportPadding * 2;

    return {
      ...s,
      left: fallback.left,
      top: fallback.top,
      width: tooltipWidth,
      maxHeight,
      overflowY: "auto",
    };
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
        ref={tooltipRef}
        className="tour-tooltip bg-white rounded-lg shadow-xl border p-4 animate-in fade-in-0 zoom-in-95 duration-200"
        style={getTooltipPos()}
      >
        <p className="text-sm font-semibold mb-1">{step.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              {Array.from({ length: visibleBulletCount }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  i === activeBulletIndex ? "bg-primary" : "bg-gray-300"
                }`}
              />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {currentStep + 1}/{validSteps.length}
            </span>
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
