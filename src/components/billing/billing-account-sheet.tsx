import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  ArrowLeft,
  Info,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  MoreHorizontal,
  Ban,
  Trash2,
} from "lucide-react";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import {
  useBillingAccount,
  useBillingAccountBalance,
  useBillingAccountAging,
  useBillingLedger,
  useBillingLineItems,
  useBillingPayments,
  useBillingStatements,
  useApplyAccountInterest,
  useUpdateBillingAccount,
  useUpdateBillingLineItemTransactionDate,
  useUpdateBillingStatement,
  useDeleteBillingStatement,
  useBillingInterestLogs,
  useEmailLogs,
  useTriggerSendBillingReminders,
  useTriggerGenerateStatements,
} from "./useBilling";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import {
  deleteBillingAccountWithStrategy,
  getBillingAccountDeletionImpact,
  deleteReceiptFile,
  getSignedReceiptUrl,
  resolveReceiptStorageContextFromPayment,
  updateBillingStatement,
  updateBillingPaymentReceipt,
  uploadReceiptFile,
} from "../../services/apiBilling";
import { useUser } from "../auth/useUser";
import { isManagerReauthPasswordValid } from "../auth/manager-auth";
import { formatNumberWithCommas } from "../../lib/helpers";
import { getClientDisplayName } from "../../lib/client-hierarchy";
import {
  BillingAccount,
  BillingAccountStatus,
  LedgerEntry,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
  BillingDeletionMode,
  BillingAccountDeletionImpact,
  BillingAging,
  BillingInterestLog,
  EmailLog,
} from "../../lib/billing-types";

import RecordPaymentPanel from "./record-payment-panel";
import AttachJobOrderPanel from "./attach-job-order-panel";
import AttachRentalPanel from "./attach-rental-panel";
import GenerateStatementPanel from "./generate-statement-panel";
import BillingAccountFormSheet from "./billing-account-form";
import type { BillingStatementPDFData } from "./billing-statement-pdf";
import TransactionDateDialog from "./transaction-date-dialog";
import DocumentEmailComposer, {
  EmailComposePayload,
} from "../email/document-email-composer";
import { formatDateLabel, normalizeDateOnly } from "../../lib/transaction-date";
import { getServerNow } from "../../lib/server-time";

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

// ─── Sub-sheet types ────────────────────────────────────────────────────────

type SubSheetType = "payment" | "charges" | "statement" | "edit" | null;

type GenerateStatementsResult = {
  account_id: string;
  status: string;
};

type GenerateStatementsResponse = {
  statements_generated?: number;
  results?: GenerateStatementsResult[];
};

// ─── Component ──────────────────────────────────────────────────────────────

interface BillingAccountSheetContentProps {
  accountId: string;
  onClose: () => void;
}

export default function BillingAccountSheetContent({
  accountId,
  onClose,
}: BillingAccountSheetContentProps) {
  const { isDev, isAdmin, isManager } = useUser();
  const queryClient = useQueryClient();

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
        if (!e.isTrusted) return;
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
  const { data: agingData } =
    useBillingAccountAging(accountId);
  const { data: ledger, isLoading: ledgerLoading } =
    useBillingLedger(accountId);
  const { data: lineItems } = useBillingLineItems(accountId);
  const { data: payments, isLoading: paymentsLoading } =
    useBillingPayments(accountId);
  const { data: statements, isLoading: statementsLoading } =
    useBillingStatements(accountId);

  const { data: interestLogs } = useBillingInterestLogs(accountId);
  const { data: emailLogs } = useEmailLogs(accountId);

  // Mutations
  const applyInterest = useApplyAccountInterest();
  const updateAccount = useUpdateBillingAccount();
  const deleteAccount = useMutation({
    mutationFn: ({
      id,
      mode,
      reason,
    }: {
      id: string;
      mode: BillingDeletionMode;
      reason?: string;
    }) => deleteBillingAccountWithStrategy(id, mode, reason),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.removeQueries({ queryKey: ["billing_account", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_payments"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_statements"] });
      queryClient.invalidateQueries({ queryKey: ["billing_interest_logs"] });
      queryClient.invalidateQueries({ queryKey: ["email_logs"] });
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["archive"] });
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
  });
  const updateStatement = useUpdateBillingStatement();
  const deleteStatement = useDeleteBillingStatement(accountId);
  const [statementToDelete, setStatementToDelete] = useState<BillingStatement | null>(null);
  const updateLineItemTransactionDate = useUpdateBillingLineItemTransactionDate();
  const sendReminders = useTriggerSendBillingReminders();
  const generateStatements = useTriggerGenerateStatements();

  // Collapsible section states
  const [showInterestConfirm, setShowInterestConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BillingAccountStatus | null>(null);
  const [showDeleteImpactDialog, setShowDeleteImpactDialog] = useState(false);
  const [showDeleteAuthDialog, setShowDeleteAuthDialog] = useState(false);
  const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);
  const [selectedDeleteMode, setSelectedDeleteMode] =
    useState<BillingDeletionMode | null>(null);
  const [deleteImpactData, setDeleteImpactData] =
    useState<BillingAccountDeletionImpact | null>(null);
  const [isLoadingDeleteImpact, setIsLoadingDeleteImpact] = useState(false);
  const [deleteAuthPassword, setDeleteAuthPassword] = useState("");
  const [deleteAuthError, setDeleteAuthError] = useState<string | null>(null);
  const [showRemindersConfirm, setShowRemindersConfirm] = useState(false);
  const [showGenerateSOAConfirm, setShowGenerateSOAConfirm] = useState(false);
  const [historyTab, setHistoryTab] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "job_order" | "rental">("all");
  const [sendingStatementId, setSendingStatementId] = useState<string | null>(null);
  const [statementEmailDialogOpen, setStatementEmailDialogOpen] = useState(false);
  const [statementToEmail, setStatementToEmail] = useState<BillingStatement | null>(null);
  const [statementEmailError, setStatementEmailError] = useState<string | null>(
    null
  );
  const [downloadingStatementId, setDownloadingStatementId] = useState<string | null>(null);
  const [replacingReceiptPaymentId, setReplacingReceiptPaymentId] = useState<string | null>(
    null
  );
  const [pendingReceiptPayment, setPendingReceiptPayment] =
    useState<BillingPayment | null>(null);
  const [editingTransactionDateLineItem, setEditingTransactionDateLineItem] =
    useState<BillingLineItem | null>(null);
  const [receiptInputKey, setReceiptInputKey] = useState(0);
  const paymentReceiptInputRef = useRef<HTMLInputElement | null>(null);

  // Derived
  const acct = account as BillingAccount | undefined;
  const allLineItems = (lineItems ?? []) as BillingLineItem[];
  const effectiveLedger = useMemo(() => (ledger ?? []) as LedgerEntry[], [ledger]);

  const balance =
    typeof balanceData === "number"
      ? balanceData
      : (acct?.current_balance ?? 0);

  const aging = (agingData ?? acct?.aging) as BillingAging | undefined;

  const clientId = acct?.client_id ?? 0;
  const creditLimit = acct?.credit_limit ?? 0;
  const usagePct = creditLimitPercent(balance, creditLimit);
  const joLineItems = allLineItems.filter(
    (li) => li.type === "charge" && li.job_order_id != null
  );
  const rentalLineItems = allLineItems.filter(
    (li) => li.type === "charge" && li.rental_id != null
  );

  // Interest breakdown for balance summary
  const totalInterestCharges = allLineItems
    .filter((li) => li.type === "interest")
    .reduce((sum, li) => sum + li.amount, 0);

  // Check if interest already applied this billing cycle
  const currentCycle = getServerNow().toISOString().slice(0, 7); // YYYY-MM
  const typedInterestLogsAll = (interestLogs ?? []) as BillingInterestLog[];
  const interestAlreadyApplied = typedInterestLogsAll.some(
    (log) => log.billing_cycle === currentCycle
  );

  // Determine email recipient
  const recipientEmail = acct?.billing_contact_email || acct?.clients?.email;

  // Latest statement info
  const typedStatements = (statements ?? []) as BillingStatement[];
  const latestStatement = typedStatements.length > 0
    ? [...typedStatements].sort((a, b) =>
        new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
      )[0]
    : null;

  // Action-required counts
  const draftStatements = typedStatements.filter((s) => s.status === "draft");
  const finalizedNotSent = typedStatements.filter((s) => s.status === "finalized");

  const typedEmailLogs = (emailLogs ?? []) as EmailLog[];
  const statementEmailLogs = typedEmailLogs.filter((log) => {
    if (log.entity_type) {
      return log.entity_type === "billing_statement";
    }
    return log.type === "statement";
  });
  const latestStatementEmailLog =
    statementEmailLogs.length > 0
      ? [...statementEmailLogs].sort((a, b) => {
          const left = new Date(a.sent_at || a.created_at).getTime();
          const right = new Date(b.sent_at || b.created_at).getTime();
          return right - left;
        })[0]
      : null;
  const statementSentEntityIds = useMemo(
    () =>
      new Set(
        statementEmailLogs
          .filter((log) => log.status === "sent" && Boolean(log.entity_id))
          .map((log) => String(log.entity_id))
      ),
    [statementEmailLogs]
  );
  const selectedStatementHasSentBefore = statementToEmail
    ? statementSentEntityIds.has(statementToEmail.id)
    : false;

  const effectivePayments = useMemo(
    () => (payments ?? []) as BillingPayment[],
    [payments]
  );
  const paymentsMissingReceiptCount = useMemo(
    () =>
      effectivePayments.filter((payment) => {
        const activeAllocations = (payment.allocations || []).filter(
          (allocation) => allocation.status !== "reversed"
        );
        if (activeAllocations.length > 0) {
          return !payment.receipt_url;
        }
        return payment.amount > 0 && !payment.receipt_url;
      }).length,
    [effectivePayments]
  );
  const lineItemReceiptSummary = useMemo(() => {
    const summary = new Map<
      string,
      { total: number; withReceipt: number; latestReceiptUrl: string | null }
    >();

    effectivePayments.forEach((payment) => {
      const receiptUrl = payment.receipt_url || null;
      (payment.allocations || [])
        .filter((allocation) => allocation.status !== "reversed")
        .forEach((allocation) => {
          const lineItemId = allocation.billing_line_item_id;
          if (!lineItemId) return;

          const current = summary.get(lineItemId) || {
            total: 0,
            withReceipt: 0,
            latestReceiptUrl: null,
          };

          current.total += 1;
          if (receiptUrl) {
            current.withReceipt += 1;
            if (!current.latestReceiptUrl) {
              current.latestReceiptUrl = receiptUrl;
            }
          }

          summary.set(lineItemId, current);
        });
    });

    return summary;
  }, [effectivePayments]);
  const paymentReceiptMap = useMemo(() => {
    const map = new Map<string, string | null>();
    effectivePayments.forEach((payment) => {
      map.set(payment.id, payment.receipt_url || null);
    });
    return map;
  }, [effectivePayments]);

  // Filtered ledger for source filter
  const filteredLedger = useMemo(() => {
    if (effectiveLedger.length === 0 || sourceFilter === "all") return effectiveLedger.length > 0 ? effectiveLedger : undefined;
    return effectiveLedger.filter((entry) => {
      if (entry.source === "payment") return true;
      if (entry.type === "interest" || entry.type === "adjustment" || entry.type === "credit") return true;
      if (sourceFilter === "rental") return entry.description.startsWith("Rental ");
      if (sourceFilter === "job_order") return entry.description.startsWith("JO ");
      return true;
    });
  }, [effectiveLedger, sourceFilter]);

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

  function handleRequestStatusChange() {
    if (!acct) return;

    if (acct.status === "closed") {
      toast.error("Closed accounts cannot be suspended or reactivated.");
      return;
    }

    const nextStatus: BillingAccountStatus =
      acct.status === "active" ? "suspended" : "active";
    setPendingStatus(nextStatus);
    setShowStatusConfirm(true);
  }

  function confirmStatusChange() {
    if (!pendingStatus) return;

    updateAccount.mutate(
      {
        id: accountId,
        updates: { status: pendingStatus },
      },
      {
        onSettled: () => {
          setShowStatusConfirm(false);
          setPendingStatus(null);
        },
      }
    );
  }

  function resetDeleteFlow() {
    setShowDeleteImpactDialog(false);
    setShowDeleteAuthDialog(false);
    setShowDeleteFinalConfirm(false);
    setSelectedDeleteMode(null);
    setDeleteImpactData(null);
    setDeleteAuthPassword("");
    setDeleteAuthError(null);
  }

  async function openDeleteDialog() {
    if (!canManageAccount) {
      toast.error("Only admin/dev/manager accounts can delete billing records.");
      return;
    }

    resetDeleteFlow();
    setIsLoadingDeleteImpact(true);
    try {
      const impact = await getBillingAccountDeletionImpact(accountId);
      setDeleteImpactData(impact);
      setShowDeleteImpactDialog(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load billing deletion impact."
      );
    } finally {
      setIsLoadingDeleteImpact(false);
    }
  }

  function selectDeleteMode(mode: BillingDeletionMode) {
    setSelectedDeleteMode(mode);
    setDeleteAuthPassword("");
    setDeleteAuthError(null);
    setShowDeleteImpactDialog(false);
    setShowDeleteAuthDialog(true);
  }

  function confirmDeleteAuthorization() {
    if (!canManageAccount) {
      setDeleteAuthError(
        "Only admin/dev/manager accounts can authorize this action."
      );
      return;
    }

    if (!isManagerReauthPasswordValid(deleteAuthPassword)) {
      setDeleteAuthError("Incorrect manager password.");
      return;
    }

    setDeleteAuthError(null);
    setShowDeleteAuthDialog(false);
    setShowDeleteFinalConfirm(true);
  }

  async function executeDeleteAccount() {
    if (!selectedDeleteMode) {
      toast.error("Select a deletion mode first.");
      return;
    }

    try {
      const result = await deleteAccount.mutateAsync({
        id: accountId,
        mode: selectedDeleteMode,
        reason: "Deleted via billing account sheet",
      });

      const receiptPaths = Array.from(
        new Set(
          (result.receipt_paths_to_delete || []).filter(
            (path) => typeof path === "string" && path.trim().length > 0
          )
        )
      );

      if (receiptPaths.length > 0) {
        const cleanupResults = await Promise.allSettled(
          receiptPaths.map((path) => deleteReceiptFile(path))
        );
        const failedCleanup = cleanupResults.filter(
          (entry) => entry.status === "rejected"
        ).length;

        if (failedCleanup > 0) {
          toast.error(
            `Billing deleted, but ${failedCleanup} receipt file(s) could not be removed from storage.`
          );
        }
      }

      toast.success(
        "Billing deleted successfully. Linked records and financial state were updated."
      );
      resetDeleteFlow();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete billing record."
      );
    }
  }

  async function handleDownloadStatementPDF(statement: BillingStatement) {
    if (!acct || downloadingStatementId) return;
    setDownloadingStatementId(statement.id);

    const pdfData: BillingStatementPDFData = {
      statement,
      accountNumber: acct.account_number,
      clientName: getClientDisplayName(acct.clients, "") || "Unknown Client",
      clientContact: acct.billing_contact_phone || acct.clients?.contact_number || null,
      clientEmail: acct.billing_contact_email || acct.clients?.email || null,
      interestRate: acct.interest_rate,
      lineItems: allLineItems,
      payments: effectivePayments ?? [],
    };

    try {
      const [{ pdf }, { default: BillingStatementPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./billing-statement-pdf"),
      ]);
      const blob = await pdf(<BillingStatementPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${statement.statement_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error("Failed to generate PDF");
      console.error(err);
    } finally {
      setDownloadingStatementId(null);
    }
  }

  function handleFinalizeStatement(statementId: string) {
    updateStatement.mutate({
      id: statementId,
      updates: { status: "finalized" },
    }, {
    });
  }

  // New statement → mark ready → straight into the email composer.
  function handleStatementCreated(statementId: string) {
    updateBillingStatement(statementId, { status: "finalized" }).then(
      (statement) => {
        queryClient.invalidateQueries({ queryKey: ["billing_statements", accountId] });
        setHistoryTab("statements");
        const email = acct?.billing_contact_email || acct?.clients?.email;
        if (canManageAccount && email) {
          openStatementSendDialog(statement);
        } else {
          toast.success("Statement ready. Download it from the Statements tab.");
        }
      },
      (error: Error) => toast.error(error.message)
    );
  }

  function buildStatementEmailDraft(statement: BillingStatement) {
    const periodStr = `${format(new Date(statement.period_start), "MMM d, yyyy")} - ${format(new Date(statement.period_end), "MMM d, yyyy")}`;
    const clientName =
      acct?.billing_contact_name ||
      getClientDisplayName(acct?.clients, "") ||
      "Valued Client";
    const dueDateLabel = statement.due_date
      ? format(new Date(statement.due_date), "MMM d, yyyy")
      : "N/A";
    const accountNumber = acct?.account_number || "N/A";
    const subject = `Statement of Account - ${accountNumber} - ${periodStr}`;
    const message = [
      `Hello ${clientName},`,
      "",
      "Please find your statement of account below:",
      "",
      "Statement Details:",
      `Reference: ${statement.statement_number}`,
      `Period: ${periodStr}`,
      `Due Date: ${dueDateLabel}`,
      `Total Due: ${amt(statement.current_balance)}`,
      "",
      "Attached is your full statement document.",
      "",
      "Thank you,",
      "RMS Avisha",
    ].join("\n");

    return {
      clientName,
      periodStr,
      dueDateLabel,
      subject,
      message,
    };
  }

  function openStatementSendDialog(statement: BillingStatement) {
    const email = acct?.billing_contact_email || acct?.clients?.email;

    if (!canManageAccount) {
      toast.error("Only admin/dev/manager accounts can send billing statements.");
      return;
    }

    if (!email) {
      toast.error("No email address configured for this account or client");
      return;
    }

    setStatementToEmail(statement);
    setStatementEmailError(null);
    setStatementEmailDialogOpen(true);
  }

  async function handleSendStatement(payload: EmailComposePayload) {
    if (sendingStatementId || !acct || !statementToEmail) return;

    const statement = statementToEmail;
    const hasSentBefore = statementSentEntityIds.has(statement.id);
    const shouldForceSend =
      hasSentBefore &&
      window.confirm("This statement has already been emailed.\n\nSend again?");

    if (hasSentBefore && !shouldForceSend) {
      return;
    }

    const emailDraft = buildStatementEmailDraft(statement);
    setSendingStatementId(statement.id);
    setStatementEmailError(null);

    const primaryRecipient = payload.to[0] || "";

    try {
      // Generate PDF on the client side and convert to base64
      const pdfData: BillingStatementPDFData = {
        statement,
        accountNumber: acct.account_number,
        clientName: getClientDisplayName(acct.clients, "") || "Unknown Client",
        clientContact: acct.billing_contact_phone || acct.clients?.contact_number || null,
        clientEmail: acct.billing_contact_email || acct.clients?.email || null,
        interestRate: acct.interest_rate,
        lineItems: allLineItems,
        payments: effectivePayments ?? [],
      };

      const [{ pdf }, { default: BillingStatementPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./billing-statement-pdf"),
      ]);
      const blob = await pdf(<BillingStatementPDF data={pdfData} />).toBlob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("send-billing-statement", {
        body: {
          statement_id: statement.id,
          billing_account_id: acct.id,
          to: payload.to,
          cc: payload.cc,
          bcc: payload.bcc,
          to_email: primaryRecipient,
          subject: payload.subject,
          message: payload.message,
          force_send: shouldForceSend,
          client_name: emailDraft.clientName,
          account_number: acct.account_number,
          statement_number: statement.statement_number,
          period: emailDraft.periodStr,
          previous_balance: statement.previous_balance,
          new_charges: statement.new_charges,
          interest_applied: statement.interest_applied,
          payments_received: statement.payments_received,
          balance_due: statement.current_balance,
          due_date: emailDraft.dueDateLabel,
          pdf_base64: base64,
          pdf_filename: `Billing-${statement.statement_number}.pdf`,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["email_logs", accountId] });

      if (error) {
        const failureMessage = "Failed to send statement: " + error.message;
        setStatementEmailError(failureMessage);
        toast.error(failureMessage);
      } else if (data && typeof data === "object" && "success" in data && !(data as { success: boolean }).success) {
        const errorMessage =
          (data as { error?: string }).error ||
          "Email send failed. Check email logs for details.";
        setStatementEmailError(errorMessage);
        toast.error(errorMessage);
      } else {
        const successMessage =
          (data as { message?: string })?.message ||
          `Statement sent to ${primaryRecipient}`;
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: ["billing_statements", accountId] });
        setStatementEmailDialogOpen(false);
        setStatementToEmail(null);
        setStatementEmailError(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate PDF for email";
      setStatementEmailError(errorMessage);
      toast.error("Failed to generate PDF for email");
      console.error(err);
    } finally {
      setSendingStatementId(null);
    }
  }

  async function handleOpenReceiptPath(receiptUrl: string) {
    try {
      const signedUrl = await getSignedReceiptUrl(receiptUrl);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open receipt attachment."
      );
    }
  }

  async function handleViewReceipt(payment: BillingPayment) {
    if (!payment.receipt_url) {
      toast.error("No receipt attached for this payment.");
      return;
    }

    await handleOpenReceiptPath(payment.receipt_url);
  }

  function handleStartReplaceReceipt(payment: BillingPayment) {
    setPendingReceiptPayment(payment);
    paymentReceiptInputRef.current?.click();
  }

  function getLineItemSourceDate(lineItem: BillingLineItem | null): string | null {
    if (!lineItem) return null;

    if (lineItem.source_type === "rental") {
      return normalizeDateOnly(lineItem.rentals?.created_at) || null;
    }

    if (lineItem.source_type === "job_order") {
      return normalizeDateOnly(lineItem.joborders?.created_at) || null;
    }

    if (lineItem.rental_id != null) {
      return normalizeDateOnly(lineItem.rentals?.created_at) || null;
    }

    if (lineItem.job_order_id != null) {
      return normalizeDateOnly(lineItem.joborders?.created_at) || null;
    }

    return null;
  }

  async function handleUpdateTransactionDate(selection: {
    mode: "current" | "source" | "custom";
    transactionDate: string;
  }) {
    if (!editingTransactionDateLineItem) return;

    const sourceDate = getLineItemSourceDate(editingTransactionDateLineItem);
    const transactionDate =
      selection.mode === "source" ? sourceDate : selection.transactionDate;

    if (!transactionDate) {
      throw new Error("Source date is unavailable for this billing entry.");
    }

    await updateLineItemTransactionDate.mutateAsync({
      lineItemId: editingTransactionDateLineItem.id,
      transactionDate,
    });
    setEditingTransactionDateLineItem(null);
  }

  async function handleReplaceReceiptSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    const payment = pendingReceiptPayment;
    event.target.value = "";
    setReceiptInputKey((previous) => previous + 1);

    if (!file || !payment) {
      return;
    }

    const context = resolveReceiptStorageContextFromPayment(payment, accountId);
    let uploadedPath: string | null = null;
    setReplacingReceiptPaymentId(payment.id);

    try {
      uploadedPath = await uploadReceiptFile({
        sourceType: context.sourceType,
        sourceId: context.sourceId,
        file,
      });

      await updateBillingPaymentReceipt(payment.id, uploadedPath);

      if (payment.receipt_url && payment.receipt_url !== uploadedPath) {
        try {
          await deleteReceiptFile(payment.receipt_url);
        } catch (cleanupError) {
          console.error("Failed to clean up previous receipt file", cleanupError);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["billing_payments", accountId] });
      toast.success("Payment receipt updated.");
    } catch (error) {
      if (uploadedPath) {
        try {
          await deleteReceiptFile(uploadedPath);
        } catch (cleanupError) {
          console.error("Failed to rollback uploaded receipt file", cleanupError);
        }
      }
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update payment receipt."
      );
    } finally {
      setReplacingReceiptPaymentId(null);
      setPendingReceiptPayment(null);
    }
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
  const canManageAccount = isDev || isAdmin || isManager;
  const selectedStatementEmailDraft = statementToEmail
    ? buildStatementEmailDraft(statementToEmail)
    : null;
  const editingTransactionDateSourceDate = getLineItemSourceDate(
    editingTransactionDateLineItem
  );
  const editingTransactionDateSourceLabel: "Job Order" | "Rental" =
    editingTransactionDateLineItem?.source_type === "rental" ||
    editingTransactionDateLineItem?.rental_id != null
      ? "Rental"
      : "Job Order";
  const editingTransactionDateInitialDate =
    normalizeDateOnly(editingTransactionDateLineItem?.transaction_date) ||
    normalizeDateOnly(editingTransactionDateLineItem?.created_at) ||
    editingTransactionDateSourceDate;
  const statusActionLabel = acct.status === "active" ? "Suspend" : "Activate";
  const statusActionTargetLabel =
    pendingStatus === "suspended" ? "Suspend" : "Activate";

  const isCompressed = activeSubSheet !== null;
  const totalOverdue = aging
    ? aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus
    : 0;
  const shouldStack = isNarrow && isCompressed;

  // ─── Header (always visible) ──────────────────────────────────────────────

  const headerSection = (
    <div className="space-y-3">
      {/* Account number + tour row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">
          {acct.account_number}
        </span>
      </div>

      {/* Account details + status/actions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">
            {getClientDisplayName(acct.clients)}
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
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-xs capitalize ${statusVariant[acct.status] ?? ""}`}
          >
            {acct.status}
          </Badge>
          {canManageAccount && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 p-0"
                aria-label="More account actions"
               
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[190px]">
              {(isDev || isAdmin) && (
                <>
                  <DropdownMenuItem onClick={() => openSubSheet("edit")} className="gap-2">
                    <Pencil size={14} />
                    Edit account settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleApplyInterest}
                    disabled={applyInterest.isPending}
                    className="gap-2"
                  >
                    <Percent size={14} />
                    Apply interest
                    {!interestAlreadyApplied && totalOverdue > 0 && (
                      <span className="ml-auto text-[10px] text-amber-600">due</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowRemindersConfirm(true)}
                    disabled={sendReminders.isPending}
                    className="gap-2"
                  >
                    <Mail size={14} />
                    Send payment reminders
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowGenerateSOAConfirm(true)}
                    disabled={generateStatements.isPending}
                    className="gap-2"
                  >
                    <FileText size={14} />
                    Auto-generate statements
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleRequestStatusChange}
                disabled={updateAccount.isPending || acct.status === "closed"}
                className="gap-2"
               
              >
                <Ban size={14} />
                {updateAccount.isPending
                  ? "Saving..."
                  : `${statusActionLabel} Account`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openDeleteDialog}
                disabled={deleteAccount.isPending || isLoadingDeleteImpact}
                className="gap-2 text-red-600 focus:text-red-600"
               
              >
                <Trash2 size={14} />
                {isLoadingDeleteImpact
                  ? "Analyzing Impact..."
                  : deleteAccount.isPending
                    ? "Deleting..."
                    : "Delete Account"}
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Balance summary (always visible) ─────────────────────────────────────

  const balanceSummary = (
    <div>
      <span className="text-xs text-gray-500">Owes</span>
      {balanceLoading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <span
          className={`text-3xl font-bold tabular-nums block ${balanceColorClass(balance, aging)}`}
        >
          {amt(balance)}
        </span>
      )}
      {totalOverdue > 0 ? (
        <p className="text-sm text-red-600 font-medium">
          {amt(totalOverdue)} overdue
          {totalInterestCharges > 0 && (
            <span className="text-amber-600 font-normal">
              {" "}· includes {amt(totalInterestCharges)} interest
            </span>
          )}
        </p>
      ) : (
        balance > 0 && <p className="text-sm text-gray-500">Nothing overdue</p>
      )}
      {creditLimit > 0 && usagePct >= 80 && (
        <p className="text-xs text-red-600 mt-1">
          {usagePct}% of {amt(creditLimit)} credit limit used
        </p>
      )}
    </div>
  );

  // ─── Action buttons ───────────────────────────────────────────────────────

  const toggleSubSheet = (type: Exclude<SubSheetType, null>) =>
    activeSubSheet === type ? closeSubSheet() : openSubSheet(type);

  const actionButtons = (
    <div className={`grid gap-2 ${isCompressed ? "grid-cols-1" : "grid-cols-3"}`}>
      <Button
        variant={activeSubSheet === "charges" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => toggleSubSheet("charges")}
      >
        <Plus size={14} />
        Add charges
      </Button>
      <Button
        variant={activeSubSheet === "payment" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => toggleSubSheet("payment")}
      >
        <DollarSign size={14} />
        Record payment
      </Button>
      <Button
        variant={activeSubSheet === "statement" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => toggleSubSheet("statement")}
      >
        <Send size={14} />
        Send statement
      </Button>
    </div>
  );

  // ─── Ledger table ─────────────────────────────────────────────────────────

  const ledgerSection = (
    <div>
      <div className="flex justify-end my-2">
        <div className="flex gap-1">
          {(["all", "job_order", "rental"] as const).map((f) => (
            <Button
              key={f}
              variant={sourceFilter === f ? "default" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSourceFilter(f)}
            >
              {f === "all" ? "All" : f === "job_order" ? "Job Orders" : "Rentals"}
            </Button>
          ))}
        </div>
      </div>
      {ledgerLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !filteredLedger || filteredLedger.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400">
          <CreditCard size={32} strokeWidth={1} className="mb-2 opacity-40" />
          <p className="text-xs">{sourceFilter !== "all" ? "No matching transactions." : "No transactions yet."}</p>
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
                <TableHead className="text-[11px] font-semibold">
                  Proof
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedger.map((entry) => {
                const paymentReceiptUrl =
                  entry.type === "payment"
                    ? paymentReceiptMap.get(entry.id) || null
                    : null;
                const isMissingPaymentProof =
                  entry.type === "payment" && !paymentReceiptUrl;

                return (
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
                          {entry.type === "charge" && "Charge from a job order or rental"}
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
                    <TableCell className="py-1.5">
                      {entry.type !== "payment" ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {paymentReceiptUrl ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200"
                            >
                              Attached
                            </Badge>
                          ) : isMissingPaymentProof ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200"
                            >
                              Missing
                            </Badge>
                          ) : null}
                          {paymentReceiptUrl && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => void handleOpenReceiptPath(paymentReceiptUrl)}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  // ─── Collapsible sections ─────────────────────────────────────────────────

  const jobOrdersSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Receipt size={13} />
          Attached Job Orders ({joLineItems.length})
        </span>
      </div>
      <>
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
                  <TableHead className="text-[11px] font-semibold">
                    Date
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
                  <TableHead className="text-[11px] font-semibold">
                    Proof
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {joLineItems.map((li) => {
                  const paid = li.paid_amount ?? 0;
                  const fullyPaid = paid >= li.amount;
                  const proofSummary = lineItemReceiptSummary.get(li.id);
                  const proofTotal = proofSummary?.total ?? 0;
                  const proofWithReceipt = proofSummary?.withReceipt ?? 0;
                  const sourceReceiptUrl = li.receipt_url || null;
                  const proofReceiptUrl =
                    proofSummary?.latestReceiptUrl ?? sourceReceiptUrl;
                  const isProofMissing = paid > 0 && !proofReceiptUrl;
                  const isProofPartial =
                    paid > 0 &&
                    !sourceReceiptUrl &&
                    proofTotal > 0 &&
                    proofWithReceipt > 0 &&
                    proofWithReceipt < proofTotal;
                  const isProofAttached =
                    paid > 0 && Boolean(proofReceiptUrl) && !isProofPartial;
                  return (
                    <TableRow key={li.id}>
                      <TableCell className="text-xs font-mono py-1.5">
                        {li.joborders?.order_no ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-1.5">
                        {li.branches?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {formatDateLabel(li.transaction_date || li.created_at)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => setEditingTransactionDateLineItem(li)}
                            disabled={updateLineItemTransactionDate.isPending}
                          >
                            <Pencil size={10} />
                          </Button>
                        </div>
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
                      <TableCell className="py-1.5">
                        {paid <= 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isProofAttached && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200"
                              >
                                Attached
                              </Badge>
                            )}
                            {isProofPartial && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200"
                              >
                                Partial
                              </Badge>
                            )}
                            {isProofMissing && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200"
                              >
                                Missing
                              </Badge>
                            )}
                            {proofReceiptUrl && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => void handleOpenReceiptPath(proofReceiptUrl)}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  const rentalsSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Receipt size={13} />
          Attached Rentals ({rentalLineItems.length})
        </span>
      </div>
      <>
        {rentalLineItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No rentals attached.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">
                    Rental #
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Branch
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Date
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
                  <TableHead className="text-[11px] font-semibold">
                    Proof
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentalLineItems.map((li) => {
                  const paid = li.paid_amount ?? 0;
                  const fullyPaid = paid >= li.amount;
                  const proofSummary = lineItemReceiptSummary.get(li.id);
                  const proofTotal = proofSummary?.total ?? 0;
                  const proofWithReceipt = proofSummary?.withReceipt ?? 0;
                  const sourceReceiptUrl = li.receipt_url || null;
                  const proofReceiptUrl =
                    proofSummary?.latestReceiptUrl ?? sourceReceiptUrl;
                  const isProofMissing = paid > 0 && !proofReceiptUrl;
                  const isProofPartial =
                    paid > 0 &&
                    !sourceReceiptUrl &&
                    proofTotal > 0 &&
                    proofWithReceipt > 0 &&
                    proofWithReceipt < proofTotal;
                  const isProofAttached =
                    paid > 0 && Boolean(proofReceiptUrl) && !isProofPartial;
                  return (
                    <TableRow key={li.id}>
                      <TableCell className="text-xs font-mono py-1.5">
                        {li.rentals?.rental_no ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-1.5">
                        {li.branches?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {formatDateLabel(li.transaction_date || li.created_at)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => setEditingTransactionDateLineItem(li)}
                            disabled={updateLineItemTransactionDate.isPending}
                          >
                            <Pencil size={10} />
                          </Button>
                        </div>
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
                      <TableCell className="py-1.5">
                        {paid <= 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isProofAttached && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200"
                              >
                                Attached
                              </Badge>
                            )}
                            {isProofPartial && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200"
                              >
                                Partial
                              </Badge>
                            )}
                            {isProofMissing && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200"
                              >
                                Missing
                              </Badge>
                            )}
                            {proofReceiptUrl && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => void handleOpenReceiptPath(proofReceiptUrl)}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  const recentPaymentsSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <DollarSign size={13} />
          Payments (
          {effectivePayments.length})
        </span>
      </div>
      <>
        {paymentsMissingReceiptCount > 0 && (
          <Alert className="mb-2 border-amber-200 bg-amber-50 text-amber-900 p-2.5">
            <AlertTitle className="text-xs font-semibold">Missing Receipt</AlertTitle>
            <AlertDescription className="text-xs text-amber-900">
              {paymentsMissingReceiptCount}{" "}
              {paymentsMissingReceiptCount === 1 ? "payment is" : "payments are"} missing
              proof of payment.
            </AlertDescription>
          </Alert>
        )}
        {paymentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : effectivePayments.length === 0 ? (
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
                  <TableHead className="text-[11px] font-semibold">
                    Receipt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {effectivePayments.map((p) => {
                  const hasReceipt = Boolean(p.receipt_url);
                  const isReplacing = replacingReceiptPaymentId === p.id;

                  return (
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
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          {hasReceipt ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200"
                            >
                              Attached
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200"
                            >
                              Missing
                            </Badge>
                          )}
                          {hasReceipt && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => handleViewReceipt(p)}
                            >
                              View
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => handleStartReplaceReceipt(p)}
                            disabled={isReplacing}
                          >
                            {isReplacing ? "Uploading..." : hasReceipt ? "Replace" : "Attach"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  const recentStatementsSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <FileText size={13} />
          Statements (
          {typedStatements.length})
          {draftStatements.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-[9px] px-1.5 py-0 rounded-full font-semibold normal-case">
              {draftStatements.length} draft
            </span>
          )}
          {finalizedNotSent.length > 0 && (
            <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[9px] px-1.5 py-0 rounded-full font-semibold normal-case">
              {finalizedNotSent.length} ready to send
            </span>
          )}
        </span>
      </div>
      <>
        {latestStatementEmailLog && (
          <div className="mb-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              Last Sent:{" "}
              <span className="font-medium text-foreground">
                {format(
                  new Date(
                    latestStatementEmailLog.sent_at ||
                      latestStatementEmailLog.created_at
                  ),
                  "MMM d, yyyy"
                )}
              </span>
            </span>
            <span>
              Status:{" "}
              <span className="font-medium text-foreground capitalize">
                {latestStatementEmailLog.status}
              </span>
            </span>
          </div>
        )}
        {statementsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : typedStatements.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No statements yet. Use "Send statement" above.
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
                    Interest
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
                {typedStatements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-mono py-1.5">
                      {s.statement_number}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(s.period_start), "MMM d")} -{" "}
                      {format(new Date(s.period_end), "MMM d")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums py-1.5 text-amber-600">
                      {s.interest_applied > 0 ? amt(s.interest_applied) : "—"}
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
                            {s.status === "finalized" ? "ready" : s.status}
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
                      <div className="flex gap-1 items-center">
                        {s.status === "draft" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 `}
                                onClick={() => handleFinalizeStatement(s.id)}
                                disabled={updateStatement.isPending}
                              >
                                {updateStatement.isPending ? "..." : "Finalize"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Lock this statement so it can be sent to the client
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {canManageAccount && s.status === "finalized" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-green-600 hover:text-green-700 `}
                                onClick={() => openStatementSendDialog(s)}
                                disabled={sendingStatementId === s.id}
                              >
                                {sendingStatementId === s.id ? "Sending..." : "Send"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Email this statement to {recipientEmail || "client"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {canManageAccount && s.status === "sent" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-muted-foreground `}
                                onClick={() => openStatementSendDialog(s)}
                                disabled={sendingStatementId === s.id}
                              >
                                {sendingStatementId === s.id ? "..." : "Resend"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Resend to {recipientEmail || "client"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {(s.status === "finalized" || s.status === "sent") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-muted-foreground"
                                onClick={() => handleDownloadStatementPDF(s)}
                                disabled={downloadingStatementId === s.id}
                              >
                                {downloadingStatementId === s.id
                                  ? <Clock size={11} className="animate-spin" />
                                  : <Download size={11} />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Download PDF
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {(isDev || isAdmin) &&
                          s.status !== "sent" &&
                          !statementSentEntityIds.has(s.id) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => setStatementToDelete(s)}
                                  aria-label="Delete statement"
                                >
                                  <Trash2 size={11} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Delete (not sent yet)
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  // ─── Interest Logs section ───────────────────────────────────────────────

  const typedInterestLogs = typedInterestLogsAll;

  const interestLogsSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Percent size={13} />
          Interest History ({typedInterestLogs.length})
        </span>
      </div>
      <>
        {typedInterestLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No interest has been applied yet.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">Cycle</TableHead>
                  <TableHead className="text-[11px] font-semibold">Date</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Overdue Bal.</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Rate</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedInterestLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono py-1.5">
                      {log.billing_cycle}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(log.applied_at), "MMM d, yy")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums py-1.5">
                      {amt(log.overdue_balance)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5">
                      {log.rate}%
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium text-amber-600 py-1.5">
                      {amt(log.interest_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  // ─── Email Logs section ────────────────────────────────────────────────

  const emailStatusIcon: Record<string, JSX.Element> = {
    sent: <CheckCircle2 size={12} className="text-green-600" />,
    failed: <XCircle size={12} className="text-red-500" />,
    pending: <Clock size={12} className="text-yellow-500" />,
  };

  const emailLogsSection = (
    <div>
      <div className="flex items-center justify-between w-full py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Mail size={13} />
          Email History ({typedEmailLogs.length})
        </span>
      </div>
      <>
        {typedEmailLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No emails sent for this account.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">Date</TableHead>
                  <TableHead className="text-[11px] font-semibold">Type</TableHead>
                  <TableHead className="text-[11px] font-semibold">Recipient</TableHead>
                  <TableHead className="text-[11px] font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedEmailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(log.created_at), "MMM d, yy")}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize px-1.5 py-0"
                      >
                        {log.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px] py-1.5">
                      {log.recipient}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 text-xs capitalize cursor-default">
                            {emailStatusIcon[log.status] ?? null}
                            {log.status}
                          </span>
                        </TooltipTrigger>
                        {log.error_message && (
                          <TooltipContent side="top" className="text-xs max-w-[250px]">
                            {log.error_message}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    </div>
  );

  // ─── Sub-sheet content ────────────────────────────────────────────────────

  const subSheetTitle: Record<string, string> = {
    payment: "Record Payment",
    charges: "Add Charges",
    statement: "Send Statement",
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
          <div>
            <RecordPaymentPanel
              accountId={accountId}
              onClose={closeSubSheet}
            />
          </div>
        )}
        {activeSubSheet === "charges" && (
          <Tabs defaultValue="jo">
            <TabsList className="mb-3">
              <TabsTrigger value="jo">Job Orders</TabsTrigger>
              <TabsTrigger value="rental">Rentals</TabsTrigger>
            </TabsList>
            <TabsContent value="jo">
              <AttachJobOrderPanel
                accountId={accountId}
                clientId={clientId}
                onClose={closeSubSheet}
              />
            </TabsContent>
            <TabsContent value="rental">
              <AttachRentalPanel
                accountId={accountId}
                clientId={clientId}
                onClose={closeSubSheet}
              />
            </TabsContent>
          </Tabs>
        )}
        {activeSubSheet === "statement" && (
          <div>
            <GenerateStatementPanel
              accountId={accountId}
              onClose={closeSubSheet}
              onGenerated={handleStatementCreated}
            />
          </div>
        )}
        {activeSubSheet === "edit" && (
          <div>
            <BillingAccountFormSheet
              accountId={accountId}
              onClose={closeSubSheet}
              onSuccess={() => closeSubSheet()}
            />
          </div>
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
            <Tabs value={historyTab} onValueChange={setHistoryTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">History</TabsTrigger>
                <TabsTrigger value="charges">Charges</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="statements">
                  Statements
                  {finalizedNotSent.length + draftStatements.length > 0 && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>
              <TabsContent value="all">{ledgerSection}</TabsContent>
              <TabsContent value="charges">
                {jobOrdersSection}
                {rentalsSection}
              </TabsContent>
              <TabsContent value="payments">{recentPaymentsSection}</TabsContent>
              <TabsContent value="statements">{recentStatementsSection}</TabsContent>
              <TabsContent value="more">
                {interestLogsSection}
                {(isDev || isAdmin) && emailLogsSection}
              </TabsContent>
            </Tabs>

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
      <input
        key={receiptInputKey}
        ref={paymentReceiptInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,application/pdf"
        className="hidden"
        onChange={handleReplaceReceiptSelection}
      />

      {/* Suspend/Activate Confirmation Dialog */}
      <AlertDialog
        open={showStatusConfirm}
        onOpenChange={(open) => {
          if (!open && updateAccount.isPending) return;
          setShowStatusConfirm(open);
          if (!open) {
            setPendingStatus(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusActionTargetLabel} Billing Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {pendingStatus === "suspended"
                    ? "This account will no longer be eligible for reminder emails and automated statement generation while suspended."
                    : "This account will be marked as active and included again in automated billing runs."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Account: <span className="font-medium text-foreground">{acct.account_number}</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusConfirm(false);
                setPendingStatus(null);
              }}
              disabled={updateAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={updateAccount.isPending || !pendingStatus}
            >
              {updateAccount.isPending
                ? "Saving..."
                : `${statusActionTargetLabel} Account`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Deletion - Impact Analysis */}
      <AlertDialog
        open={showDeleteImpactDialog}
        onOpenChange={(open) => {
          if (!open && deleteAccount.isPending) return;
          setShowDeleteImpactDialog(open);
          if (!open) {
            resetDeleteFlow();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Billing Deletion Impact</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This billing record is linked to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>
                    {deleteImpactData?.linked_job_orders.length || 0} Job Order(s)
                    {deleteImpactData?.linked_job_orders?.length
                      ? ` (${deleteImpactData.linked_job_orders
                          .map((row) => row.order_no || `JO-${row.id}`)
                          .slice(0, 3)
                          .join(", ")}${deleteImpactData.linked_job_orders.length > 3 ? ", ..." : ""})`
                      : ""}
                  </li>
                  <li>
                    {deleteImpactData?.linked_rentals.length || 0} Rental(s)
                    {deleteImpactData?.linked_rentals?.length
                      ? ` (${deleteImpactData.linked_rentals
                          .map((row) => row.rental_no || `R-${row.id}`)
                          .slice(0, 3)
                          .join(", ")}${deleteImpactData.linked_rentals.length > 3 ? ", ..." : ""})`
                      : ""}
                  </li>
                  <li>
                    {deleteImpactData?.payment_count || 0} Payment(s)
                    {` (₱${formatNumberWithCommas(
                      Number(deleteImpactData?.payment_total || 0)
                    )} total)`}
                  </li>
                  <li>{deleteImpactData?.email_count || 0} Email Log(s)</li>
                  <li>{deleteImpactData?.receipt_attachment_count || 0} Receipt Attachment(s)</li>
                </ul>
                <p className="text-sm">
                  Choose how to proceed:
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => resetDeleteFlow()}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectDeleteMode("billing_only")}
              disabled={deleteAccount.isPending}
            >
              Delete Billing Only
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectDeleteMode("billing_with_linked")}
              disabled={deleteAccount.isPending}
            >
              Delete Billing + Linked Records
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Deletion - Manager Authorization */}
      <AlertDialog
        open={showDeleteAuthDialog}
        onOpenChange={(open) => {
          if (!open && deleteAccount.isPending) return;
          setShowDeleteAuthDialog(open);
          if (!open) {
            setDeleteAuthPassword("");
            setDeleteAuthError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manager Authorization Required</AlertDialogTitle>
            <AlertDialogDescription>
              Enter manager/admin credentials to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="billing-delete-auth-password">
              Manager Password
            </Label>
            <Input
              id="billing-delete-auth-password"
              type="password"
              value={deleteAuthPassword}
              onChange={(event) => {
                setDeleteAuthPassword(event.target.value);
                if (deleteAuthError) {
                  setDeleteAuthError(null);
                }
              }}
              placeholder="Enter manager password"
              disabled={deleteAccount.isPending}
            />
            {deleteAuthError && (
              <p className="text-xs text-red-600">{deleteAuthError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAuthDialog(false);
                setDeleteAuthPassword("");
                setDeleteAuthError(null);
              }}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteAuthorization}
              disabled={deleteAccount.isPending}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Deletion - Final Confirmation */}
      <AlertDialog
        open={showDeleteFinalConfirm}
        onOpenChange={(open) => {
          if (!open && deleteAccount.isPending) return;
          setShowDeleteFinalConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to delete a billing statement.</p>
                <p>
                  Selected action:{" "}
                  <span className="font-medium text-foreground">
                    {selectedDeleteMode === "billing_with_linked"
                      ? "Billing + Linked Records"
                      : "Billing Only"}
                  </span>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Affect financial records</li>
                  <li>Modify or remove linked data</li>
                  <li>Cannot be undone</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Account:{" "}
                  <span className="font-medium text-foreground">
                    {acct.account_number}
                  </span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteFinalConfirm(false)}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDeleteAccount}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Billing Record"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Interest Confirmation Dialog */}
      <AlertDialog
        open={showInterestConfirm}
        onOpenChange={(open) => {
          if (!open && applyInterest.isPending) return;
          setShowInterestConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Monthly Interest</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50 text-blue-700">
                  <Info size={16} className="text-blue-700" />
                  <AlertTitle>Automated by default</AlertTitle>
                  <AlertDescription className="text-xs text-blue-700">
                    Interest application is already automated in billing operations. This manual action is a fallback for urgent retries or when a client reports missing charges.
                  </AlertDescription>
                </Alert>
                {interestAlreadyApplied && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                    <CheckCircle2 size={16} className="text-amber-700" />
                    <AlertTitle>Interest already applied for {currentCycle}</AlertTitle>
                    <AlertDescription className="text-xs text-amber-700">
                      The system has already applied interest for this billing cycle. Running again will have no effect (idempotent).
                    </AlertDescription>
                  </Alert>
                )}

                <p>
                  This will apply a <span className="font-semibold text-foreground">{acct.interest_rate}%</span> monthly
                  interest charge on all overdue balances for this account.
                </p>

                {totalOverdue > 0 ? (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overdue balance</span>
                      <span className="font-semibold text-red-600">{amt(totalOverdue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest rate</span>
                      <span className="font-medium text-foreground">{acct.interest_rate}% / month</span>
                    </div>
                    <div className="border-t pt-1.5 flex justify-between">
                      <span className="text-muted-foreground">Estimated charge</span>
                      <span className="font-semibold text-foreground">
                        ~{amt(Math.round(totalOverdue * (acct.interest_rate / 100) * 100) / 100)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                    There are currently no overdue balances on this account. No interest will be charged.
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Manual run is optional fallback only. A new interest line item will be added to the ledger and cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyInterest.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmApplyInterest();
              }}
              disabled={applyInterest.isPending || interestAlreadyApplied}
            >
              {applyInterest.isPending ? "Applying..." : interestAlreadyApplied ? "Already Applied" : "Apply Interest"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={statementEmailDialogOpen}
        onOpenChange={(open) => {
          if (!open && Boolean(sendingStatementId)) return;
          setStatementEmailDialogOpen(open);
          if (!open) {
            setStatementToEmail(null);
            setStatementEmailError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none">
          <AlertDialogTitle className="sr-only">Send Statement</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Email the statement with the PDF attached.
          </AlertDialogDescription>
          <DocumentEmailComposer
            open={statementEmailDialogOpen}
            initialValues={{
              to: recipientEmail || "",
              subject:
                selectedStatementEmailDraft?.subject ||
                "Statement of Account",
              message:
                selectedStatementEmailDraft?.message ||
                "Please find attached your statement.",
            }}
            isSending={Boolean(sendingStatementId)}
            error={statementEmailError}
            hasSentBefore={selectedStatementHasSentBefore}
            attachmentName={
              statementToEmail
                ? `Billing-${statementToEmail.statement_number}.pdf`
                : undefined
            }
            onCancel={() => {
              if (sendingStatementId) return;
              setStatementEmailDialogOpen(false);
              setStatementToEmail(null);
              setStatementEmailError(null);
            }}
            onSubmit={handleSendStatement}
          />
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Reminders Confirmation Dialog */}
      <AlertDialog
        open={showRemindersConfirm}
        onOpenChange={(open) => {
          if (!open && sendReminders.isPending) return;
          setShowRemindersConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Billing Reminders</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50 text-blue-700">
                  <Info size={16} className="text-blue-700" />
                  <AlertTitle>Automated by default</AlertTitle>
                  <AlertDescription className="text-xs text-blue-700">
                    Reminder emails are already automated. Use this only as a manual fallback when a client says they did not receive the scheduled reminder.
                  </AlertDescription>
                </Alert>
                <p>
                  This will send billing reminder emails to <strong className="text-foreground">all active accounts</strong> with outstanding balances.
                </p>

                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This account</span>
                    <span className="font-medium text-foreground">{acct.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding balance</span>
                    <span className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {amt(balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient email</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[200px]">
                      {recipientEmail || <span className="text-red-500">Not configured</span>}
                    </span>
                  </div>
                </div>

                {!recipientEmail && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                    <XCircle size={16} className="text-red-700" />
                    <AlertTitle>No recipient email configured</AlertTitle>
                    <AlertDescription className="text-xs text-red-700">
                      No email address is configured for this account or its client. The reminder will be logged as failed.
                    </AlertDescription>
                  </Alert>
                )}

                {balance <= 0 && (
                  <Alert className="border-blue-200 bg-blue-50 text-blue-700">
                    <Info size={16} className="text-blue-700" />
                    <AlertTitle>Account will be skipped</AlertTitle>
                    <AlertDescription className="text-xs text-blue-700">
                      This account has no outstanding balance. It will be skipped during the reminder process.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  Manual run is a fallback and still targets all qualifying active accounts, not just this one. Delivery status is logged in Email History.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendReminders.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                sendReminders.mutate(undefined, {
                  onSettled: () => setShowRemindersConfirm(false),
                });
              }}
              disabled={sendReminders.isPending}
            >
              {sendReminders.isPending ? "Sending..." : "Send Reminders"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Generate SOA Confirmation Dialog */}
      <AlertDialog
        open={showGenerateSOAConfirm}
        onOpenChange={(open) => {
          if (!open && generateStatements.isPending) return;
          setShowGenerateSOAConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Generate Statements</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <Alert className="border-blue-200 bg-blue-50 text-blue-700">
                  <Info size={16} className="text-blue-700" />
                  <AlertTitle>Automated by default</AlertTitle>
                  <AlertDescription className="text-xs text-blue-700">
                    Statement generation is already automated. Use this manual run only as a fallback when a client reports that their scheduled SOA was not received.
                  </AlertDescription>
                </Alert>
                <p>
                  This will generate a Statement of Account for <strong className="text-foreground">all active accounts</strong> for the previous billing period as finalized, ready to send.
                </p>

                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium text-foreground">{acct.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing cutoff day</span>
                    <span className="font-medium text-foreground">Day {acct.billing_cutoff_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current balance</span>
                    <span className="font-semibold text-foreground">{amt(balance)}</span>
                  </div>
                  {recipientEmail && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact email on file</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[200px]">
                        {recipientEmail}
                      </span>
                    </div>
                  )}
                </div>

                {latestStatement && (
                  <Alert className="border-blue-200 bg-blue-50 text-blue-700">
                    <Info size={16} className="text-blue-700" />
                    <AlertTitle>Latest statement: {latestStatement.statement_number}</AlertTitle>
                    <AlertDescription className="text-xs text-blue-700 space-y-1">
                      <p>
                        Period: {format(new Date(latestStatement.period_start), "MMM d")} - {format(new Date(latestStatement.period_end), "MMM d, yyyy")}
                        {" "}({latestStatement.status})
                      </p>
                      <p>If a statement already exists for the next period, it will be skipped (idempotent).</p>
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  Manual run is fallback behavior. Statements are generated as "finalized" for all active accounts. Use the Statements table to send manually.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generateStatements.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                generateStatements.mutate(undefined, {
                  onSuccess: (data: GenerateStatementsResponse) => {
                    const generatedForThisAccount = data.results?.some(
                      (result) =>
                        result.account_id === accountId &&
                        result.status === "generated"
                    );
                    if (generatedForThisAccount) {
                      setHistoryTab("statements");
                    }
                  },
                  onSettled: () => setShowGenerateSOAConfirm(false),
                });
              }}
              disabled={generateStatements.isPending}
            >
              {generateStatements.isPending ? "Generating..." : "Generate SOA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={statementToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteStatement.isPending) setStatementToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete statement?</AlertDialogTitle>
            <AlertDialogDescription>
              {statementToDelete?.statement_number} hasn't been sent to the
              client. Deleting it can't be undone. Charges and payments are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatement.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteStatement.isPending}
              onClick={() =>
                statementToDelete &&
                deleteStatement.mutate(statementToDelete.id, {
                  onSuccess: () => setStatementToDelete(null),
                })
              }
            >
              {deleteStatement.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TransactionDateDialog
        open={Boolean(editingTransactionDateLineItem)}
        onOpenChange={(open) => {
          if (!open) {
            if (updateLineItemTransactionDate.isPending) return;
            setEditingTransactionDateLineItem(null);
          }
        }}
        sourceLabel={editingTransactionDateSourceLabel}
        sourceDate={editingTransactionDateSourceDate}
        title="Edit Transaction Date"
        description="Choose which date should be used for this billing entry:"
        confirmLabel="Save"
        defaultMode="custom"
        initialCustomDate={editingTransactionDateInitialDate}
        pending={updateLineItemTransactionDate.isPending}
        onConfirm={async ({ mode, transactionDate }) => {
          await handleUpdateTransactionDate({ mode, transactionDate });
        }}
      />
    </TooltipProvider>
  );
}
