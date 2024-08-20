import { accessorySubOptions } from "../../lib/accessoriesData";
import { StorageOptionsProps } from "../../lib/types";

export function StorageOptions({
  accessory,
  handleSubOptionSelection,
  selectedSubOptions,
}: StorageOptionsProps) {
  return (
    <div key={`${accessory}-options`} className="my-2">
      <label className="block text-sm font-medium text-gray-700">{`${accessory} Size`}</label>
      <div className="flex flex-wrap gap-1">
        {accessorySubOptions[accessory].map((option: string) => (
          <div
            key={option}
            className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 cursor-pointer ${
              selectedSubOptions[accessory]?.size === option
                ? "font-bold bg-red-300"
                : "opacity-70"
            }`}
            onClick={() => handleSubOptionSelection(accessory, "size", option)}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}
