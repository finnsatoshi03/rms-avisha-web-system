import { useState } from "react";
import { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { formatNumberWithCommas } from "../../lib/helpers";
import { TicketSlash } from "lucide-react";
import { Input } from "../ui/input";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  grandTotal: number;
  onSelectDiscount: (discount: number) => void;
}

const DiscountButton = ({
  discount,
  grandTotal,
  onSelectDiscount,
}: {
  discount: number;
  grandTotal: number;
  onSelectDiscount: (discount: number) => void;
}) => (
  <Button
    className="flex justify-between py-6"
    onClick={() => onSelectDiscount(discount)}
  >
    <span className="flex gap-1 items-center">
      <TicketSlash size={12} className="rotate-45" />
      {discount}
    </span>
    <span className="flex flex-col text-xs">
      <span className="text-[10px] line-through">
        ₱{formatNumberWithCommas(grandTotal)}
      </span>
      <span>₱{formatNumberWithCommas(grandTotal - discount)}</span>
    </span>
  </Button>
);

export default function DiscountDialog({
  open,
  onOpenChange,
  grandTotal,
  onSelectDiscount,
}: DiscountDialogProps) {
  const discounts = [150, 200, 300, 500];

  const [manualDiscount, setManualDiscount] = useState<number | string>("");

  const handleManualDiscountSubmit = () => {
    const discount = Number(manualDiscount);
    if (!isNaN(discount) && discount > 0) {
      onSelectDiscount(discount);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px]">
        <DialogHeader className="items-center">
          <DialogTitle className="text-xl font-extrabold">
            Select a Discount
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Choose a discount option for the customer from the available options
            below, or enter a custom discount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {discounts.map((discount) => (
            <DiscountButton
              key={discount}
              discount={discount}
              grandTotal={grandTotal}
              onSelectDiscount={onSelectDiscount}
            />
          ))}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_0.5fr] gap-2">
          <Input
            type="text"
            className="border border-primary w-full p-2 text-center"
            placeholder="Enter custom discount"
            value={manualDiscount}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              if (/^\d*$/.test(value)) {
                setManualDiscount(value);
              }
            }}
            pattern="\d*"
          />
          <Button className="w-full" onClick={handleManualDiscountSubmit}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
