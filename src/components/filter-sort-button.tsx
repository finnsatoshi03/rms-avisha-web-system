import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";
import { ChevronDown } from "lucide-react";

export const FilterSortButton = ({
  isActive,
  onToggle,
  icon,
  text,
  count,
}: {
  isActive: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  text: string;
  count?: boolean;
}) => (
  <div
    className={cn(
      buttonVariants({ variant: "outline", size: "sm" }),
      "h-8 cursor-pointer gap-1.5 px-3 text-sm font-normal text-slate-700",
      isActive && "bg-accent"
    )}
    onClick={onToggle}
  >
    {icon}
    <p
      className={`text-sm ${
        count ? (isActive ? "text-gray-700" : "text-primaryRed") : ""
      }`}
    >
      {text}
    </p>
    <ChevronDown
      strokeWidth={1.5}
      size={14}
      className={`${
        isActive ? "rotate-180" : "rotate-0"
      } transition-transform duration-200 ease-in-out`}
    />
  </div>
);
