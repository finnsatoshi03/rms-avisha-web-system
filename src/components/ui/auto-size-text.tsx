import { useRef, useEffect, useCallback, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface AutoSizeTextProps {
  children: ReactNode;
  className?: string;
  minSize?: number;
  maxSize?: number;
}

export default function AutoSizeText({
  children,
  className,
  minSize = 14,
  maxSize = 28,
}: AutoSizeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Reset to max to measure natural width
    text.style.fontSize = `${maxSize}px`;
    const containerWidth = container.clientWidth;
    const textWidth = text.scrollWidth;

    if (textWidth <= containerWidth) return;

    // Scale down proportionally, clamped to min
    const scale = containerWidth / textWidth;
    const newSize = Math.max(minSize, Math.floor(maxSize * scale));
    text.style.fontSize = `${newSize}px`;
  }, [minSize, maxSize]);

  useEffect(() => {
    fit();
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fit, children]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <span
        ref={textRef}
        className="whitespace-nowrap font-bold leading-none block"
        style={{ fontSize: `${maxSize}px` }}
      >
        {children}
      </span>
    </div>
  );
}
