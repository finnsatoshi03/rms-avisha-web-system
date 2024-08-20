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
    className={`cursor-pointer flex gap-1 items-center border ${
      isActive ? "text-gray-700" : "text-gray-400"
    }
    border-gray-400 w-fit px-2 py-1 rounded-lg`}
    onClick={onToggle}
  >
    {icon}
    <p
      className={`mr-2 text-sm ${
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
