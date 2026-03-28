import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  children?: ReactNode;
}

export function SelectionBar({ count, onClear, children }: SelectionBarProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    if (count > 0) {
      setShowNotification(true);
      setAnimationClass("slideUp");
    } else if (showNotification) {
      setAnimationClass("slideDown");
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [count]);

  if (!showNotification) return null;

  return (
    <div className="w-full flex items-center justify-center h-0">
      <div
        className={`w-fit text-sm bg-slate-800 md:py-3 py-5 md:px-5 px-8 text-white rounded-3xl md:rounded-full absolute bottom-4 flex md:flex-row flex-col md:gap-0 gap-4 items-center justify-between ${animationClass} z-50`}
        style={{
          animation: `${animationClass} 0.2s ease-out forwards`,
        }}
      >
        <div className="flex items-center gap-4">
          <X
            size={16}
            strokeWidth={1.5}
            className="cursor-pointer hover:text-slate-200"
            onClick={onClear}
          />
          <p className="flex items-center gap-2">
            <span className="p-1 bg-slate-700 size-6 flex items-center justify-center rounded-full">
              {count}
            </span>
            row(s) selected
          </p>
        </div>
        {children && (
          <div className="flex gap-2 md:ml-4">{children}</div>
        )}
      </div>
    </div>
  );
}
