import { JobOrderData } from "../../lib/types";
import { getBillingSyncSnapshot, getPaymentStatusLabel, isBillingLinkedSource } from "../../lib/billing-sync";
import { directPaymentEntries, jobOrderBillingPayments, paymentMethodLabel } from "../../lib/job-order-payments";
import { formatNumberWithCommas } from "../../lib/helpers";
import { formatDateLabel } from "../../lib/transaction-date";
import { useBillingPayments } from "../billing/useBilling";
import { Button } from "../ui/button";
import PaymentMethodIcon from "../payment-method-icon";

const peso = (value: number) => `₱${formatNumberWithCommas(value)}`;

// Rendered inside the Job Order Summary receipt, below Grand Total.
export default function CompletedPaymentDetails({ jobOrder }: { jobOrder: JobOrderData }) {
  const linked = isBillingLinkedSource({
    sourceType: "job_order", sourceId: jobOrder.id,
    transferredToBilling: jobOrder.transferred_to_billing,
    paymentDetails: jobOrder.payment_details,
  });
  const query = useBillingPayments(linked ? jobOrder.billing_account_id || undefined : undefined);
  const payments = jobOrderBillingPayments(query.data || [], jobOrder.id);
  const direct = directPaymentEntries(jobOrder.payment_details);
  const snapshot = linked ? getBillingSyncSnapshot(jobOrder.payment_details) : null;

  const rows = linked ? payments.map((payment) => (
    <div key={payment.id}>
      <div className="flex justify-between gap-4">
        <p className="flex items-center gap-1.5"><PaymentMethodIcon method={payment.payment_method || "billing"} size={16} tooltip={null} /><span className="opacity-60">{paymentMethodLabel(payment.payment_method)}</span></p>
        <p>{peso(payment.allocatedAmount)}</p>
      </div>
      <p
        className="text-xs text-slate-500"
        title={payment.payment_method === "split" && payment.notes ? `Breakdown of entire payment: ${payment.notes}` : undefined}
      >
        {formatDateLabel(payment.payment_date)}
        {payment.reference_number && ` · Ref ${payment.reference_number}`}
      </p>
    </div>
  )) : direct.map(({ method, amount }) => (
    <div key={method} className="flex justify-between gap-4">
      <p className="flex items-center gap-1.5"><PaymentMethodIcon method={method} size={16} tooltip={null} /><span className="opacity-60">{paymentMethodLabel(method)}</span></p>
      <p>{peso(amount)}</p>
    </div>
  ));

  return (
    <section aria-label="Payment details" className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 space-y-1">
      <p>{linked ? "Paid via Billing" : "Payment"}</p>
      {linked && query.isLoading ? (
        <p role="status" className="text-xs text-slate-500">Loading payments…</p>
      ) : linked && query.isError ? (
        <p role="alert" className="text-xs text-red-500">
          Couldn't load payments.{" "}
          <Button type="button" variant="link" className="h-fit p-0 text-xs" onClick={() => void query.refetch()}>Retry</Button>
        </p>
      ) : rows.length ? rows : (
        <p className="text-xs text-slate-500">Method not recorded</p>
      )}
      {snapshot && (
        <div className="flex justify-between gap-4 pt-1 font-semibold">
          <p>Balance <span className="font-normal text-xs text-slate-500">({getPaymentStatusLabel(snapshot.payment_status)})</span></p>
          <p>{peso(snapshot.remaining_balance || 0)}</p>
        </div>
      )}
    </section>
  );
}
