import { accessorySubOptions } from "../../lib/accessoriesData";
import { RAMOptionsProps } from "../../lib/types";

export function RAMOptions({
  accessory,
  handleSubOptionSelection,
  selectedSubOptions,
}: RAMOptionsProps) {
  return (
    <div key={`${accessory}-options`} className="mt-2">
      <label className="block text-sm font-medium text-gray-700">
        RAM Board
      </label>
      <div className="flex flex-wrap gap-1">
        {accessorySubOptions.RAM.boards.map((option) => (
          <div
            key={option}
            className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 cursor-pointer ${
              selectedSubOptions.RAM?.board === option
                ? "font-bold bg-red-300"
                : "opacity-70"
            }`}
            onClick={() => handleSubOptionSelection("RAM", "board", option)}
          >
            {option}
          </div>
        ))}
      </div>
      {selectedSubOptions.RAM?.board && (
        <>
          <label className="block text-sm font-medium text-gray-700">
            RAM Size
          </label>
          <div className="flex flex-wrap gap-1">
            {accessorySubOptions.RAM.sizes[selectedSubOptions.RAM.board].map(
              (option) => (
                <div
                  key={option}
                  className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 ${
                    selectedSubOptions.RAM?.size === option
                      ? "font-bold bg-red-300"
                      : "opacity-70"
                  }`}
                  onClick={() =>
                    handleSubOptionSelection("RAM", "size", option)
                  }
                >
                  {option}
                </div>
              )
            )}
          </div>
          <label className="block text-sm font-medium text-gray-700">
            RAM Frequency
          </label>
          <div className="flex flex-wrap gap-1">
            {accessorySubOptions.RAM.frequencies[
              selectedSubOptions.RAM.board
            ].map((option) => (
              <div
                key={option}
                className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 ${
                  selectedSubOptions.RAM?.frequency === option
                    ? "font-bold bg-red-300"
                    : "opacity-70"
                }`}
                onClick={() =>
                  handleSubOptionSelection("RAM", "frequency", option)
                }
              >
                {option}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
