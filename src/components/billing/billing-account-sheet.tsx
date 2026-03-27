import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  CreditCard,
  FileText,
  Plus,
  Percent,
  Pencil,
  DollarSign,
  Receipt,
  Phone,
  Mail,
  User,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Info,
} from "lucide-react";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

import {
  useBillingAccount,
  useBillingAccountBalance,
  useBillingAccountAging,
  useBillingLedger,
  useBillingLineItems,
  useBillingPayments,
  useBillingStatements,
  useApplyAccountInterest,
  useUpdateBillingStatement,
} from "./useBilling";
import { useUser } from "../auth/useUser";
import { formatNumberWithCommas } from "../../lib/helpers";
import {
  BillingAccount,
  LedgerEntry,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
  BillingAging,
} from "../../lib/billing-types";

import RecordPaymentPanel from "./record-payment-panel";
import AttachJobOrderPanel from "./attach-job-order-panel";
import GenerateStatementPanel from "./generate-statement-panel";
import BillingAccountFormSheet from "./billing-account-form";

// ─── Badge maps ─────────────────────────────────────────────────────────────

const statusVariant: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  suspended: "bg-yellow-100 text-yellow-800 border-yellow-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const ledgerTypeBadge: Record<string, string> = {
  charge: "bg-slate-100 text-slate-700 border-slate-200",
  payment: "bg-green-100 text-green-700 border-green-200",
  interest: "bg-amber-100 text-amber-700 border-amber-200",
  adjustment: "bg-blue-100 text-blue-700 border-blue-200",
  credit: "bg-purple-100 text-purple-700 border-purple-200",
};

const statementStatusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  finalized: "bg-blue-100 text-blue-700 border-blue-200",
  sent: "bg-green-100 text-green-700 border-green-200",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function amt(value: number | null | undefined): string {
  if (value == null) return "₱0";
  return `₱${formatNumberWithCommas(Math.abs(value))}`;
}

function creditLimitPercent(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((balance / limit) * 100));
}

function creditBarColor(pct: number): string {
  if (pct < 50) return "bg-green-500";
  if (pct < 80) return "bg-yellow-500";
  return "bg-red-500";
}

function balanceColorClass(balance: number, aging?: BillingAging): string {
  if (balance === 0) return "text-green-600";
  const overdue =
    aging &&
    (aging.days_1_30 > 0 ||
      aging.days_31_60 > 0 ||
      aging.days_61_90 > 0 ||
      aging.days_90_plus > 0);
  if (overdue) return "text-red-600";
  return "text-gray-900";
}

// ─── Tooltip helper ─────────────────────────────────────────────────────────

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          size={12}
          className="inline-block ml-1 text-gray-400 hover:text-gray-600 cursor-help align-middle"
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[220px] text-xs leading-snug"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Sub-sheet types ────────────────────────────────────────────────────────

type SubSheetType = "payment" | "attach-jo" | "statement" | "edit" | null;

// ─── Component ──────────────────────────────────────────────────────────────

interface BillingAccountSheetContentProps {
  accountId: string;
  onClose: () => void;
}

export default function BillingAccountSheetContent({
  accountId,
  onClose,
}: BillingAccountSheetContentProps) {
  const { isDev, isAdmin } = useUser();

  const [activeSubSheet, setActiveSubSheet] = useState<SubSheetType>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  // Check window width for responsive stacking
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Escape key handling - close sub-sheet first, then main sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSubSheet) {
          setActiveSubSheet(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSubSheet, onClose]);

  // Data hooks
  const {
    data: account,
    isLoading: accountLoading,
    isError: accountError,
  } = useBillingAccount(accountId);
  const { data: balanceData, isLoading: balanceLoading } =
    useBillingAccountBalance(accountId);
  const { data: agingData, isLoading: agingLoading } =
    useBillingAccountAging(accountId);
  const { data: ledger, isLoading: ledgerLoading } =
    useBillingLedger(accountId);
  const { data: lineItems } = useBillingLineItems(accountId);
  const { data: payments, isLoading: paymentsLoading } =
    useBillingPayments(accountId);
  const { data: statements, isLoading: statementsLoading } =
    useBillingStatements(accountId);

  // Mutations
  const applyInterest = useApplyAccountInterest();
  const updateStatement = useUpdateBillingStatement();

  // Collapsible section states
  const [statementsOpen, setStatementsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [jobOrdersOpen, setJobOrdersOpen] = useState(false);
  const [showInterestConfirm, setShowInterestConfirm] = useState(false);

  // Derived
  const acct = account as BillingAccount | undefined;
  const balance =
    typeof balanceData === "number"
      ? balanceData
      : (acct?.current_balance ?? 0);
  const aging = (agingData ?? acct?.aging) as BillingAging | undefined;
  const clientId = acct?.client_id ?? 0;
  const creditLimit = acct?.credit_limit ?? 0;
  const usagePct = creditLimitPercent(balance, creditLimit);

  const joLineItems = ((lineItems ?? []) as BillingLineItem[]).filter(
    (li) => li.type === "charge" && li.job_order_id != null
  );

  const openSubSheet = useCallback((type: SubSheetType) => {
    setActiveSubSheet(type);
  }, []);

  const closeSubSheet = useCallback(() => {
    setActiveSubSheet(null);
  }, []);

  function handleApplyInterest() {
    setShowInterestConfirm(true);
  }

  function confirmApplyInterest() {
    applyInterest.mutate(accountId, {
      onSettled: () => setShowInterestConfirm(false),
    });
  }

  function handleFinalizeStatement(statementId: string) {
    updateStatement.mutate({
      id: statementId,
      updates: { status: "finalized" },
    });
  }

  function handleSendStatement() {
    toast("Email sending not yet configured", { icon: "ℹ️" });
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (accountLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (accountError || !acct) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <Receipt size={48} strokeWidth={1} className="opacity-40" />
        <p className="text-sm">
          {accountError
            ? "Failed to load billing account."
            : "Billing account not found."}
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const contactPhone =
    acct.billing_contact_phone || acct.clients?.contact_number;
  const contactEmail =
    acct.billing_contact_email || acct.clients?.email;
  const contactName = acct.billing_contact_name;

  const isCompressed = activeSubSheet !== null;
  const shouldStack = isNarrow && isCompressed;

  // ─── Header (always visible) ──────────────────────────────────────────────

  const headerSection = (
    <div className="space-y-3">
      {/* Account number + status row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">
          {acct.account_number}
        </span>
        <Badge
          variant="outline"
          className={`text-xs capitalize ${statusVariant[acct.status] ?? ""}`}
        >
          {acct.status}
        </Badge>
      </div>

      {/* Client name + type */}
      <div>
        <h2 className="text-xl font-bold tracking-tight leading-tight">
          {acct.clients?.name ?? "Unknown Client"}
        </h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
          {acct.clients?.type && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
              {acct.clients.type}
            </span>
          )}
          {contactPhone && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Phone size={10} /> {contactPhone}
            </span>
          )}
          {contactEmail && !isCompressed && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Mail size={10} /> {contactEmail}
            </span>
          )}
          {contactName && !isCompressed && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <User size={10} /> {contactName}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Balance summary (always visible) ─────────────────────────────────────

  const totalOverdue = aging
    ? aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus
    : 0;

  const balanceSummary = (
    <div className="space-y-3">
      {/* Balance */}
      <div>
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Total Unpaid
          </span>
          <HelpTip text="Total amount this client still owes across all job orders and charges." />
        </div>
        {balanceLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <span
            className={`text-2xl font-bold tabular-nums block ${balanceColorClass(balance, aging)}`}
          >
            {amt(balance)}
          </span>
        )}
        {totalOverdue > 0 && (
          <p className="text-[11px] text-red-500 mt-0.5">
            {amt(totalOverdue)} overdue
          </p>
        )}
      </div>

      {/* Credit limit bar */}
      {creditLimit > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center">
              Credit Limit: {amt(creditLimit)}
              <HelpTip text="Maximum allowed unpaid balance. New charges may be restricted when this limit is reached." />
            </span>
            <span>{usagePct}% used</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${creditBarColor(usagePct)}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Aging breakdown */}
      {agingLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : aging ? (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              Aging Breakdown
            </span>
            <HelpTip text="Shows how old the unpaid amounts are. 'Current' means not yet due. Overdue amounts are grouped by how many days past due." />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {
                label: "Current",
                desc: "Not yet due",
                value: aging.current_amount,
                warn: false,
              },
              {
                label: "1-30 days",
                desc: "Overdue 1-30 days",
                value: aging.days_1_30,
                warn: true,
              },
              {
                label: "31-60 days",
                desc: "Overdue 31-60 days",
                value: aging.days_31_60,
                warn: true,
              },
              {
                label: "61-90 days",
                desc: "Overdue 61-90 days",
                value: aging.days_61_90,
                warn: true,
              },
              {
                label: "Over 90 days",
                desc: "Overdue more than 90 days",
                value: aging.days_90_plus,
                warn: true,
              },
            ].map((bucket) => (
              <Tooltip key={bucket.label}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between px-2 py-1 rounded border bg-gray-50/80 cursor-default">
                    <span className="text-[11px] text-gray-500">
                      {bucket.label}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        bucket.value > 0 && bucket.warn ? "text-red-600" : ""
                      }`}
                    >
                      {amt(bucket.value)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {bucket.desc}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  // ─── Action buttons ───────────────────────────────────────────────────────

  const actionButtons = (
    <div className={`grid gap-1.5 ${isCompressed ? "grid-cols-1" : "grid-cols-2"}`}>
      <Button
        size="sm"
        className="gap-1.5 h-8 text-xs"
        variant={activeSubSheet === "payment" ? "default" : "outline"}
        onClick={() =>
          activeSubSheet === "payment"
            ? closeSubSheet()
            : openSubSheet("payment")
        }
      >
        <DollarSign size={13} />
        Payment
      </Button>
      <Button
        size="sm"
        className="gap-1.5 h-8 text-xs"
        variant={activeSubSheet === "attach-jo" ? "default" : "outline"}
        onClick={() =>
          activeSubSheet === "attach-jo"
            ? closeSubSheet()
            : openSubSheet("attach-jo")
        }
      >
        <Plus size={13} />
        Attach JO
      </Button>
      <Button
        size="sm"
        className="gap-1.5 h-8 text-xs"
        variant={activeSubSheet === "statement" ? "default" : "outline"}
        onClick={() =>
          activeSubSheet === "statement"
            ? closeSubSheet()
            : openSubSheet("statement")
        }
      >
        <FileText size={13} />
        Statement
      </Button>
      {(isDev || isAdmin) && (
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          variant={activeSubSheet === "edit" ? "default" : "outline"}
          onClick={() =>
            activeSubSheet === "edit"
              ? closeSubSheet()
              : openSubSheet("edit")
          }
        >
          <Pencil size={13} />
          Edit
        </Button>
      )}
      {(isDev || isAdmin) && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-8 text-xs col-span-full"
          onClick={handleApplyInterest}
          disabled={applyInterest.isPending}
        >
          <Percent size={13} />
          {applyInterest.isPending ? "Applying..." : "Apply Interest"}
        </Button>
      )}
    </div>
  );

  // ─── Ledger table ─────────────────────────────────────────────────────────

  const ledgerSection = (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider">
          Transaction Ledger
        </h3>
        <HelpTip text="Complete history of all charges, payments, and adjustments on this account. Debit = amount owed, Credit = amount paid." />
      </div>
      {ledgerLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !ledger || (ledger as LedgerEntry[]).length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400">
          <CreditCard size={32} strokeWidth={1} className="mb-2 opacity-40" />
          <p className="text-xs">No transactions yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-[11px] font-semibold">
                  Date
                </TableHead>
                <TableHead className="text-[11px] font-semibold">
                  Type
                </TableHead>
                <TableHead className="text-[11px] font-semibold">
                  Description
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-right">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      Charges
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Amount added to the balance (charges, interest)
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-right">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      Payments
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Amount paid / deducted from the balance
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-right">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      Running Bal.
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Running total of unpaid balance after this transaction
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ledger as LedgerEntry[]).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs whitespace-nowrap py-1.5">
                    {format(new Date(entry.date), "MMM d")}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize px-1.5 py-0 cursor-default ${ledgerTypeBadge[entry.type] ?? ""}`}
                        >
                          {entry.type}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {entry.type === "charge" && "Charge from a job order or service"}
                        {entry.type === "payment" && "Payment received from client"}
                        {entry.type === "interest" && "Monthly interest on overdue balance"}
                        {entry.type === "adjustment" && "Manual balance adjustment"}
                        {entry.type === "credit" && "Credit / refund applied"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate py-1.5">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums py-1.5">
                    {entry.debit > 0 ? amt(entry.debit) : ""}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-green-600 py-1.5">
                    {entry.credit > 0 ? amt(entry.credit) : ""}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium py-1.5">
                    {amt(entry.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  // ─── Collapsible sections ─────────────────────────────────────────────────

  const jobOrdersSection = (
    <Collapsible open={jobOrdersOpen} onOpenChange={setJobOrdersOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <Receipt size={13} />
          Attached Job Orders ({joLineItems.length})
        </span>
        {jobOrdersOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {joLineItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No job orders attached.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">
                    JO #
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Branch
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">
                    Paid
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {joLineItems.map((li) => {
                  const paid = li.paid_amount ?? 0;
                  const fullyPaid = paid >= li.amount;
                  return (
                    <TableRow key={li.id}>
                      <TableCell className="text-xs font-mono py-1.5">
                        {li.joborders?.order_no ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-1.5">
                        {li.branches?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums py-1.5">
                        {amt(li.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums py-1.5">
                        {amt(paid)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            fullyPaid
                              ? "bg-green-100 text-green-700 border-green-200"
                              : paid > 0
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {fullyPaid
                            ? "Paid"
                            : paid > 0
                              ? "Partial"
                              : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  const recentPaymentsSection = (
    <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <DollarSign size={13} />
          Payments (
          {(payments as BillingPayment[] | undefined)?.length ?? 0})
        </span>
        {paymentsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {paymentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !payments || (payments as BillingPayment[]).length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No payments recorded.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Method
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Ref #
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments as BillingPayment[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(p.payment_date), "MMM d, yy")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium text-green-700 py-1.5">
                      {amt(p.amount)}
                    </TableCell>
                    <TableCell className="text-xs capitalize py-1.5">
                      {p.payment_method ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono py-1.5">
                      {p.reference_number ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  const recentStatementsSection = (
    <Collapsible open={statementsOpen} onOpenChange={setStatementsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <FileText size={13} />
          Statements (
          {(statements as BillingStatement[] | undefined)?.length ?? 0})
        </span>
        {statementsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {statementsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !statements ||
          (statements as BillingStatement[]).length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No statements generated.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        SOA #
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Statement of Account number
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Period
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(statements as BillingStatement[]).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-mono py-1.5">
                      {s.statement_number}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(s.period_start), "MMM d")} -{" "}
                      {format(new Date(s.period_end), "MMM d")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium py-1.5">
                      {amt(s.current_balance)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize px-1.5 py-0 cursor-default ${statementStatusBadge[s.status] ?? ""}`}
                          >
                            {s.status}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {s.status === "draft" &&
                            "Draft — not yet reviewed. Click Finalize to lock it."}
                          {s.status === "finalized" &&
                            "Finalized — reviewed and locked. Ready to send to client."}
                          {s.status === "sent" &&
                            "Sent — delivered to the client."}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1">
                        {s.status === "draft" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px]"
                                onClick={() =>
                                  handleFinalizeStatement(s.id)
                                }
                                disabled={updateStatement.isPending}
                              >
                                Finalize
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="text-xs"
                            >
                              Lock this statement so it can be sent to the
                              client
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {s.status === "finalized" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={handleSendStatement}
                          >
                            Send
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  // ─── Sub-sheet content ────────────────────────────────────────────────────

  const subSheetTitle: Record<string, string> = {
    payment: "Record Payment",
    "attach-jo": "Attach Job Orders",
    statement: "Generate Statement",
    edit: "Edit Account",
  };

  const subSheetContent = activeSubSheet && (
    <div className="flex flex-col h-full">
      {/* Sub-sheet header — back arrow on the LEFT, no X on the right */}
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-gray-50/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={closeSubSheet}
        >
          <ArrowLeft size={16} />
        </Button>
        <h3 className="text-sm font-semibold flex-1">
          {subSheetTitle[activeSubSheet]}
        </h3>
      </div>

      {/* Sub-sheet body */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeSubSheet === "payment" && (
          <RecordPaymentPanel
            accountId={accountId}
            onClose={closeSubSheet}
          />
        )}
        {activeSubSheet === "attach-jo" && (
          <AttachJobOrderPanel
            accountId={accountId}
            clientId={clientId}
            onClose={closeSubSheet}
          />
        )}
        {activeSubSheet === "statement" && (
          <GenerateStatementPanel
            accountId={accountId}
            onClose={closeSubSheet}
          />
        )}
        {activeSubSheet === "edit" && (
          <BillingAccountFormSheet
            accountId={accountId}
            onClose={closeSubSheet}
            onSuccess={() => closeSubSheet()}
          />
        )}
      </div>
    </div>
  );

  // ─── Main sheet content ───────────────────────────────────────────────────

  const mainContent = (
    <div
      className={`flex flex-col h-full transition-all duration-300 ease-in-out ${
        shouldStack && isCompressed ? "hidden" : ""
      }`}
      style={{
        width: isCompressed && !shouldStack ? "300px" : "100%",
        minWidth: isCompressed && !shouldStack ? "300px" : undefined,
      }}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {headerSection}
        <Separator />
        {balanceSummary}
        <Separator />
        {actionButtons}

        {/* Ledger - hidden when compressed (not enough space) */}
        {!isCompressed && (
          <>
            <Separator />
            {ledgerSection}
            <Separator />
            {jobOrdersSection}
            {recentPaymentsSection}
            {recentStatementsSection}

            {/* Account info footer */}
            {acct.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-1">
                    Notes
                  </h3>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">
                    {acct.notes}
                  </p>
                </div>
              </>
            )}

            <div className="text-[10px] text-gray-300 pt-2">
              Interest: {acct.interest_rate}% monthly &middot; Cutoff:
              Day {acct.billing_cutoff_day} &middot; Created{" "}
              {format(new Date(acct.created_at), "MMM d, yyyy")}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── Render layout ────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full overflow-hidden">
        {mainContent}

        {/* Sub-sheet panel */}
        {isCompressed && (
          <div
            className={`border-l bg-white flex-1 transition-all duration-300 ease-in-out overflow-hidden ${
              shouldStack ? "absolute inset-0 border-l-0" : ""
            }`}
          >
            {subSheetContent}
          </div>
        )}
      </div>

      {/* Apply Interest Confirmation Dialog */}
      <AlertDialog open={showInterestConfirm} onOpenChange={setShowInterestConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Interest</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply a {acct.interest_rate}% monthly interest charge on
              overdue balances for this account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyInterest.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApplyInterest}
              disabled={applyInterest.isPending}
            >
              {applyInterest.isPending ? "Applying..." : "Apply Interest"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
