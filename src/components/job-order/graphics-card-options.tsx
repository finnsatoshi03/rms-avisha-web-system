import { accessorySubOptions } from "../../lib/accessoriesData";
import { GraphicsCardOptionsProps } from "../../lib/types";

export function GraphicsCardOptions({
  accessory,
  handleSubOptionSelection,
  selectedSubOptions,
}: GraphicsCardOptionsProps) {
  return (
    <div key={`${accessory}-options`} className="my-2">
      <label className="block text-sm font-medium text-gray-700">
        Graphics Card Brand
      </label>
      <div className="flex flex-wrap gap-1">
        {Object.keys(accessorySubOptions["Graphics card"]).map((brand) => (
          <div
            key={brand}
            className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 cursor-pointer ${
              selectedSubOptions[accessory]?.brand === brand
                ? "font-bold bg-red-300"
                : "opacity-70"
            }`}
            onClick={() => handleSubOptionSelection(accessory, "brand", brand)}
          >
            {brand}
          </div>
        ))}
      </div>
      {selectedSubOptions[accessory]?.brand && (
        <>
          <label className="block text-sm font-medium text-gray-700">
            Graphics Card Model
          </label>
          <div className="flex flex-wrap gap-1">
            {accessorySubOptions["Graphics card"][
              selectedSubOptions[accessory].brand
            ].map((model) => (
              <div
                key={model}
                className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 ${
                  selectedSubOptions[accessory]?.model === model
                    ? "font-bold bg-red-300"
                    : "opacity-70"
                }`}
                onClick={() =>
                  handleSubOptionSelection(accessory, "model", model)
                }
              >
                {model}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
