import React, { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { AccessoriesSectionProps } from "../../lib/types";

// Common suggested accessories across all machine types
const commonAccessories = [
  "Power Cable",
  "USB Cable",
  "HDMI Cable",
  "VGA Cable",
  "Ethernet Cable",
  "Mouse",
  "Keyboard",
  "Power Adapter",
  "Battery",
  "Charger",
  "Headphones",
  "Speakers",
  "Webcam",
  "External Hard Drive",
  "USB Flash Drive",
  "Memory Card",
  "RAM",
  "Graphics Card",
  "CD/DVD",
  "Manual",
  "Driver CD",
  "Carrying Case",
  "Screen Protector",
  "Cleaning Kit",
];

// Machine-type-specific quick add suggestions
const machineTypeQuickAdd = {
  printer: [
    "Power Cable",
    "USB Cable",
    "Ink Cartridges",
    "Paper Tray",
    "Manual",
    "Driver CD",
  ],
  laptop: [
    "Power Adapter",
    "Battery",
    "Mouse",
    "Carrying Case",
    "Screen Protector",
    "Webcam",
  ],
  desktop_pc: [
    "Power Cable",
    "Monitor Cable",
    "Mouse",
    "Keyboard",
    "Speakers",
    "Webcam",
  ],
  electric_typewriter: [
    "Power Cable",
    "Ribbon Cartridge",
    "Paper Guide",
    "Manual",
    "Correction Tape",
    "Carbon Paper",
  ],
  others: [
    "Power Cable",
    "Manual",
    "Driver CD",
    "USB Cable",
    "Carrying Case",
    "Battery",
  ],
};

export default function AccessoriesSection({
  selectedAccessories,
  handleAccessorySelection,
  selectedMachineType,
}: Omit<
  AccessoriesSectionProps,
  "handleSubOptionSelection" | "selectedSubOptions"
> & {
  handleAccessorySelection: (
    accessory: string,
    action?: "add" | "remove"
  ) => void;
  selectedMachineType: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and exclude already selected ones
  const filteredSuggestions = commonAccessories.filter(
    (accessory) =>
      accessory.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedAccessories.includes(accessory) &&
      inputValue.length > 0
  );

  // Get machine-type-specific quick add suggestions
  const quickAddSuggestions =
    machineTypeQuickAdd[
      selectedMachineType as keyof typeof machineTypeQuickAdd
    ] || machineTypeQuickAdd.others;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addAccessory(inputValue.trim());
    }
  };

  const addAccessory = (accessory: string) => {
    if (accessory && !selectedAccessories.includes(accessory)) {
      handleAccessorySelection(accessory, "add");
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeAccessory = (accessory: string) => {
    handleAccessorySelection(accessory, "remove");
  };

  const handleSuggestionClick = (suggestion: string) => {
    addAccessory(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="my-3 px-4 py-3 border rounded-xl bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-900">Accessories</h2>
        <span className="text-xs text-gray-500">
          {selectedAccessories.length} selected
        </span>
      </div>

      {/* Selected Accessories */}
      {selectedAccessories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedAccessories.map((accessory) => (
            <Badge
              key={accessory}
              variant="secondary"
              className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200 transition-colors group"
            >
              <span className="truncate max-w-[150px]">{accessory}</span>
              <button
                type="button"
                onClick={() => removeAccessory(accessory)}
                className="ml-1 hover:bg-red-300 rounded-full p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type to add accessories..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="text-sm"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.slice(0, 8).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-b-0 focus:bg-gray-50 focus:outline-none"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{suggestion}</span>
                      <Plus size={14} className="text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => addAccessory(inputValue.trim())}
              className="px-3 py-2 bg-primaryRed text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Suggestions - Always visible and machine-type specific */}
      <div className="mt-3">
        <p className="text-xs text-gray-500 mb-2">
          Quick add for {selectedMachineType.replace("_", " ")}:
        </p>
        <div className="flex flex-wrap gap-1">
          {quickAddSuggestions
            .filter((accessory) => !selectedAccessories.includes(accessory))
            .map((accessory) => (
              <button
                key={accessory}
                type="button"
                onClick={() => addAccessory(accessory)}
                className="px-2 py-1 text-xs bg-white border border-red-200 rounded-full hover:bg-red-50 hover:border-red-300 transition-colors text-red-700"
              >
                <Plus size={10} className="inline mr-1" />
                {accessory}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
