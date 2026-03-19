import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  ArrowLeft,
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
  Calendar,
  Clock,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";

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
} from "../components/billing/useBilling";
import { useUser } from "../components/auth/useUser";
import { formatNumberWithCommas } from "../lib/helpers";
import {
  BillingAccount,
  LedgerEntry,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
  BillingAging,
} from "../lib/billing-types";

import RecordPaymentDialog from "../components/billing/record-payment-dialog";
import AttachJobOrderDialog from "../components/billing/attach-job-order-dialog";
import GenerateStatementDialog from "../components/billing/generate-statement-dialog";
import BillingAccountFormSheet from "../components/billing/billing-account-form";

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

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillingAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDev, isAdmin } = useUser();

  // Data hooks
  const {
    data: account,
    isLoading: accountLoading,
    isError: accountError,
  } = useBillingAccount(id);
  const { data: balanceData, isLoading: balanceLoading } =
    useBillingAccountBalance(id);
  const { data: agingData, isLoading: agingLoading } =
    useBillingAccountAging(id);
  const { data: ledger, isLoading: ledgerLoading } = useBillingLedger(id);
  const { data: lineItems, isLoading: lineItemsLoading } =
    useBillingLineItems(id);
  const { data: payments, isLoading: paymentsLoading } =
    useBillingPayments(id);
  const { data: statements, isLoading: statementsLoading } =
    useBillingStatements(id);

  // Mutations
  const applyInterest = useApplyAccountInterest();
  const updateStatement = useUpdateBillingStatement();

  // Dialogs
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [attachJoOpen, setAttachJoOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

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

  // ─── Error state ──────────────────────────────────────────────────────────

  if (accountError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
        <Receipt size={48} strokeWidth={1} className="opacity-40" />
        <p>Failed to load billing account.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/billing")}
        >
          <ArrowLeft size={14} className="mr-1.5" />
          Back to Billing
        </Button>
      </div>
    );
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (accountLoading) {
    return (
      <div className="flex gap-6 p-1">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="w-[300px] space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!acct) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
        <Receipt size={48} strokeWidth={1} className="opacity-40" />
        <p>Billing account not found.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/billing")}
        >
          <ArrowLeft size={14} className="mr-1.5" />
          Back to Billing
        </Button>
      </div>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleApplyInterest() {
    if (!id) return;
    applyInterest.mutate(id);
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

  const contactPhone =
    acct.billing_contact_phone || acct.clients?.contact_number;
  const contactEmail =
    acct.billing_contact_email || acct.clients?.email;
  const contactName = acct.billing_contact_name;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── like JO sheet with pills + large name ──────────── */}
      <div className="mb-4">
        {/* Back + pills row */}
        <div className="flex items-center gap-2 mb-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => navigate("/billing")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex flex-wrap gap-1.5 items-center">
            <div className="px-3 py-0.5 bg-gray-200 rounded-full text-gray-600 text-xs flex items-center gap-1">
              <Clock size={11} strokeWidth={1.5} />
              {format(new Date(acct.created_at), "MMMM d, yyyy")}
            </div>
            <div className="px-3 py-0.5 bg-red-100 rounded-full text-red-600 text-xs font-mono">
              #{acct.account_number}
            </div>
            <Badge
              variant="outline"
              className={`text-xs capitalize h-5 ${statusVariant[acct.status] ?? ""}`}
            >
              {acct.status}
            </Badge>
            {acct.clients?.type && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {acct.clients.type}
              </span>
            )}
          </div>
        </div>

        {/* Client name - large bold like JO sheet */}
        <h1 className="text-3xl font-bold tracking-tight pl-9">
          {acct.clients?.name ?? "Unknown Client"}
        </h1>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* ── Left: Main content with tabs ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setPaymentOpen(true)}
            >
              <DollarSign size={14} />
              Record Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setAttachJoOpen(true)}
            >
              <Plus size={14} />
              Attach Job Order
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setStatementOpen(true)}
            >
              <FileText size={14} />
              Generate Statement
            </Button>
            {(isDev || isAdmin) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleApplyInterest}
                  disabled={applyInterest.isPending}
                >
                  <Percent size={14} />
                  {applyInterest.isPending ? "Applying..." : "Apply Interest"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setEditSheetOpen(true)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
              </>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList>
              <TabsTrigger value="ledger" className="gap-1.5 text-xs">
                <CreditCard size={13} />
                Ledger
              </TabsTrigger>
              <TabsTrigger value="job-orders" className="gap-1.5 text-xs">
                <Receipt size={13} />
                Job Orders
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 text-xs">
                <DollarSign size={13} />
                Payments
              </TabsTrigger>
              <TabsTrigger value="statements" className="gap-1.5 text-xs">
                <FileText size={13} />
                Statements
              </TabsTrigger>
            </TabsList>

            {/* Tab: Ledger */}
            <TabsContent value="ledger" className="mt-3">
              {ledgerLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !ledger || (ledger as LedgerEntry[]).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <CreditCard
                    size={40}
                    strokeWidth={1}
                    className="mb-2 opacity-40"
                  />
                  <p className="text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Description
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Debit
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Credit
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Balance
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Branch
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ledger as LedgerEntry[]).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${ledgerTypeBadge[entry.type] ?? ""}`}
                            >
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {entry.debit > 0 ? amt(entry.debit) : ""}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums text-green-600">
                            {entry.credit > 0 ? amt(entry.credit) : ""}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-medium">
                            {amt(entry.balance)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {entry.branch ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Job Orders */}
            <TabsContent value="job-orders" className="mt-3">
              {lineItemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : joLineItems.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <Receipt
                    size={40}
                    strokeWidth={1}
                    className="mb-2 opacity-40"
                  />
                  <p className="text-sm">No job orders attached yet.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">
                          JO Number
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Branch
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Description
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Paid
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
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
                            <TableCell className="text-sm font-mono">
                              {li.joborders?.order_no ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {li.branches?.name ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm max-w-[250px] truncate">
                              {li.description}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
                              {amt(li.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
                              {amt(paid)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
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
            </TabsContent>

            {/* Tab: Payments */}
            <TabsContent value="payments" className="mt-3">
              {paymentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !payments ||
                (payments as BillingPayment[]).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <DollarSign
                    size={40}
                    strokeWidth={1}
                    className="mb-2 opacity-40"
                  />
                  <p className="text-sm">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Method
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Reference #
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Recorded By
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payments as BillingPayment[]).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(
                              new Date(p.payment_date),
                              "MMM d, yyyy"
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-medium text-green-700">
                            {amt(p.amount)}
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {p.payment_method ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {p.reference_number ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {p.created_by_user?.fullname ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Statements */}
            <TabsContent value="statements" className="mt-3">
              {statementsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !statements ||
                (statements as BillingStatement[]).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <FileText
                    size={40}
                    strokeWidth={1}
                    className="mb-2 opacity-40"
                  />
                  <p className="text-sm">No statements generated yet.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">
                          Statement #
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Period
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Charges
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Payments
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right">
                          Balance
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(statements as BillingStatement[]).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm font-mono">
                            {s.statement_number}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(s.period_start), "MMM d")} -{" "}
                            {format(
                              new Date(s.period_end),
                              "MMM d, yyyy"
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {amt(s.new_charges)}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums text-green-600">
                            {amt(s.payments_received)}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-medium">
                            {amt(s.current_balance)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${statementStatusBadge[s.status] ?? ""}`}
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {s.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() =>
                                    handleFinalizeStatement(s.id)
                                  }
                                  disabled={updateStatement.isPending}
                                >
                                  Finalize
                                </Button>
                              )}
                              {s.status === "finalized" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
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
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right: Summary sidebar ─────────────────────────────────── */}
        <div className="w-[280px] shrink-0 overflow-y-auto hidden lg:block">
          <div className="space-y-4">
            {/* Balance card */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-3">
                Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">Balance</span>
                  {balanceLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <span
                      className={`text-xl font-bold tabular-nums ${balanceColorClass(balance, aging)}`}
                    >
                      {amt(balance)}
                    </span>
                  )}
                </div>

                {creditLimit > 0 && (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500">
                        Credit Limit
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {amt(creditLimit)}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Usage</span>
                        <span>{usagePct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${creditBarColor(usagePct)}`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">Interest Rate</span>
                  <span className="text-sm font-medium">
                    {acct.interest_rate}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">Cutoff Day</span>
                  <span className="text-sm font-medium">
                    Day {acct.billing_cutoff_day}
                  </span>
                </div>
              </div>
            </div>

            {/* Aging card */}
            {agingLoading ? (
              <Skeleton className="h-36 w-full rounded-xl" />
            ) : aging ? (
              <div className="rounded-xl border bg-white p-4">
                <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-3">
                  Aging
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Current", value: aging.current_amount },
                    { label: "1-30 days", value: aging.days_1_30 },
                    { label: "31-60 days", value: aging.days_31_60 },
                    { label: "61-90 days", value: aging.days_61_90 },
                    { label: "90+ days", value: aging.days_90_plus },
                  ].map((bucket) => (
                    <div
                      key={bucket.label}
                      className="flex justify-between items-baseline"
                    >
                      <span className="text-sm text-gray-500">
                        {bucket.label}
                      </span>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          bucket.value > 0 && bucket.label !== "Current"
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {amt(bucket.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Contact info card */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-3">
                Contact
              </h3>
              <div className="space-y-2.5">
                {contactName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700 truncate">
                      {contactName}
                    </span>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700">{contactPhone}</span>
                  </div>
                )}
                {contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700 truncate">
                      {contactEmail}
                    </span>
                  </div>
                )}
                {acct.clients?.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar
                      size={14}
                      className="text-gray-400 shrink-0 mt-0.5"
                    />
                    <span className="text-gray-700">
                      {acct.clients.address}
                    </span>
                  </div>
                )}
                {!contactName &&
                  !contactPhone &&
                  !contactEmail &&
                  !acct.clients?.address && (
                    <p className="text-xs text-gray-400">
                      No contact information
                    </p>
                  )}
              </div>
            </div>

            {/* Notes */}
            {acct.notes && (
              <div className="rounded-xl border bg-white p-4">
                <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {acct.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        accountId={id!}
        clientId={clientId}
      />
      <AttachJobOrderDialog
        open={attachJoOpen}
        onOpenChange={setAttachJoOpen}
        accountId={id!}
        clientId={clientId}
      />
      <GenerateStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        accountId={id!}
        clientId={clientId}
      />

      {/* Edit Account Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">Edit Billing Account</SheetTitle>
            <Separator className="my-2" />
            <BillingAccountFormSheet
              accountId={id}
              onClose={() => setEditSheetOpen(false)}
              onSuccess={() => setEditSheetOpen(false)}
            />
          </SheetHeader>
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>
    </div>
  );
}
