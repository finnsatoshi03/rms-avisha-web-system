import { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown, Plus, Trash } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../../services/apiMaterials";
import { RentalFormValues } from "./rentalSchema";

interface MaterialStockItem {
  id: number;
  material_name: string;
  price: number;
  stocks: number;
  branch_id: number;
  deleted?: boolean;
  brand?: string;
}

interface RentalConsumablesSectionProps {
  form: UseFormReturn<RentalFormValues>;
  branchId: number | null;
  disabled?: boolean;
}

export default function RentalConsumablesSection({
  form,
  branchId,
  disabled = false,
}: RentalConsumablesSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "consumables",
  });

  const { data: materialStocks } = useQuery({
    queryKey: ["material_stocks"],
    queryFn: () => getMaterialStocks({ fetchAll: false }),
  });

  const canAddConsumable = () => {
    const consumables = form.getValues("consumables") || [];
    if (consumables.length === 0) return true;
    const last = consumables[consumables.length - 1];
    return last.is_manual ? !!last.description : !!last.material_stock_id;
  };

  const consumablesTotal = fields.reduce((sum, _, i) => {
    const qty = form.watch(`consumables.${i}.quantity`) || 0;
    const price = form.watch(`consumables.${i}.unit_price`) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="grid grid-cols-[1fr_0.4fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
      <h2 className="text-sm">Consumable</h2>
      <h2 className="text-sm">Quantity</h2>
      <h2 className="text-sm">Unit Price</h2>
      <h2 className="text-sm">Amount</h2>
      <h2></h2>

      {fields.map((field, index) => (
        <ConsumableRow
          key={field.id}
          index={index}
          form={form}
          branchId={branchId}
          materials={materialStocks as MaterialStockItem[] | undefined}
          onRemove={() => remove(index)}
          disabled={disabled}
        />
      ))}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-dashed border-2 border-slate-800 col-span-2"
        onClick={() => {
          if (canAddConsumable()) {
            append({
              material_stock_id: null,
              description: "",
              quantity: 1,
              unit_price: 0,
              is_manual: false,
              notes: "",
            });
          } else {
            alert(
              "Please fill out the current consumable before adding a new one."
            );
          }
        }}
        disabled={disabled}
      >
        <Plus size={14} strokeWidth={1.5} className="mr-2" />
        Add Consumable
      </Button>

      <div className="col-start-4">
        <h3 className="text-sm font-bold">Consumable Total</h3>
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold">₱</p>
          <p className="text-sm">{consumablesTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function ConsumableRow({
  index,
  form,
  branchId,
  materials,
  onRemove,
  disabled,
}: {
  index: number;
  form: UseFormReturn<RentalFormValues>;
  branchId: number | null;
  materials: MaterialStockItem[] | undefined;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [comboOpen, setComboOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const isManual = form.watch(`consumables.${index}.is_manual`);
  const quantity = form.watch(`consumables.${index}.quantity`) || 0;
  const unitPrice = form.watch(`consumables.${index}.unit_price`) || 0;
  const materialStockId = form.watch(`consumables.${index}.material_stock_id`);

  const filteredMaterials = (materials || []).filter(
    (m) =>
      !m.deleted &&
      m.stocks > 0 &&
      (!branchId || m.branch_id === branchId)
  );

  const selectedMaterial = filteredMaterials.find(
    (m) => m.id === materialStockId
  );

  const handleMaterialSelect = (material: MaterialStockItem) => {
    form.setValue(`consumables.${index}.material_stock_id`, material.id);
    form.setValue(`consumables.${index}.description`, material.material_name);
    form.setValue(`consumables.${index}.unit_price`, material.price);
    form.setValue(`consumables.${index}.is_manual`, false);
    setComboOpen(false);
    setSearchValue("");
  };

  const amount = quantity * unitPrice;

  return (
    <>
      {/* Material / Description column */}
      <div className="space-y-0 w-full">
        <div className="flex items-center gap-2 mb-1">
          <Switch
            checked={isManual}
            onCheckedChange={(checked) => {
              form.setValue(`consumables.${index}.is_manual`, checked);
              if (checked) {
                form.setValue(`consumables.${index}.material_stock_id`, null);
              }
            }}
            disabled={disabled}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground">
            {isManual ? "Manual" : "Inventory"}
          </span>
        </div>
        {isManual ? (
          <Input
            placeholder="Description"
            className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
            value={form.watch(`consumables.${index}.description`) || ""}
            onChange={(e) =>
              form.setValue(`consumables.${index}.description`, e.target.value)
            }
            disabled={disabled}
          />
        ) : (
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit"
                disabled={disabled}
              >
                <span className="truncate max-w-[200px] text-left">
                  {selectedMaterial
                    ? `${selectedMaterial.material_name}${selectedMaterial.brand ? ` - ${selectedMaterial.brand}` : ""}`
                    : "Select material"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="start">
              <Command>
                <CommandInput
                  placeholder="Search materials..."
                  onValueChange={setSearchValue}
                  value={searchValue}
                />
                <CommandEmpty>No material found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-y-auto">
                  {filteredMaterials
                    .filter(
                      (stock) =>
                        stock.material_name
                          .toLowerCase()
                          .includes(searchValue.toLowerCase()) ||
                        (stock.brand &&
                          stock.brand
                            .toLowerCase()
                            .includes(searchValue.toLowerCase()))
                    )
                    .map((stock) => (
                      <CommandItem
                        key={stock.id}
                        value={stock.material_name.toLowerCase()}
                        onSelect={() => handleMaterialSelect(stock)}
                        className="flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            materialStockId === stock.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="truncate">
                          {stock.material_name}{" "}
                          {stock.brand ? `- ${stock.brand}` : ""}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Quantity column */}
      <div className="flex items-center space-x-2 text-sm self-end">
        <button
          type="button"
          className="px-1 border rounded-full"
          onClick={() => {
            const current = form.getValues(`consumables.${index}.quantity`) || 1;
            if (current > 1)
              form.setValue(`consumables.${index}.quantity`, current - 1);
          }}
          disabled={disabled}
        >
          -
        </button>
        <div className="text-center">{quantity}</div>
        <button
          type="button"
          className="px-1 border rounded-full"
          onClick={() => {
            const current = form.getValues(`consumables.${index}.quantity`) || 0;
            form.setValue(`consumables.${index}.quantity`, current + 1);
          }}
          disabled={disabled}
        >
          +
        </button>
      </div>

      {/* Unit Price column */}
      <div className="flex items-center self-end relative">
        <span className="absolute pointer-events-none text-sm">₱</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="ml-3 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
          value={unitPrice}
          onChange={(e) =>
            form.setValue(
              `consumables.${index}.unit_price`,
              Number(e.target.value)
            )
          }
          disabled={disabled || (!isManual && !!materialStockId)}
        />
      </div>

      {/* Amount column */}
      <div className="flex gap-1 self-end">
        <p className="text-sm">₱</p>
        <p className="text-sm">
          {isNaN(amount) ? "0.00" : amount.toFixed(2)}
        </p>
      </div>

      {/* Delete column */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="text-xs p-2 h-fit self-end w-fit justify-self-center"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash size={12} strokeWidth={1.5} />
      </Button>
    </>
  );
}
