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
  ChevronDown,
  ChevronRight,
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
import { pdf } from "@react-pdf/renderer";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
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
  useDeleteBillingAccount,
  useUpdateBillingStatement,
  useBillingInterestLogs,
  useEmailLogs,
  useTriggerSendBillingReminders,
  useTriggerGenerateStatements,
} from "./useBilling";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { useUser } from "../auth/useUser";
import { isManagerReauthPasswordValid } from "../auth/manager-auth";
import { formatNumberWithCommas } from "../../lib/helpers";
import {
  BillingAccount,
  BillingAccountStatus,
  LedgerEntry,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
  BillingAging,
  BillingInterestLog,
  EmailLog,
} from "../../lib/billing-types";

import RecordPaymentPanel from "./record-payment-panel";
import AttachJobOrderPanel from "./attach-job-order-panel";
import AttachRentalPanel from "./attach-rental-panel";
import GenerateStatementPanel from "./generate-statement-panel";
import BillingAccountFormSheet from "./billing-account-form";
import BillingStatementPDF, { BillingStatementPDFData } from "./billing-statement-pdf";
import { useFeatureOnboarding } from "../onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../onboarding/feature-announcement-modal";
import GuidedTour from "../onboarding/guided-tour";
import TourReplayButton from "../onboarding/tour-replay-button";

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

const STATEMENT_SEND_HINT_STORAGE_KEY = "billing_statement_send_hint_hidden";
type StatementActionType = "finalize" | "send";

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

type SubSheetType = "payment" | "attach-jo" | "attach-rental" | "statement" | "edit" | null;

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
  const { data: agingData, isLoading: agingLoading } =
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
  const deleteAccount = useDeleteBillingAccount();
  const updateStatement = useUpdateBillingStatement();
  const sendReminders = useTriggerSendBillingReminders();
  const generateStatements = useTriggerGenerateStatements();

  // Onboarding tour
  const {
    showAnnouncement: showDetailAnnouncement,
    showTour: showDetailTour,
    onboardingData: detailOnboardingData,
    startTour: startDetailTour,
    completeTour: completeDetailTour,
    replayTour: replayDetailTour,
  } = useFeatureOnboarding("billing_account_detail");

  // Collapsible section states
  const [statementsOpen, setStatementsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [jobOrdersOpen, setJobOrdersOpen] = useState(false);
  const [rentalsOpen, setRentalsOpen] = useState(false);
  const [showInterestConfirm, setShowInterestConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BillingAccountStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAuthPassword, setDeleteAuthPassword] = useState("");
  const [deleteAuthError, setDeleteAuthError] = useState<string | null>(null);
  const [showRemindersConfirm, setShowRemindersConfirm] = useState(false);
  const [showGenerateSOAConfirm, setShowGenerateSOAConfirm] = useState(false);
  const [interestLogsOpen, setInterestLogsOpen] = useState(false);
  const [emailLogsOpen, setEmailLogsOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "job_order" | "rental">("all");
  const [sendingStatementId, setSendingStatementId] = useState<string | null>(null);
  const [downloadingStatementId, setDownloadingStatementId] = useState<string | null>(null);
  const [highlightStatementAction, setHighlightStatementAction] =
    useState<StatementActionType | null>(null);
  const [showStatementActionHint, setShowStatementActionHint] = useState(false);
  const [statementHintAction, setStatementHintAction] =
    useState<StatementActionType>("send");
  const [dontRemindStatementActionHint, setDontRemindStatementActionHint] =
    useState(false);
  const [suppressStatementActionHint, setSuppressStatementActionHint] =
    useState(false);
  const statementAttentionTimerRef = useRef<number | null>(null);
  const statementHighlightTimerRef = useRef<number | null>(null);

  // Mock data for detail tour when account has no data
  const tourActive = showDetailTour;
  const MOCK_LINE_ITEMS: BillingLineItem[] = [
    {
      id: "mock-li-1",
      billing_account_id: accountId,
      job_order_id: 1,
      rental_id: null,
      branch_id: 1,
      type: "charge",
      description: "JO JO-01-001 - Printer Repair",
      amount: 3500,
      balance_at_time: 3500,
      due_date: new Date(Date.now() - 18 * 86400000).toISOString().slice(0, 10),
      created_by: null,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      branches: { id: 1, name: "Main", prefix: "01" },
      joborders: { id: 1, order_no: "JO-01-001", status: "Completed" },
      paid_amount: 1500,
    },
    {
      id: "mock-li-2",
      billing_account_id: accountId,
      job_order_id: null,
      rental_id: 1,
      branch_id: 1,
      type: "charge",
      description: "Rental R-01-001 - Epson L3210 (MONTHLY)",
      amount: 5000,
      balance_at_time: 8500,
      due_date: new Date(Date.now() - 46 * 86400000).toISOString().slice(0, 10),
      created_by: null,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      branches: { id: 1, name: "Main", prefix: "01" },
      rentals: { id: 1, rental_no: "R-01-001", status: "Ongoing" },
      paid_amount: 0,
    },
    {
      id: "mock-li-3",
      billing_account_id: accountId,
      job_order_id: null,
      rental_id: null,
      branch_id: 1,
      type: "interest",
      description: "Monthly interest (2.00%)",
      amount: 70,
      balance_at_time: 8570,
      due_date: null,
      created_by: null,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      branches: { id: 1, name: "Main", prefix: "01" },
      paid_amount: 0,
    },
  ];
  const MOCK_PAYMENTS: BillingPayment[] = [
    { id: "mock-pay-1", billing_account_id: accountId, amount: 1500, payment_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), payment_method: "gcash", reference_number: "GC-12345", notes: null, created_by: null, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  ];
  const MOCK_STATEMENTS: BillingStatement[] = [
    { id: "mock-stmt-1", billing_account_id: accountId, statement_number: "SOA-2026-03-001", period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), period_end: new Date().toISOString().slice(0, 10), previous_balance: 0, new_charges: 8500, payments_received: 1500, interest_applied: 70, current_balance: 7070, due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), branch_filter: null, status: "finalized", generated_by: null, generated_at: new Date().toISOString(), sent_at: null, pdf_url: null },
  ];
  const MOCK_INTEREST_LOGS: BillingInterestLog[] = [
    { id: "mock-int-1", billing_account_id: accountId, billing_line_item_id: "mock-li-3", applied_at: new Date(Date.now() - 1 * 86400000).toISOString(), interest_amount: 70, rate: 2, overdue_balance: 3500, billing_cycle: new Date().toISOString().slice(0, 7), created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  ];
  const MOCK_EMAIL_LOGS: EmailLog[] = [
    { id: "mock-email-1", billing_account_id: accountId, recipient: "billing@sunshine.com", subject: "Billing Reminder - March 2026", type: "billing_reminder", status: "sent", error_message: null, metadata: {}, sent_at: new Date(Date.now() - 2 * 86400000).toISOString(), created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ];
  const MOCK_LEDGER: LedgerEntry[] = [
    { id: "mock-led-1", date: new Date(Date.now() - 7 * 86400000).toISOString(), type: "charge", description: "JO JO-01-001 - Printer Repair", debit: 3500, credit: 0, balance: 3500, branch: "Main", source: "line_item" },
    { id: "mock-led-2", date: new Date(Date.now() - 5 * 86400000).toISOString(), type: "payment", description: "Payment - GCash (GC-12345)", debit: 0, credit: 1500, balance: 2000, source: "payment" },
    { id: "mock-led-3", date: new Date(Date.now() - 3 * 86400000).toISOString(), type: "charge", description: "Rental R-01-001 - Epson L3210 (MONTHLY)", debit: 5000, credit: 0, balance: 7000, branch: "Main", source: "line_item" },
    { id: "mock-led-4", date: new Date(Date.now() - 1 * 86400000).toISOString(), type: "interest", description: "Monthly interest (2.00%)", debit: 70, credit: 0, balance: 7070, branch: "Main", source: "line_item" },
  ];
  const MOCK_AGING: BillingAging = {
    current_amount: 570,
    days_1_30: 3000,
    days_31_60: 3500,
    days_61_90: 0,
    days_90_plus: 0,
  };

  // Derived
  const acct = account as BillingAccount | undefined;
  const rawLineItems = (lineItems ?? []) as BillingLineItem[];
  const usingMockLineItems = tourActive && rawLineItems.length === 0;
  const allLineItems = usingMockLineItems ? MOCK_LINE_ITEMS : rawLineItems;

  const rawLedger = (ledger ?? []) as LedgerEntry[];
  const usingMockLedger = tourActive && rawLedger.length === 0;
  const effectiveLedger: LedgerEntry[] = usingMockLedger ? MOCK_LEDGER : rawLedger;

  const computedBalance =
    typeof balanceData === "number"
      ? balanceData
      : (acct?.current_balance ?? 0);
  const fallbackMockBalance =
    effectiveLedger.length > 0
      ? effectiveLedger[effectiveLedger.length - 1]?.balance ?? 0
      : 0;
  const balance =
    tourActive && computedBalance <= 0 && usingMockLineItems
      ? fallbackMockBalance
      : computedBalance;

  const rawAging = (agingData ?? acct?.aging) as BillingAging | undefined;
  const hasRawAgingBreakdown =
    !!rawAging &&
    (rawAging.current_amount > 0 ||
      rawAging.days_1_30 > 0 ||
      rawAging.days_31_60 > 0 ||
      rawAging.days_61_90 > 0 ||
      rawAging.days_90_plus > 0);
  const aging =
    tourActive && !hasRawAgingBreakdown && usingMockLineItems
      ? MOCK_AGING
      : rawAging;

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
  const totalCharges = allLineItems
    .filter((li) => li.type === "charge")
    .reduce((sum, li) => sum + li.amount, 0);

  // Check if interest already applied this billing cycle
  const currentCycle = new Date().toISOString().slice(0, 7); // YYYY-MM
  const rawInterestLogs = (interestLogs ?? []) as BillingInterestLog[];
  const typedInterestLogsAll = tourActive && rawInterestLogs.length === 0 ? MOCK_INTEREST_LOGS : rawInterestLogs;
  const interestAlreadyApplied = typedInterestLogsAll.some(
    (log) => log.billing_cycle === currentCycle
  );

  // Determine email recipient
  const recipientEmail = acct?.billing_contact_email || acct?.clients?.email;

  // Latest statement info
  const rawStatements = (statements ?? []) as BillingStatement[];
  const typedStatements = tourActive && rawStatements.length === 0 ? MOCK_STATEMENTS : rawStatements;
  const latestStatement = typedStatements.length > 0
    ? [...typedStatements].sort((a, b) =>
        new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
      )[0]
    : null;

  // Action-required counts
  const draftStatements = typedStatements.filter((s) => s.status === "draft");
  const finalizedNotSent = typedStatements.filter((s) => s.status === "finalized");

  const rawEmailLogs = (emailLogs ?? []) as EmailLog[];
  const typedEmailLogs =
    tourActive && rawEmailLogs.length === 0 ? MOCK_EMAIL_LOGS : rawEmailLogs;
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

  // Use mock data for tour if payments are empty
  const rawPayments = (payments ?? []) as BillingPayment[];
  const effectivePayments: BillingPayment[] = tourActive && rawPayments.length === 0 ? MOCK_PAYMENTS : rawPayments;

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

  useEffect(() => {
    const savedValue = window.localStorage.getItem(
      STATEMENT_SEND_HINT_STORAGE_KEY
    );
    setSuppressStatementActionHint(savedValue === "1");
  }, []);

  useEffect(() => {
    return () => {
      if (statementAttentionTimerRef.current) {
        window.clearTimeout(statementAttentionTimerRef.current);
      }
      if (statementHighlightTimerRef.current) {
        window.clearTimeout(statementHighlightTimerRef.current);
      }
    };
  }, []);

  const dismissStatementActionHint = useCallback(() => {
    if (dontRemindStatementActionHint) {
      window.localStorage.setItem(STATEMENT_SEND_HINT_STORAGE_KEY, "1");
      setSuppressStatementActionHint(true);
    }
    setShowStatementActionHint(false);
  }, [dontRemindStatementActionHint]);

  const focusStatementsAndHighlightAction = useCallback((preferredAction: StatementActionType) => {
    setStatementsOpen(true);
    if (activeSubSheet) {
      setActiveSubSheet(null);
    }

    let attempts = 0;
    const maxAttempts = 12;

    const run = () => {
      const section = document.querySelector(
        '[data-tour="billing-detail-statements-section"]'
      ) as HTMLElement | null;
      const table = document.querySelector(
        '[data-tour="billing-detail-statements-table"]'
      ) as HTMLElement | null;
      (table || section)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const targetSelector =
        preferredAction === "finalize"
          ? '[data-statement-finalize-cta="true"]'
          : '[data-statement-send-cta="true"]';
      const targetButtons = document.querySelectorAll(targetSelector);
      const fallbackButtons =
        preferredAction === "finalize"
          ? document.querySelectorAll('[data-statement-send-cta="true"]')
          : [];

      let actionToHighlight: StatementActionType | null = null;
      if (targetButtons.length > 0) {
        actionToHighlight = preferredAction;
      } else if (preferredAction === "finalize" && fallbackButtons.length > 0) {
        actionToHighlight = "send";
      }

      if (actionToHighlight || attempts >= maxAttempts) {
        if (actionToHighlight) {
          setHighlightStatementAction(actionToHighlight);
          if (!suppressStatementActionHint) {
            setDontRemindStatementActionHint(false);
            setStatementHintAction(actionToHighlight);
            setShowStatementActionHint(true);
          }
          if (statementHighlightTimerRef.current) {
            window.clearTimeout(statementHighlightTimerRef.current);
          }
          statementHighlightTimerRef.current = window.setTimeout(() => {
            setHighlightStatementAction(null);
          }, 8000);
        } else {
          setHighlightStatementAction(null);
          setShowStatementActionHint(false);
        }
        return;
      }

      attempts += 1;
      statementAttentionTimerRef.current = window.setTimeout(run, 250);
    };

    if (statementAttentionTimerRef.current) {
      window.clearTimeout(statementAttentionTimerRef.current);
    }
    statementAttentionTimerRef.current = window.setTimeout(run, 180);
  }, [activeSubSheet, suppressStatementActionHint]);

  const focusStatementsForManualGeneration = useCallback(() => {
    focusStatementsAndHighlightAction("finalize");
  }, [focusStatementsAndHighlightAction]);

  const focusStatementsForSend = useCallback(() => {
    focusStatementsAndHighlightAction("send");
  }, [focusStatementsAndHighlightAction]);

  const clearStatementAttention = useCallback(() => {
    setShowStatementActionHint(false);
    setHighlightStatementAction(null);
  }, []);

  const statementHintTitle =
    statementHintAction === "finalize"
      ? "Statement created as draft"
      : "Statement ready to send";
  const statementHintDescription =
    statementHintAction === "finalize"
      ? 'Click the "Finalize" action first, then send it to the client.'
      : 'Use the "Send" action to email it to the client.';

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

  function openDeleteDialog() {
    setDeleteAuthPassword("");
    setDeleteAuthError(null);
    setShowDeleteConfirm(true);
  }

  function confirmDeleteAccount() {
    if (!isManagerReauthPasswordValid(deleteAuthPassword)) {
      setDeleteAuthError("Incorrect manager password.");
      return;
    }

    deleteAccount.mutate(accountId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  }

  async function handleDownloadStatementPDF(statement: BillingStatement) {
    if (!acct || downloadingStatementId) return;
    setDownloadingStatementId(statement.id);

    const pdfData: BillingStatementPDFData = {
      statement,
      accountNumber: acct.account_number,
      clientName: acct.clients?.name ?? "Unknown Client",
      clientContact: acct.billing_contact_phone || acct.clients?.contact_number || null,
      clientEmail: acct.billing_contact_email || acct.clients?.email || null,
      interestRate: acct.interest_rate,
      lineItems: allLineItems,
      payments: effectivePayments ?? [],
    };

    try {
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
      onSuccess: () => {
        focusStatementsForSend();
      },
    });
  }

  async function handleSendStatement(statement: BillingStatement) {
    const email = acct?.billing_contact_email || acct?.clients?.email;

    if (!email) {
      toast.error("No email address configured for this account or client");
      return;
    }

    if (sendingStatementId || !acct) return;
    setSendingStatementId(statement.id);

    const periodStr = `${format(new Date(statement.period_start), "MMM d, yyyy")} - ${format(new Date(statement.period_end), "MMM d, yyyy")}`;

    try {
      // Generate PDF on the client side and convert to base64
      const pdfData: BillingStatementPDFData = {
        statement,
        accountNumber: acct.account_number,
        clientName: acct.clients?.name ?? "Unknown Client",
        clientContact: acct.billing_contact_phone || acct.clients?.contact_number || null,
        clientEmail: acct.billing_contact_email || acct.clients?.email || null,
        interestRate: acct.interest_rate,
        lineItems: allLineItems,
        payments: effectivePayments ?? [],
      };

      const blob = await pdf(<BillingStatementPDF data={pdfData} />).toBlob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("send-billing-statement", {
        body: {
          statement_id: statement.id,
          billing_account_id: acct.id,
          to_email: email,
          client_name: acct.clients?.name || "Valued Client",
          account_number: acct.account_number,
          statement_number: statement.statement_number,
          period: periodStr,
          previous_balance: statement.previous_balance,
          new_charges: statement.new_charges,
          interest_applied: statement.interest_applied,
          payments_received: statement.payments_received,
          balance_due: statement.current_balance,
          due_date: statement.due_date
            ? format(new Date(statement.due_date), "MMM d, yyyy")
            : "N/A",
          pdf_base64: base64,
          pdf_filename: `${statement.statement_number}.pdf`,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["email_logs", accountId] });

      if (error) {
        toast.error("Failed to send statement: " + error.message);
      } else if (data && typeof data === "object" && "success" in data && !(data as { success: boolean }).success) {
        const errorMessage =
          (data as { error?: string }).error ||
          "Email send failed. Check email logs for details.";
        toast.error(errorMessage);
      } else {
        const successMessage =
          (data as { message?: string })?.message || `Statement sent to ${email}`;
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: ["billing_statements", accountId] });
      }
    } catch (err) {
      toast.error("Failed to generate PDF for email");
      console.error(err);
    } finally {
      setSendingStatementId(null);
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
  const statusActionLabel = acct.status === "active" ? "Suspend" : "Activate";
  const statusActionTargetLabel =
    pendingStatus === "suspended" ? "Suspend" : "Activate";

  const isCompressed = activeSubSheet !== null;
  const shouldStack = isNarrow && isCompressed;

  // ─── Header (always visible) ──────────────────────────────────────────────

  const headerSection = (
    <div className="space-y-3" data-tour="billing-detail-header">
      {/* Account number + tour row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">
          {acct.account_number}
        </span>
        <TourReplayButton onClick={replayDetailTour} label="Account tour" />
      </div>

      {/* Account details + status/actions */}
      <div className="flex items-start justify-between gap-3">
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
                data-tour="billing-detail-more-actions"
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[170px]"
              data-tour="billing-detail-more-actions-menu"
            >
              <DropdownMenuItem
                onClick={handleRequestStatusChange}
                disabled={updateAccount.isPending || acct.status === "closed"}
                className="gap-2"
                data-tour="billing-detail-more-actions-status"
              >
                <Ban size={14} />
                {updateAccount.isPending
                  ? "Saving..."
                  : `${statusActionLabel} Account`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openDeleteDialog}
                disabled={deleteAccount.isPending}
                className="gap-2 text-red-600 focus:text-red-600"
                data-tour="billing-detail-more-actions-delete"
              >
                <Trash2 size={14} />
                {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
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
    <div className="space-y-3" data-tour="billing-detail-balance">
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
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-red-500">
              {amt(totalOverdue)} overdue
            </p>
            {!interestAlreadyApplied && (isDev || isAdmin) && (
              <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] px-1.5 py-0 rounded-full font-semibold">
                Interest pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Balance breakdown */}
      {(totalCharges > 0 || totalInterestCharges > 0) && !isCompressed && (
        <div className="rounded-lg border bg-gray-50/80 p-2.5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Charges Subtotal</span>
            <span className="tabular-nums">{amt(totalCharges)}</span>
          </div>
          {totalInterestCharges > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-amber-600 flex items-center gap-1">
                <Percent size={10} /> Interest Applied
              </span>
              <span className="tabular-nums text-amber-600 font-medium">
                {amt(totalInterestCharges)}
              </span>
            </div>
          )}
          <div className="border-t pt-1 flex justify-between text-xs font-semibold">
            <span>Total Due</span>
            <span className="tabular-nums">{amt(balance)}</span>
          </div>
        </div>
      )}

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
    <div className={`grid gap-1.5 ${isCompressed ? "grid-cols-1" : "grid-cols-2"}`} data-tour="billing-detail-actions">
      <Button
        size="sm"
        className="gap-1.5 h-8 text-xs"
        variant={activeSubSheet === "payment" ? "default" : "outline"}
        onClick={() =>
          activeSubSheet === "payment"
            ? closeSubSheet()
            : openSubSheet("payment")
        }
        data-tour="billing-detail-action-payment"
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
        data-tour="billing-detail-action-attach-jo"
      >
        <Plus size={13} />
        Attach JO
      </Button>
      <Button
        size="sm"
        className="gap-1.5 h-8 text-xs"
        variant={activeSubSheet === "attach-rental" ? "default" : "outline"}
        onClick={() =>
          activeSubSheet === "attach-rental"
            ? closeSubSheet()
            : openSubSheet("attach-rental")
        }
        data-tour="billing-detail-action-attach-rental"
      >
        <Plus size={13} />
        Attach Rental
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
        data-tour="billing-detail-action-statement"
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
          data-tour="billing-detail-action-edit"
        >
          <Pencil size={13} />
          Edit
        </Button>
      )}
      {(isDev || isAdmin) && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-8 text-xs"
          onClick={handleApplyInterest}
          disabled={applyInterest.isPending}
          data-tour="billing-detail-admin-interest"
        >
          <Percent size={13} />
          {applyInterest.isPending ? "Applying..." : "Apply Interest"}
        </Button>
      )}
      {(isDev || isAdmin) && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setShowRemindersConfirm(true)}
          disabled={sendReminders.isPending}
          data-tour="billing-detail-admin-reminders"
        >
          <Send size={13} />
          {sendReminders.isPending ? "Sending..." : "Send Reminders"}
        </Button>
      )}
      {(isDev || isAdmin) && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setShowGenerateSOAConfirm(true)}
          disabled={generateStatements.isPending}
          data-tour="billing-detail-admin-soa"
        >
          <FileText size={13} />
          {generateStatements.isPending ? "Generating..." : "Auto-Generate SOA"}
        </Button>
      )}
    </div>
  );

  // ─── Ledger table ─────────────────────────────────────────────────────────

  const ledgerSection = (
    <div data-tour="billing-detail-ledger">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider">
            Transaction Ledger
          </h3>
          <HelpTip text="Complete history of all charges, payments, and adjustments on this account. Debit = amount owed, Credit = amount paid." />
        </div>
        <div className="flex gap-1" data-tour="billing-detail-source-filter">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedger.map((entry) => (
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
      <CollapsibleTrigger data-tour="billing-detail-jo-section" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
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
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-jo-table">
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

  const rentalsSection = (
    <Collapsible open={rentalsOpen} onOpenChange={setRentalsOpen}>
      <CollapsibleTrigger data-tour="billing-detail-rental-section" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <Receipt size={13} />
          Attached Rentals ({rentalLineItems.length})
        </span>
        {rentalsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rentalLineItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No rentals attached.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-rental-table">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">
                    Rental #
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
                {rentalLineItems.map((li) => {
                  const paid = li.paid_amount ?? 0;
                  const fullyPaid = paid >= li.amount;
                  return (
                    <TableRow key={li.id}>
                      <TableCell className="text-xs font-mono py-1.5">
                        {li.rentals?.rental_no ?? "—"}
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
      <CollapsibleTrigger data-tour="billing-detail-payments-section" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <DollarSign size={13} />
          Payments (
          {effectivePayments.length})
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
        ) : effectivePayments.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No payments recorded.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-payments-table">
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
                {effectivePayments.map((p) => (
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
      <CollapsibleTrigger data-tour="billing-detail-statements-section" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
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
        {statementsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {showStatementActionHint && (
          <Alert className="mb-2 border-amber-200 bg-amber-50 text-amber-900 p-2.5">
            <AlertTitle className="text-xs font-semibold">{statementHintTitle}</AlertTitle>
            <AlertDescription className="text-xs text-amber-900">
              {statementHintDescription}
            </AlertDescription>
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[11px] text-amber-800">
                <Checkbox
                  checked={dontRemindStatementActionHint}
                  onCheckedChange={(checked) =>
                    setDontRemindStatementActionHint(checked === true)
                  }
                />
                Don't remind me again
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={dismissStatementActionHint}
              >
                Got it
              </Button>
            </div>
          </Alert>
        )}
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
            No statements generated.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-statements-table">
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
                      <div className="flex gap-1 items-center">
                        {s.status === "draft" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 ${
                                  highlightStatementAction === "finalize"
                                    ? "ring-2 ring-amber-400 rounded-md bg-amber-50 animate-pulse"
                                    : ""
                                }`}
                                data-statement-finalize-cta="true"
                                onClick={() => {
                                  clearStatementAttention();
                                  handleFinalizeStatement(s.id);
                                }}
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
                        {s.status === "finalized" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-green-600 hover:text-green-700 ${
                                  highlightStatementAction === "send"
                                    ? "ring-2 ring-amber-400 rounded-md bg-amber-50 animate-pulse"
                                    : ""
                                }`}
                                data-statement-send-cta="true"
                                onClick={() => {
                                  clearStatementAttention();
                                  handleSendStatement(s);
                                }}
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
                        {s.status === "sent" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-5 px-1.5 text-[10px] text-muted-foreground ${
                                  highlightStatementAction === "send"
                                    ? "ring-2 ring-amber-400 rounded-md bg-amber-50 animate-pulse"
                                    : ""
                                }`}
                                data-statement-send-cta="true"
                                onClick={() => {
                                  clearStatementAttention();
                                  handleSendStatement(s);
                                }}
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

  // ─── Interest Logs section ───────────────────────────────────────────────

  const typedInterestLogs = typedInterestLogsAll;

  const interestLogsSection = (
    <Collapsible open={interestLogsOpen} onOpenChange={setInterestLogsOpen}>
      <CollapsibleTrigger data-tour="billing-detail-interest-logs" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <Percent size={13} />
          Interest History ({typedInterestLogs.length})
        </span>
        {interestLogsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {typedInterestLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No interest has been applied yet.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-interest-table">
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
      </CollapsibleContent>
    </Collapsible>
  );

  // ─── Email Logs section ────────────────────────────────────────────────

  const emailStatusIcon: Record<string, JSX.Element> = {
    sent: <CheckCircle2 size={12} className="text-green-600" />,
    failed: <XCircle size={12} className="text-red-500" />,
    pending: <Clock size={12} className="text-yellow-500" />,
  };

  const emailLogsSection = (
    <Collapsible open={emailLogsOpen} onOpenChange={setEmailLogsOpen}>
      <CollapsibleTrigger data-tour="billing-detail-email-logs" className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
        <span className="flex items-center gap-1.5">
          <Mail size={13} />
          Email History ({typedEmailLogs.length})
        </span>
        {emailLogsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {typedEmailLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No emails sent for this account.
          </p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2" data-tour="billing-detail-email-table">
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
      </CollapsibleContent>
    </Collapsible>
  );

  // ─── Sub-sheet content ────────────────────────────────────────────────────

  const subSheetTitle: Record<string, string> = {
    payment: "Record Payment",
    "attach-jo": "Attach Job Orders",
    "attach-rental": "Attach Rentals",
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
          data-tour="billing-detail-subsheet-back"
        >
          <ArrowLeft size={16} />
        </Button>
        <h3 className="text-sm font-semibold flex-1">
          {subSheetTitle[activeSubSheet]}
        </h3>
      </div>

      {/* Sub-sheet body */}
      <div className="flex-1 overflow-y-auto p-5" data-tour="billing-detail-subsheet-content">
        {activeSubSheet === "payment" && (
          <div data-tour="billing-detail-dialog-payment">
            <RecordPaymentPanel
              accountId={accountId}
              onClose={closeSubSheet}
            />
          </div>
        )}
        {activeSubSheet === "attach-jo" && (
          <div data-tour="billing-detail-dialog-attach-jo">
            <AttachJobOrderPanel
              accountId={accountId}
              clientId={clientId}
              onClose={closeSubSheet}
            />
          </div>
        )}
        {activeSubSheet === "attach-rental" && (
          <div data-tour="billing-detail-dialog-attach-rental">
            <AttachRentalPanel
              accountId={accountId}
              clientId={clientId}
              onClose={closeSubSheet}
            />
          </div>
        )}
        {activeSubSheet === "statement" && (
          <div data-tour="billing-detail-dialog-statement">
            <GenerateStatementPanel
              accountId={accountId}
              onClose={closeSubSheet}
              onGenerated={focusStatementsForManualGeneration}
            />
          </div>
        )}
        {activeSubSheet === "edit" && (
          <div data-tour="billing-detail-dialog-edit">
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
            <Separator />
            {ledgerSection}
            <Separator />
            {jobOrdersSection}
            {rentalsSection}
            {recentPaymentsSection}
            {recentStatementsSection}
            {interestLogsSection}
            {(isDev || isAdmin) && emailLogsSection}

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

      {/* Suspend/Activate Confirmation Dialog */}
      <AlertDialog
        open={showStatusConfirm}
        onOpenChange={(open) => {
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) {
            setDeleteAuthPassword("");
            setDeleteAuthError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This action is permanent. Enter manager re-authentication password to continue.
                </p>
                <p className="text-xs text-muted-foreground">
                  Account: <span className="font-medium text-foreground">{acct.account_number}</span>
                </p>
              </div>
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
            />
            {deleteAuthError && (
              <p className="text-xs text-red-600">{deleteAuthError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAccount}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Interest Confirmation Dialog */}
      <AlertDialog open={showInterestConfirm} onOpenChange={setShowInterestConfirm}>
        <AlertDialogContent data-tour="billing-detail-dialog-interest">
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
              onClick={confirmApplyInterest}
              disabled={applyInterest.isPending || interestAlreadyApplied}
            >
              {applyInterest.isPending ? "Applying..." : interestAlreadyApplied ? "Already Applied" : "Apply Interest"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Reminders Confirmation Dialog */}
      <AlertDialog open={showRemindersConfirm} onOpenChange={setShowRemindersConfirm}>
        <AlertDialogContent data-tour="billing-detail-dialog-reminders">
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
              onClick={() => {
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
      <AlertDialog open={showGenerateSOAConfirm} onOpenChange={setShowGenerateSOAConfirm}>
        <AlertDialogContent data-tour="billing-detail-dialog-soa">
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
              onClick={() => {
                generateStatements.mutate(undefined, {
                  onSuccess: (data: GenerateStatementsResponse) => {
                    const generatedForThisAccount = data.results?.some(
                      (result) =>
                        result.account_id === accountId &&
                        result.status === "generated"
                    );
                    if (generatedForThisAccount) {
                      focusStatementsForSend();
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
      {/* Onboarding Tour */}
      <FeatureAnnouncementModal
        open={showDetailAnnouncement}
        onboarding={detailOnboardingData}
        onStartTour={startDetailTour}
      />
      <GuidedTour
        featureKey="billing_account_detail"
        active={showDetailTour}
        onComplete={completeDetailTour}
      />
    </TooltipProvider>
  );
}
