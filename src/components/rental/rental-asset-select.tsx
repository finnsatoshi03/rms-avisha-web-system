import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useAvailableAssets, useRentalAssets } from "./useRentalAssets";
import { RentalAsset } from "../../lib/types";

interface RentalAssetSelectProps {
  value: number | undefined;
  onChange: (assetId: number, asset: RentalAsset) => void;
  branchId: number | null;
  disabled?: boolean;
  placeholder?: string;
}

export default function RentalAssetSelect({
  value,
  onChange,
  branchId,
  disabled = false,
  placeholder = "Select a printer...",
}: RentalAssetSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: availableAssets } = useAvailableAssets(branchId);
  // Also fetch all assets so we can display the currently selected (possibly rented) asset
  const { data: allAssets } = useRentalAssets(branchId);

  const assets = availableAssets || [];
  const selectedAsset =
    assets.find((a: RentalAsset) => a.id === value) ||
    allAssets?.find((a: RentalAsset) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit"
          disabled={disabled}
        >
          <span className="truncate max-w-[200px] text-left">
            {selectedAsset
              ? `${selectedAsset.unit_name} - ${selectedAsset.model || "N/A"}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="end">
        <Command>
          <CommandInput
            placeholder="Search printers..."
            onValueChange={setSearchValue}
            value={searchValue}
          />
          <CommandEmpty>No available printers found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {assets
              ?.filter(
                (asset: RentalAsset) =>
                  asset.unit_name
                    .toLowerCase()
                    .includes(searchValue.toLowerCase()) ||
                  (asset.model &&
                    asset.model
                      .toLowerCase()
                      .includes(searchValue.toLowerCase())) ||
                  (asset.serial_number &&
                    asset.serial_number
                      .toLowerCase()
                      .includes(searchValue.toLowerCase()))
              )
              .map((asset: RentalAsset) => (
                <CommandItem
                  key={asset.id}
                  value={asset.unit_name.toLowerCase()}
                  onSelect={() => {
                    onChange(asset.id, asset);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === asset.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{asset.unit_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {asset.model && `Model: ${asset.model}`}
                      {asset.serial_number && ` | S/N: ${asset.serial_number}`}
                      {` | Daily: ₱${asset.daily_rate} | Monthly: ₱${asset.monthly_rate}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
