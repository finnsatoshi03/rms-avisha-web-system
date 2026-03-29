/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { RentalConsumable } from "../../lib/types";
import { addConsumable, removeConsumable } from "../../services/apiRentals";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../../services/apiMaterials";
import toast from "react-hot-toast";
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

interface RentalConsumableManagerProps {
  rentalId: number;
  consumables: RentalConsumable[];
  branchId: number;
  canEdit: boolean;
  onFinancialImpactChange?: (action: () => Promise<void>) => void;
}

export default function RentalConsumableManager({
  rentalId,
  consumables,
  branchId,
  canEdit,
  onFinancialImpactChange,
}: RentalConsumableManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const consumablesTotal = consumables.reduce(
    (sum, c) => sum + Number(c.total_amount),
    0
  );

  return (
    <div className="grid grid-cols-[1fr_0.4fr_0.5fr_0.5fr_0.2fr] gap-4 px-4 py-3 border rounded-xl">
      <h2 className="text-sm">Consumable</h2>
      <h2 className="text-sm">Quantity</h2>
      <h2 className="text-sm">Unit Price</h2>
      <h2 className="text-sm">Amount</h2>
      <h2></h2>

      {consumables.map((c) => (
        <ConsumableRow
          key={c.id}
          consumable={c}
          canEdit={canEdit}
          onFinancialImpactChange={onFinancialImpactChange}
        />
      ))}

      {showAddForm && (
        <AddConsumableRow
          rentalId={rentalId}
          branchId={branchId}
          onFinancialImpactChange={onFinancialImpactChange}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {canEdit && !showAddForm && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-dashed border-2 border-slate-800 col-span-2"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={14} strokeWidth={1.5} className="mr-2" />
          Add Consumable
        </Button>
      )}

      {!canEdit && consumables.length === 0 && (
        <p className="text-sm text-muted-foreground col-span-5 text-center py-2">
          No consumables
        </p>
      )}

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
  consumable,
  canEdit,
  onFinancialImpactChange,
}: {
  consumable: RentalConsumable;
  canEdit: boolean;
  onFinancialImpactChange?: (action: () => Promise<void>) => void;
}) {
  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: () => removeConsumable(consumable.id),
    onSuccess: () => {
      toast.success("Consumable removed");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div className="self-center">
        <p className="text-sm">{consumable.description}</p>
        <span className="text-[10px] text-muted-foreground">
          {consumable.is_manual ? "Manual" : "Inventory"}
        </span>
      </div>
      <div className="flex items-center text-sm self-center">
        {consumable.quantity}
      </div>
      <div className="flex items-center text-sm self-center">
        ₱{Number(consumable.unit_price).toFixed(2)}
      </div>
      <div className="flex gap-1 self-center">
        <p className="text-sm">₱</p>
        <p className="text-sm">{Number(consumable.total_amount).toFixed(2)}</p>
      </div>
      <div className="self-center">
        {canEdit && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="text-xs p-2 h-fit w-fit"
            onClick={() => {
              if (onFinancialImpactChange) {
                onFinancialImpactChange(async () => {
                  await removeMutation.mutateAsync();
                });
                return;
              }
              removeMutation.mutate();
            }}
            disabled={removeMutation.isPending}
          >
            <Trash size={12} strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </>
  );
}

function AddConsumableRow({
  rentalId,
  branchId,
  onFinancialImpactChange,
  onClose,
}: {
  rentalId: number;
  branchId: number;
  onFinancialImpactChange?: (action: () => Promise<void>) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isManual, setIsManual] = useState(false);
  const [materialStockId, setMaterialStockId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data: materialStocks } = useQuery({
    queryKey: ["material_stocks"],
    queryFn: () => getMaterialStocks({ fetchAll: false }),
  });

  const filteredMaterials = (materialStocks || []).filter(
    (m: any) => !m.deleted && m.stocks > 0 && m.branch_id === branchId
  );

  const selectedMaterial = filteredMaterials.find(
    (m: any) => m.id === materialStockId
  );

  const addMutation = useMutation({
    mutationFn: () =>
      addConsumable(rentalId, {
        material_stock_id: isManual ? null : materialStockId,
        description,
        quantity,
        unit_price: unitPrice,
        is_manual: isManual,
      }),
    onSuccess: () => {
      toast.success("Consumable added");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const amount = quantity * unitPrice;

  return (
    <>
      {/* Material / Description */}
      <div className="space-y-0 w-full">
        <div className="flex items-center gap-2 mb-1">
          <Switch
            checked={isManual}
            onCheckedChange={setIsManual}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        ) : (
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit"
              >
                <span className="truncate max-w-[200px] text-left">
                  {selectedMaterial
                    ? `${(selectedMaterial as any).material_name}`
                    : "Select material"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]">
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
                      (stock: any) =>
                        stock.material_name
                          .toLowerCase()
                          .includes(searchValue.toLowerCase())
                    )
                    .map((stock: any) => (
                      <CommandItem
                        key={stock.id}
                        value={stock.material_name.toLowerCase()}
                        onSelect={() => {
                          setMaterialStockId(stock.id);
                          setDescription(stock.material_name);
                          setUnitPrice(stock.price);
                          setComboOpen(false);
                          setSearchValue("");
                        }}
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
                          {stock.material_name}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center space-x-2 text-sm self-end">
        <button
          type="button"
          className="px-1 border rounded-full"
          onClick={() => quantity > 1 && setQuantity(quantity - 1)}
        >
          -
        </button>
        <div className="text-center">{quantity}</div>
        <button
          type="button"
          className="px-1 border rounded-full"
          onClick={() => setQuantity(quantity + 1)}
        >
          +
        </button>
      </div>

      {/* Unit Price */}
      <div className="flex items-center self-end relative">
        <span className="absolute pointer-events-none text-sm">₱</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="ml-3 border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
          value={unitPrice}
          onChange={(e) => setUnitPrice(Number(e.target.value))}
          disabled={!isManual && !!materialStockId}
        />
      </div>

      {/* Amount */}
      <div className="flex gap-1 self-end">
        <p className="text-sm">₱</p>
        <p className="text-sm">{isNaN(amount) ? "0.00" : amount.toFixed(2)}</p>
      </div>

      {/* Actions */}
      <div className="self-end flex gap-1">
        <Button
          type="button"
          size="sm"
          className="h-fit px-2 py-1 text-xs"
          onClick={() => {
            if (onFinancialImpactChange) {
              onFinancialImpactChange(async () => {
                await addMutation.mutateAsync();
              });
              return;
            }
            addMutation.mutate();
          }}
          disabled={!description || quantity < 1 || addMutation.isPending}
        >
          {addMutation.isPending ? "..." : "Add"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-fit px-2 py-1 text-xs"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
    </>
  );
}
