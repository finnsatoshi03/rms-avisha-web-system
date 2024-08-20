import { accessoriesData } from "../../lib/accessoriesData";
import { AccessoriesSectionProps } from "../../lib/types";
import { GraphicsCardOptions } from "./graphics-card-options";
import { RAMOptions } from "./ram-options";
import { StorageOptions } from "./storage-options";

export default function AccessoriesSection({
  selectedAccessories,
  handleAccessorySelection,
  handleSubOptionSelection,
  selectedSubOptions,
  selectedMachineType,
}: AccessoriesSectionProps) {
  const selectedMachineAccessories = accessoriesData[selectedMachineType] || [];

  const parseAccessory = (accessory: string) => {
    const [base, ...subOptions] = accessory.split(" ");
    return {
      base,
      subOptions: subOptions.join(" "),
    };
  };

  return (
    <div className="my-3 px-4 py-3 border rounded-xl">
      <h2 className="text-sm">Accessories</h2>
      <div className="flex flex-wrap gap-1">
        {selectedMachineAccessories.map((accessory) => (
          <div
            key={accessory}
            className={`px-4 py-0.5 rounded-full text-sm border border-primaryRed text-red-800 cursor-pointer ${
              selectedAccessories.some((selected) =>
                selected.startsWith(accessory)
              )
                ? "font-bold bg-red-300"
                : "opacity-70"
            }`}
            onClick={() => handleAccessorySelection(accessory)}
          >
            {accessory}
          </div>
        ))}
      </div>
      {selectedAccessories.map((accessory) => {
        const { base } = parseAccessory(accessory);
        return base === "RAM" ? (
          <RAMOptions
            key={accessory}
            accessory={accessory}
            handleSubOptionSelection={handleSubOptionSelection}
            selectedSubOptions={selectedSubOptions}
          />
        ) : base === "Graphics card" ? (
          <GraphicsCardOptions
            key={accessory}
            accessory={accessory}
            handleSubOptionSelection={handleSubOptionSelection}
            selectedSubOptions={selectedSubOptions}
          />
        ) : [
            "External hard drive",
            "Internal hard drive",
            "Solid state drive (SSD)",
          ].includes(base) ? (
          <StorageOptions
            key={accessory}
            accessory={accessory}
            handleSubOptionSelection={handleSubOptionSelection}
            selectedSubOptions={selectedSubOptions}
          />
        ) : null;
      })}
    </div>
  );
}
