/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { RentalConsumable } from "../../lib/types";
import { addConsumable, removeConsumable } from "../../services/apiRentals";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../../services/apiMaterials";
import toast from "react-hot-toast";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";

interface RentalConsumableManagerProps {
  rentalId: number;
  consumables: RentalConsumable[];
  branchId: number;
  canEdit: boolean;
}

export default function RentalConsumableManager({
  rentalId,
  consumables,
  branchId,
  canEdit,
}: RentalConsumableManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-2">
      {consumables.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No consumables
        </p>
      )}

      {consumables.map((c) => (
        <ConsumableItem
          key={c.id}
          consumable={c}
          canEdit={canEdit}
        />
      ))}

      {consumables.length > 0 && (
        <div className="flex justify-end text-sm font-medium border-t pt-1">
          Total: ₱
          {consumables
            .reduce((sum, c) => sum + Number(c.total_amount), 0)
            .toFixed(2)}
        </div>
      )}

      {canEdit && !showAddForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Consumable
        </Button>
      )}

      {showAddForm && (
        <AddConsumableForm
          rentalId={rentalId}
          branchId={branchId}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function ConsumableItem({
  consumable,
  canEdit,
}: {
  consumable: RentalConsumable;
  canEdit: boolean;
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
    <div className="flex items-center justify-between border rounded px-3 py-2 text-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{consumable.description}</span>
          <Badge variant="outline" className="text-[10px]">
            {consumable.is_manual ? "Manual" : "Inventory"}
          </Badge>
        </div>
        <span className="text-muted-foreground text-xs">
          {consumable.quantity} x ₱{Number(consumable.unit_price).toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">
          ₱{Number(consumable.total_amount).toFixed(2)}
        </span>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AddConsumableForm({
  rentalId,
  branchId,
  onClose,
}: {
  rentalId: number;
  branchId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isManual, setIsManual] = useState(false);
  const [materialStockId, setMaterialStockId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [comboOpen, setComboOpen] = useState(false);

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

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={isManual} onCheckedChange={setIsManual} />
          <Label className="text-xs text-muted-foreground">
            {isManual ? "Manual Entry" : "From Inventory"}
          </Label>
        </div>
      </div>

      {isManual ? (
        <Input
          placeholder="Description (e.g., Black Ink Bottle)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      ) : (
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal text-sm"
            >
              {selectedMaterial
                ? `${(selectedMaterial as any).material_name} (${(selectedMaterial as any).stocks} in stock)`
                : "Select from inventory..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search materials..." />
              <CommandEmpty>No materials found.</CommandEmpty>
              <CommandGroup className="max-h-48 overflow-auto">
                {filteredMaterials.map((material: any) => (
                  <CommandItem
                    key={material.id}
                    value={`${material.material_name} ${material.brand || ""}`}
                    onSelect={() => {
                      setMaterialStockId(material.id);
                      setDescription(material.material_name);
                      setUnitPrice(material.price);
                      setComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        materialStockId === material.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{material.material_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ₱{material.price} | {material.stocks} in stock
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Qty</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs">Unit Price</Label>
          <Input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
            disabled={!isManual && !!materialStockId}
          />
        </div>
        <div>
          <Label className="text-xs">Total</Label>
          <Input
            value={`₱${(quantity * unitPrice).toFixed(2)}`}
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => addMutation.mutate()}
          disabled={!description || quantity < 1 || addMutation.isPending}
        >
          {addMutation.isPending ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
