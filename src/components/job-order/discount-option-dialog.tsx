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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px]">
        <DialogHeader className="items-center">
          <DialogTitle className="text-xl font-extrabold">
            Select a Discount
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Choose a discount option for the customer from the available options
            below.
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
      </DialogContent>
    </Dialog>
  );
}
