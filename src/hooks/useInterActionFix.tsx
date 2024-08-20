import { useRef, useEffect } from "react";

export const useSelectInteractionFix = (selectors: string) => {
  const timeoutRef = useRef<number | undefined>();
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    rootRef.current = document.querySelector<HTMLElement>(selectors);
    if (!rootRef.current) {
      console.error("Root element not found for selector:", selectors);
    }
  }, [selectors]);

  const disableClicks = () => {
    rootRef.current?.style.setProperty("pointer-events", "none");
  };

  const enableClicks = () => {
    rootRef.current?.style.removeProperty("pointer-events");
  };

  const openChangeHandler = (open: boolean) => {
    if (open) {
      clearTimeout(timeoutRef.current);
      disableClicks();
    } else {
      timeoutRef.current = setTimeout(enableClicks, 50) as unknown as number;
    }
  };

  return openChangeHandler;
};
