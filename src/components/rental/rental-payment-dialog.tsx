import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ReceiptAttachmentField from "../billing/receipt-attachment-field";
import ReceiptMissingConfirmDialog from "../billing/receipt-missing-confirm-dialog";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "GCash", value: "gcash" },
  { label: "PayMaya", value: "paymaya" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "GrabPay", value: "grabpay" },
];

interface RentalPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payments: Record<string, number>, receiptFile?: File | null) => void;
  grandTotal: number;
  rentalNo: string;
  isBillingLinked?: boolean;
}

export default function RentalPaymentDialog({
  open,
  onClose,
  onSubmit,
  grandTotal,
  rentalNo,
  isBillingLinked = false,
}: RentalPaymentDialogProps) {
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [totalEntered, setTotalEntered] = useState(0);
  const [splitPayments, setSplitPayments] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [showMissingReceiptConfirm, setShowMissingReceiptConfirm] =
    useState(false);
  const [pendingPayments, setPendingPayments] = useState<
    Record<string, number> | null
  >(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [confirmMethod, setConfirmMethod] = useState("");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);

  useEffect(() => {
    const total = Object.values(payments).reduce(
      (sum, value) => sum + Number(value),
      0
    );
    setTotalEntered(total);

    if (splitPayments) {
      setIsSubmitDisabled(
        selectedMethods.length === 0 || total !== grandTotal
      );
    } else {
      setIsSubmitDisabled(!splitPayments);
    }
  }, [payments, selectedMethods, splitPayments, grandTotal]);

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
          const updated = { ...prev };
          delete updated[method];
          return updated;
        });
      } else {
        setSelectedMethods([...selectedMethods, method]);
      }
    }
  };

  const resolvePaymentsToSubmit = () => {
    if (!splitPayments) {
      if (!confirmMethod) return null;
      return { [confirmMethod]: grandTotal };
    }

    if (totalEntered !== grandTotal) {
      alert(
        `Total entered (${totalEntered}) does not match the rental total (${grandTotal}).`
      );
      return null;
    }

    return payments;
  };

  const submitPayments = (payload: Record<string, number>) => {
    onSubmit(payload, receiptFile);
    setShowConfirm(false);
    setShowBillingConfirm(false);
    setShowMissingReceiptConfirm(false);
    setPendingPayments(null);
    setReceiptFile(null);
  };

  const maybeConfirmMissingReceipt = (payload: Record<string, number>) => {
    if (!receiptFile) {
      setPendingPayments(payload);
      setShowMissingReceiptConfirm(true);
      return;
    }
    submitPayments(payload);
  };

  const handleConfirmPayment = () => {
    const payload = resolvePaymentsToSubmit();
    if (!payload) return;

    if (isBillingLinked) {
      setPendingPayments(payload);
      setShowBillingConfirm(true);
      setShowConfirm(false);
      return;
    }

    maybeConfirmMissingReceipt(payload);
  };

  const handleBillingConfirm = () => {
    if (!pendingPayments) return;
    setShowBillingConfirm(false);
    maybeConfirmMissingReceipt(pendingPayments);
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
              Complete Rental {rentalNo} — Total Amount
            </DialogDescription>
            <DialogTitle className="text-3xl font-bold md:text-5xl">
              <span className="opacity-60">₱</span>
              {formatNumberWithCommas(grandTotal)}
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
                    variant="outline"
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
                      onChange={(e) =>
                        handlePaymentChange(method.value, e.target.value)
                      }
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
            variant={splitPayments ? "default" : "outline"}
            onClick={toggleSplitPayments}
          >
            {splitPayments ? "Cancel Split Payments" : "Split Payments"}
          </Button>

          <div className="grid grid-cols-[0.5fr_1fr] gap-2 mt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isSubmitDisabled}>
              Submit Payment
            </Button>
          </div>
          <ReceiptAttachmentField
            file={receiptFile}
            onFileChange={setReceiptFile}
            inputId="rental-receipt-upload"
          />
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
                {formatNumberWithCommas(grandTotal)}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="default"
              onClick={handleConfirmPayment}
              className="bg-green-500 hover:bg-green-600"
            >
              Yes, Confirm
            </Button>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <ReceiptMissingConfirmDialog
        open={showMissingReceiptConfirm}
        onOpenChange={setShowMissingReceiptConfirm}
        onAttachNow={() => setShowMissingReceiptConfirm(false)}
        onContinueWithoutReceipt={() => {
          if (!pendingPayments) return;
          submitPayments(pendingPayments);
        }}
      />
      {showBillingConfirm && (
        <AlertDialog
          open={showBillingConfirm}
          onOpenChange={(nextOpen) => {
            setShowBillingConfirm(nextOpen);
            if (!nextOpen) {
              setPendingPayments(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                This payment will reflect in Billing Statement
              </AlertDialogTitle>
              <AlertDialogDescription>
                This rental is linked or transferred to billing. Confirming
                this payment will update the billing statement and remaining
                balance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="default"
              onClick={handleBillingConfirm}
              className="bg-green-500 hover:bg-green-600"
            >
              Confirm & Update Billing
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBillingConfirm(false);
                setPendingPayments(null);
              }}
            >
              Cancel
            </Button>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
