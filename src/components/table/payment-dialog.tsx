import React, { useState, useEffect, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialogContent,
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { JobOrderData } from "../../lib/types";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "GCash", value: "gcash" },
  { label: "PayMaya", value: "paymaya" },
  { label: "Paypal", value: "paypal" },
  { label: "GrabPay", value: "grabpay" },
];

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payments: Record<string, number>) => void;
  order: JobOrderData;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  order,
}) => {
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [totalEntered, setTotalEntered] = useState<number>(0);
  const [splitPayments, setSplitPayments] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [confirmMethod, setConfirmMethod] = useState<string>("");

  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(true);

  useEffect(() => {
    const total = Object.values(payments).reduce(
      (sum, value) => sum + Number(value),
      0
    );
    setTotalEntered(total);

    if (splitPayments) {
      setIsSubmitDisabled(
        selectedMethods.length === 0 || totalEntered !== order.grand_total
      );
    } else {
      setIsSubmitDisabled(!splitPayments);
    }
  }, [payments, selectedMethods, totalEntered, splitPayments, confirmMethod]);

  const handlePaymentChange = (method: string, value: string) => {
    setPayments({ ...payments, [method]: Number(value) });
  };

  const handleMethodSelect = (method: string) => {
    if (!splitPayments) {
      setConfirmMethod(method);
      setShowConfirm(true);
    } else {
      if (selectedMethods.includes(method)) {
        setSelectedMethods(selectedMethods.filter((m) => m !== method));
        setPayments((prev) => {
          const updatedPayments = { ...prev };
          delete updatedPayments[method];
          return updatedPayments;
        });
      } else {
        setSelectedMethods([...selectedMethods, method]);
      }
    }
  };

  const handleConfirmPayment = () => {
    if (!splitPayments) {
      const newPayments = { [confirmMethod]: order.grand_total ?? 0 };
      onSubmit(newPayments);
    } else if (totalEntered !== order.grand_total) {
      alert(
        `Total entered (${totalEntered}) does not match the order total (${order.grand_total}).`
      );
      return;
    } else {
      onSubmit(payments);
    }

    setShowConfirm(false);
  };

  const toggleSplitPayments = () => {
    if (splitPayments) {
      setPayments({});
      setSelectedMethods([]);
    }
    setSplitPayments(!splitPayments);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogDescription className="opacity-60 text-xs md:text-sm">
              Total Amount to Pay
            </DialogDescription>
            <DialogTitle className="text-3xl font-bold md:text-5xl">
              <span className="opacity-60">₱</span>
              {formatNumberWithCommas(order.grand_total ?? 0)}
            </DialogTitle>
          </DialogHeader>

          {!splitPayments && (
            <>
              <p className="text-xs md:text-sm">Payment Method:</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    className={`hover:bg-green-500 hover:text-white ${
                      selectedMethods.includes(method.value) ? "selected" : ""
                    }`}
                    variant={"outline"}
                    onClick={() => handleMethodSelect(method.value)}
                  >
                    {method.label}
                  </Button>
                ))}
              </div>
            </>
          )}

          {splitPayments && (
            <>
              <p>Select payment methods and split amounts:</p>
              {paymentMethods.map((method) => (
                <div
                  key={method.value}
                  className="grid grid-cols-[0.5fr_1fr] gap-2"
                >
                  <Button
                    className={`payment-method-button ${
                      selectedMethods.includes(method.value) ? "selected" : ""
                    }`}
                    onClick={() => handleMethodSelect(method.value)}
                  >
                    {method.label}
                  </Button>
                  {selectedMethods.includes(method.value) && (
                    <Input
                      type="number"
                      min="0"
                      placeholder={`Enter amount for ${method.label}`}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          handlePaymentChange(method.value, value);
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {splitPayments && <p>Total entered: {totalEntered}</p>}
          <Button
            className={`${
              splitPayments
                ? "bg-red-500 hover:bg-red-600"
                : "hover:bg-green-500 hover:text-white"
            }`}
            variant={`${splitPayments ? "default" : "outline"}`}
            onClick={toggleSplitPayments}
          >
            {splitPayments ? "Cancel Split Payments" : "Split Payments"}
          </Button>

          <div className="grid grid-cols-[0.5fr_1fr] gap-2 mt-4">
            <Button variant={"secondary"} onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isSubmitDisabled}>
              Submit Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showConfirm && (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to process full payment with{" "}
                {confirmMethod.toUpperCase()} for ₱
                {formatNumberWithCommas(order.grand_total ?? 0)}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant={"default"}
              onClick={handleConfirmPayment}
              className="bg-green-500 hover:bg-green-600"
            >
              Yes, Confirm
            </Button>
            <Button variant={"secondary"} onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
