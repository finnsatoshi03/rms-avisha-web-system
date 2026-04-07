import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import Joyride, {
  type Step,
  type CallBackProps,
  STATUS,
  ACTIONS,
  EVENTS,
} from "react-joyride";
import {
  ReceiptText,
  Lock,
  Play,
  RotateCcw,
  Plus,
  DollarSign,
  FileText,
  Pencil,
  Percent,
  Phone,
  Mail,
  User,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Search,
  Filter,
  Info,
  Send,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";
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
import HeaderText from "../ui/headerText";

import {
  DEMO_ACCOUNTS,
  DEMO_ACCOUNT,
  DEMO_CLIENT,
  DEMO_JOB_ORDERS,
  DEMO_LINE_ITEMS,
  DEMO_PAYMENTS,
  DEMO_AGING,
  DEMO_BALANCE,
  DEMO_LEDGER,
  DEMO_STATEMENTS,
  DEMO_INTEREST_LOGS,
  DEMO_EMAIL_LOGS,
} from "./billing-demo-data";
import { formatNumberWithCommas } from "../../lib/helpers";
import { getClientDisplayName } from "../../lib/client-hierarchy";

const STORAGE_KEY = "rms_billing_demo_completed";

// ─── Helpers ────────────────────────────────────────────────────────────────

function amt(value: number | null | undefined): string {
  if (value == null) return "\u20B10";
  return `\u20B1${formatNumberWithCommas(Math.abs(value))}`;
}

function hasDemoCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markDemoCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // silently ignore
  }
}

// ─── Badge maps ─────────────────────────────────────────────────────────────

const statusVariant: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  suspended: "bg-yellow-100 text-yellow-800 border-yellow-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const clientTypeBadge: Record<string, string> = {
  individual: "bg-blue-50 text-blue-700 border-blue-200",
  company: "bg-purple-50 text-purple-700 border-purple-200",
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

function creditLimitPercent(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((balance / limit) * 100));
}

function creditBarColor(pct: number): string {
  if (pct < 50) return "bg-green-500";
  if (pct < 80) return "bg-yellow-500";
  return "bg-red-500";
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          size={12}
          className="inline-block ml-1 text-gray-400 hover:text-gray-600 cursor-help align-middle"
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function BillingLockedExperience() {
  const [demoCompleted, setDemoCompleted] = useState(hasDemoCompleted);
  const [showDemo, setShowDemo] = useState(false);

  const handleStartDemo = useCallback(() => {
    setShowDemo(true);
  }, []);

  const handleDemoFinish = useCallback(() => {
    markDemoCompleted();
    setDemoCompleted(true);
    setShowDemo(false);
  }, []);

  const handleReplayDemo = useCallback(() => {
    setShowDemo(true);
  }, []);

  // First visit — show intro
  if (!demoCompleted && !showDemo) {
    return <DemoIntroScreen onStart={handleStartDemo} />;
  }

  // Demo running
  if (showDemo) {
    return <DemoWithJoyride onFinish={handleDemoFinish} />;
  }

  // Lock screen
  return <LockScreen onReplay={handleReplayDemo} />;
}

// ─── Intro Screen ───────────────────────────────────────────────────────────

function DemoIntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-lg text-center px-6">
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ReceiptText size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Billing & Statement of Account
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Manage client billing accounts, track payments, and generate
          professional statements with PDF — all in one place. Automated interest,
          email reminders, and SOA generation run on schedule. Take an interactive
          tour to see how it works with sample data.
        </p>
        <Button onClick={onStart} size="lg" className="gap-2 px-8">
          <Play size={18} />
          Start Demo Tour
        </Button>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Lock size={14} />
          <span>This feature requires activation. Contact your system administrator.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Lock Screen ────────────────────────────────────────────────────────────

function LockScreen({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock size={32} className="text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Billing Module
        </h1>
        <p className="text-gray-500 mb-6">
          This feature requires activation.
          <br />
          Contact your system administrator.
        </p>
        <Button onClick={onReplay} variant="outline" className="gap-2">
          <RotateCcw size={16} />
          Replay Demo Tour
        </Button>
      </div>
    </div>
  );
}

// ─── Demo with Joyride ──────────────────────────────────────────────────────

function DemoWithJoyride({ onFinish }: { onFinish: () => void }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [subSheet, setSubSheet] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Collapsible states for the sheet
  const [jobOrdersOpen, setJobOrdersOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [statementsOpen, setStatementsOpen] = useState(true);
  const [interestLogsOpen, setInterestLogsOpen] = useState(false);
  const [emailLogsOpen, setEmailLogsOpen] = useState(false);
  const [mockDialog, setMockDialog] = useState<"interest" | "reminders" | "soa" | null>(null);

  // Start tour after mount so DOM has rendered
  useEffect(() => {
    const t = setTimeout(() => setRunTour(true), 400);
    return () => clearTimeout(t);
  }, []);

  // ── Tour steps (0-indexed) ──────────────────────────────────────────────
  //  0  Accounts table
  //  1  Click account row → opens sheet
  //  2  Sheet header
  //  3  Balance & breakdown
  //  4  Core action buttons (Payment, Attach JO, Statement, Edit)
  //  5  Automation buttons (Apply Interest, Send Reminders, Auto-Generate SOA)
  //  6  Ledger
  //  7  JO section
  //  8  Payments section
  //  9  Statements section
  // 10  Interest history
  // 11  Email history
  // 12  Btn Attach JO (spotlight click)
  // 13  Sub-sheet: JO transfer
  // 14  Btn Payment (spotlight click)
  // 15  Sub-sheet: Payment
  // 16  Btn Statement (spotlight click)
  // 17  Sub-sheet: Statement

  const steps: Step[] = [
    // ── Phase 1: Accounts list (0-1) ──
    {
      target: "[data-tour='accounts-table']",
      title: "Billing Accounts",
      content:
        "This is your billing accounts list. Each client with a billing account appears here with their balance, status, and contact info.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-tour='account-row-0']",
      title: "Open Account Detail",
      content:
        'Click on an account to open its full detail sheet. Let\'s open "Sunshine Electronics Corp."',
      placement: "bottom",
      disableBeacon: true,
      spotlightClicks: true,
    },
    // ── Phase 2: Sheet overview (2-11) ──
    {
      target: "[data-tour='sheet-header']",
      title: "Account Overview",
      content:
        "The account header shows the client name, account number, status, and contact information at a glance.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-balance']",
      title: "Balance & Breakdown",
      content:
        "See the total unpaid balance with a charges/interest breakdown, credit limit usage bar, aging buckets, and action-required badges like \"Interest pending\" when overdue balances haven't had interest applied yet.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-actions']",
      title: "Core Actions",
      content:
        "These buttons let you record payments, attach job orders, generate statements, and edit account settings. Each opens a side panel within the sheet.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-automation']",
      title: "Automation Actions",
      content:
        "These are admin/dev actions for billing automation. Each one opens a detailed confirmation dialog before executing. All three also run automatically on schedule. Let's look at each dialog.",
      placement: "left",
      disableBeacon: true,
    },
    // ── Phase 2b: Mock alert dialogs (6-8) ──
    {
      target: "[data-tour='mock-dialog-interest']",
      title: "Apply Interest Dialog",
      content:
        "Before applying interest, a confirmation dialog shows the overdue balance, interest rate, and estimated charge. If interest was already applied for the current billing cycle, it shows a warning and disables the action — preventing duplicates.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-tour='mock-dialog-reminders']",
      title: "Send Reminders Dialog",
      content:
        "Shows account details, outstanding balance, and the recipient email address. Warns if no email is configured or if the balance is zero. Reminders are sent to ALL active accounts, not just this one.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-tour='mock-dialog-soa']",
      title: "Auto-Generate SOA Dialog",
      content:
        "Shows the billing cutoff day, current balance, recipient email, and the latest statement info. If a statement already exists for the period, it will be skipped (idempotent). Statements are created as finalized and emailed with a PDF attachment.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-ledger']",
      title: "Transaction Ledger",
      content:
        "The full transaction history — every charge, payment, and interest entry with a running balance. Interest entries appear in amber. This is the source of truth for the account.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-jo-section']",
      title: "Attached Job Orders",
      content:
        "All job orders transferred to this billing account, with their amount, paid status (Paid/Partial/Unpaid), and branch.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-payments-section']",
      title: "Payments History",
      content:
        "All recorded payments with date, amount, method, and reference number. Payments are automatically allocated to the oldest charges first (FIFO), or manually to specific items.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-statements-section']",
      title: "Statements (SOA)",
      content:
        "Generated statements with period, interest column, balance, and status. Action badges show \"draft\" and \"ready to send\" counts. Each statement has Send/Resend and PDF Download buttons. Statements are also auto-generated monthly.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-interest-section']",
      title: "Interest History",
      content:
        "Audit trail of every interest application — billing cycle, overdue balance, rate, and amount. The system applies interest automatically daily at 2AM UTC and won't duplicate within the same billing cycle.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-email-section']",
      title: "Email History",
      content:
        "Every billing email is logged — reminders, statements, and notifications. Shows delivery status (sent/failed), recipient, and timestamps. Automated reminders go out on the 1st of each month, SOA emails on the 2nd.",
      placement: "left",
      disableBeacon: true,
    },
    // ── Phase 3: Sub-sheet previews (12-17) ──
    {
      target: "[data-tour='btn-attach-jo']",
      title: "Attach Job Orders",
      content:
        "Click to open the job order attachment panel. It shows all eligible JOs for this client with their remaining balance and branch.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Job Order Transfer",
      content:
        "Select one or more job orders, review the total, and transfer. The remaining balance moves from the JO to the billing account. The JO is marked as \"transferred to billing\" and payment is tracked here instead.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='btn-payment']",
      title: "Record Payment",
      content:
        "Click to record a client payment. Enter amount, method, date, and optional reference number.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Payment Recording",
      content:
        "Payments auto-allocate to the oldest unpaid charges via FIFO. You can also switch to manual mode to allocate to specific line items. The balance updates instantly after recording.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='btn-statement']",
      title: "Generate Statement",
      content:
        "Click to generate a Statement of Account (SOA). Period dates are auto-calculated based on the billing cutoff day and last statement.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Statement of Account",
      content:
        "Preview the statement breakdown: previous balance, new charges, interest, payments, and total due. After generating, finalize it, download as PDF, or send via email with the PDF attached.",
      placement: "left",
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;

      if (status === STATUS.FINISHED) {
        setRunTour(false);
        onFinish();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;

        // Step 1 → 2: open the sheet
        if (nextIndex === 2 && !sheetOpen) {
          setSheetOpen(true);
          setSubSheet(null);
          setMockDialog(null);
          setJobOrdersOpen(false);
          setPaymentsOpen(false);
          setStatementsOpen(true);
          setInterestLogsOpen(false);
          setEmailLogsOpen(false);
          setTimeout(() => setStepIndex(nextIndex), 500);
          return;
        }

        // Going back to list — close everything
        if (nextIndex <= 1 && sheetOpen) {
          setSheetOpen(false);
          setSubSheet(null);
          setMockDialog(null);
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Mock dialogs (steps 6, 7, 8)
        if (nextIndex === 6) {
          setMockDialog("interest");
          setTimeout(() => setStepIndex(nextIndex), 300);
          return;
        }
        if (nextIndex === 7) {
          setMockDialog("reminders");
          setTimeout(() => setStepIndex(nextIndex), 300);
          return;
        }
        if (nextIndex === 8) {
          setMockDialog("soa");
          setTimeout(() => setStepIndex(nextIndex), 300);
          return;
        }
        // Leaving dialog area — always close when going outside 6-8
        if ((nextIndex < 6 || nextIndex > 8)) {
          setMockDialog(null);
        }

        // Open collapsibles (shifted by +3)
        if (nextIndex === 10) setJobOrdersOpen(true);
        if (nextIndex === 11) setPaymentsOpen(true);
        if (nextIndex === 13) setInterestLogsOpen(true);
        if (nextIndex === 14) setEmailLogsOpen(true);

        // Close sub-sheet when going back to main sections
        if (nextIndex <= 14 && subSheet) {
          setSubSheet(null);
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Open sub-sheets (shifted by +3)
        if (nextIndex === 16) {
          setSubSheet("attach-jo");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
        if (nextIndex === 18) {
          setSubSheet("payment");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
        if (nextIndex === 20) {
          setSubSheet("statement");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Going back through sub-sheet steps
        if (nextIndex === 17 && subSheet !== "attach-jo") {
          setSubSheet("attach-jo");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
        if (nextIndex === 19 && subSheet !== "payment") {
          setSubSheet("payment");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        setStepIndex(nextIndex);
      }
    },
    [onFinish, sheetOpen, subSheet, mockDialog]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col relative">
        {/* Demo mode banner */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs text-amber-700 font-medium">
            Demo Mode — All data shown is sample data
          </span>
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            Demo
          </Badge>
        </div>

        {/* Joyride */}
        <Joyride
          steps={steps}
          run={runTour}
          stepIndex={stepIndex}
          continuous
          showProgress
          disableOverlayClose
          spotlightPadding={4}
          callback={handleJoyrideCallback}
          locale={{
            back: "Back",
            close: "Close",
            last: "Finish Tour",
            next: "Next",
          }}
          styles={{
            options: {
              primaryColor: "hsl(var(--primary))",
              zIndex: 10000,
              arrowColor: "#fff",
              backgroundColor: "#fff",
              textColor: "#1f2937",
            },
            tooltip: {
              borderRadius: "12px",
              padding: "20px",
              fontSize: "14px",
            },
            tooltipTitle: {
              fontSize: "15px",
              fontWeight: 700,
            },
            tooltipContent: {
              padding: "8px 0 0",
              lineHeight: "1.5",
            },
            buttonNext: {
              borderRadius: "8px",
              fontSize: "13px",
              padding: "8px 16px",
            },
            buttonBack: {
              color: "#6b7280",
              fontSize: "13px",
            },
            buttonSkip: {
              color: "#9ca3af",
              fontSize: "12px",
            },
            spotlight: {
              borderRadius: "8px",
            },
          }}
        />

        {/* Real billing UI with mock data */}
        <div className="flex-1 overflow-auto">
          <MockBillingAccountsList
            onOpenAccount={() => {
              setSheetOpen(true);
              setSubSheet(null);
            }}
          />
        </div>

        {/* Account detail sheet */}
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            // Only allow closing if the tour is not running
            if (!open && !runTour) {
              setSheetOpen(false);
              setSubSheet(null);
            }
          }}
        >
          <SheetContent
            className="min-w-[55vw] p-0 overflow-hidden"
            onInteractOutside={(e) => {
              // Prevent sheet from closing when clicking joyride overlay/tooltip
              if (runTour) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (runTour) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (runTour) e.preventDefault();
            }}
          >
            <SheetTitle className="sr-only">
              Billing Account Detail
            </SheetTitle>
            <SheetDescription className="sr-only">
              Demo billing account detail
            </SheetDescription>
            <MockBillingAccountSheet
              subSheet={subSheet}
              setSubSheet={setSubSheet}
              jobOrdersOpen={jobOrdersOpen}
              setJobOrdersOpen={setJobOrdersOpen}
              paymentsOpen={paymentsOpen}
              setPaymentsOpen={setPaymentsOpen}
              statementsOpen={statementsOpen}
              setStatementsOpen={setStatementsOpen}
              interestLogsOpen={interestLogsOpen}
              setInterestLogsOpen={setInterestLogsOpen}
              emailLogsOpen={emailLogsOpen}
              setEmailLogsOpen={setEmailLogsOpen}
            />
          </SheetContent>
        </Sheet>
      </div>
      {/* ── Mock Alert Dialogs for tour ──────────────────────────────────── */}
      {mockDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" data-tour={`mock-dialog-${mockDialog}`}>
            {mockDialog === "interest" && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Apply Monthly Interest</h3>
                <p className="text-sm text-muted-foreground">
                  This will apply a <span className="font-semibold text-foreground">2%</span> monthly
                  interest charge on all overdue balances for this account.
                </p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Interest already applied for 2026-03</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      The system has already applied interest for this billing cycle. Running again will have no effect (idempotent).
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue balance</span>
                    <span className="font-semibold text-red-600">{amt(10110)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest rate</span>
                    <span className="font-medium">2% / month</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between">
                    <span className="text-muted-foreground">Estimated charge</span>
                    <span className="font-semibold">~{amt(202.20)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  A new interest line item will be added to the ledger. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled>Cancel</Button>
                  <Button size="sm" disabled>Already Applied</Button>
                </div>
              </div>
            )}

            {mockDialog === "reminders" && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Send Billing Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  This will send billing reminder emails to <strong className="text-foreground">all active accounts</strong> with outstanding balances.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This account</span>
                    <span className="font-medium">BA-DEMO-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding balance</span>
                    <span className="font-semibold text-red-600">{amt(10110)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient email</span>
                    <span className="font-medium text-right truncate max-w-[200px]">maria@sunshineelectronics.ph</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails will be sent to all qualifying accounts, not just this one. Delivery status will be logged in the Email History section.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled>Cancel</Button>
                  <Button size="sm" disabled>Send Reminders</Button>
                </div>
              </div>
            )}

            {mockDialog === "soa" && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Auto-Generate Statements</h3>
                <p className="text-sm text-muted-foreground">
                  This will automatically generate a Statement of Account for <strong className="text-foreground">all active accounts</strong> for the previous billing period, and email them to clients.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium">BA-DEMO-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing cutoff day</span>
                    <span className="font-medium">Day 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current balance</span>
                    <span className="font-semibold">{amt(10110)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Will email to</span>
                    <span className="font-medium text-right truncate max-w-[200px]">maria@sunshineelectronics.ph</span>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Latest statement: SOA-BADEMO001-2026-03</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Period: Mar 1 - Mar 31, 2026 (finalized)
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      If a statement already exists for the next period, it will be skipped (idempotent).
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Statements will be created as "finalized" and automatically emailed with a PDF attachment.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" disabled>Cancel</Button>
                  <Button size="sm" disabled>Generate & Send SOA</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Billing Accounts List — mirrors real BillingAccounts page
// ═══════════════════════════════════════════════════════════════════════════════

function MockBillingAccountsList({
  onOpenAccount,
}: {
  onOpenAccount: () => void;
}) {
  return (
    <div className="h-full flex flex-col p-0">
      <div className="flex items-center justify-between">
        <HeaderText>Billing Accounts</HeaderText>
        <Button className="gap-1.5" size="sm" disabled>
          <Plus size={16} />
          Create Account
        </Button>
      </div>

      {/* Filters */}
      <div className="my-4 flex sm:flex-row flex-col sm:gap-3 gap-2">
        <div className="relative">
          <Input
            disabled
            className="border-gray-400 h-fit py-1 pl-8"
            placeholder="Search.."
          />
          <Search className="absolute left-3 top-2 opacity-60" size={14} />
        </div>
        <Select disabled defaultValue="all">
          <SelectTrigger className="w-[150px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm">
            <Filter size={14} className="mr-1 opacity-60" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div
        className="flex-1 border rounded-lg overflow-auto"
        data-tour="accounts-table"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-semibold">Account #</TableHead>
              <TableHead className="text-xs font-semibold">Client</TableHead>
              <TableHead className="text-xs font-semibold">Type</TableHead>
              <TableHead className="text-xs font-semibold text-right">
                Credit Limit
              </TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Contact</TableHead>
              <TableHead className="text-xs font-semibold">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_ACCOUNTS.map((account, i) => (
              <TableRow
                key={account.id}
                data-tour={`account-row-${i}`}
                className={`cursor-pointer transition-colors ${i === 0
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-gray-50"
                  }`}
                onClick={i === 0 ? onOpenAccount : undefined}
              >
                <TableCell className="font-mono text-sm">
                  {account.account_number}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {getClientDisplayName(account.clients)}
                </TableCell>
                <TableCell>
                  {account.clients?.type ? (
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${clientTypeBadge[account.clients.type] || ""}`}
                    >
                      {account.clients.type}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {account.credit_limit
                    ? amt(account.credit_limit)
                    : "No limit"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${statusVariant[account.status] || ""}`}
                  >
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {account.billing_contact_phone || "—"}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(account.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {DEMO_ACCOUNTS.length} accounts
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Billing Account Sheet — mirrors real billing-account-sheet.tsx
// ═══════════════════════════════════════════════════════════════════════════════

function MockBillingAccountSheet({
  subSheet,
  setSubSheet,
  jobOrdersOpen,
  setJobOrdersOpen,
  paymentsOpen,
  setPaymentsOpen,
  statementsOpen,
  setStatementsOpen,
  interestLogsOpen,
  setInterestLogsOpen,
  emailLogsOpen,
  setEmailLogsOpen,
}: {
  subSheet: string | null;
  setSubSheet: (s: string | null) => void;
  jobOrdersOpen: boolean;
  setJobOrdersOpen: (v: boolean) => void;
  paymentsOpen: boolean;
  setPaymentsOpen: (v: boolean) => void;
  statementsOpen: boolean;
  setStatementsOpen: (v: boolean) => void;
  interestLogsOpen: boolean;
  setInterestLogsOpen: (v: boolean) => void;
  emailLogsOpen: boolean;
  setEmailLogsOpen: (v: boolean) => void;
}) {
  const acct = DEMO_ACCOUNT;
  const balance = DEMO_BALANCE;
  const aging = DEMO_AGING;
  const creditLimit = acct.credit_limit ?? 0;
  const usagePct = creditLimitPercent(balance, creditLimit);
  const totalOverdue =
    aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus;

  const isCompressed = subSheet !== null;

  const joLineItems = DEMO_LINE_ITEMS.filter(
    (li) => li.type === "charge" && li.job_order_id != null
  );

  // ─── Header ─────────────────────────────────────────────────────────────

  const headerSection = (
    <div className="space-y-3" data-tour="sheet-header">
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
      <div>
        <h2 className="text-xl font-bold tracking-tight leading-tight">
          {DEMO_CLIENT.name}
        </h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
            {DEMO_CLIENT.type}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Phone size={10} /> {acct.billing_contact_phone}
          </span>
          {!isCompressed && (
            <>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Mail size={10} /> {acct.billing_contact_email}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <User size={10} /> {acct.billing_contact_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Balance ────────────────────────────────────────────────────────────

  const balanceSummary = (
    <div className="space-y-3" data-tour="sheet-balance">
      <div>
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Total Unpaid
          </span>
          <HelpTip text="Total amount this client still owes across all job orders and charges." />
        </div>
        <span className="text-2xl font-bold tabular-nums block text-gray-900">
          {amt(balance)}
        </span>
        {totalOverdue > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-red-500">
              {amt(totalOverdue)} overdue
            </p>
            <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] px-1.5 py-0 rounded-full font-semibold">
              Interest pending
            </span>
          </div>
        )}
      </div>

      {/* Balance breakdown */}
      {!isCompressed && (
        <div className="rounded-lg border bg-gray-50/80 p-2.5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Charges Subtotal</span>
            <span className="tabular-nums">{amt(18000)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-amber-600 flex items-center gap-1">
              <Percent size={10} /> Interest Applied
            </span>
            <span className="tabular-nums text-amber-600 font-medium">{amt(110)}</span>
          </div>
          <div className="border-t pt-1 flex justify-between text-xs font-semibold">
            <span>Total Due</span>
            <span className="tabular-nums">{amt(balance)}</span>
          </div>
        </div>
      )}

      {creditLimit > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center">
              Credit Limit: {amt(creditLimit)}
              <HelpTip text="Maximum allowed unpaid balance." />
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

      {/* Aging */}
      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            Aging Breakdown
          </span>
          <HelpTip text="Shows how old the unpaid amounts are." />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Current", value: aging.current_amount, warn: false },
            { label: "1-30 days", value: aging.days_1_30, warn: true },
            { label: "31-60 days", value: aging.days_31_60, warn: true },
            { label: "61-90 days", value: aging.days_61_90, warn: true },
            { label: "Over 90 days", value: aging.days_90_plus, warn: true },
          ].map((bucket) => (
            <div
              key={bucket.label}
              className="flex items-center justify-between px-2 py-1 rounded border bg-gray-50/80"
            >
              <span className="text-[11px] text-gray-500">{bucket.label}</span>
              <span
                className={`text-xs font-semibold tabular-nums ${bucket.value > 0 && bucket.warn ? "text-red-600" : ""
                  }`}
              >
                {amt(bucket.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Actions ────────────────────────────────────────────────────────────

  const actionButtons = (
    <div className="space-y-1.5">
      <div
        className={`grid gap-1.5 ${isCompressed ? "grid-cols-1" : "grid-cols-2"}`}
        data-tour="sheet-actions"
      >
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          data-tour="btn-payment"
          variant={subSheet === "payment" ? "default" : "outline"}
          onClick={() =>
            setSubSheet(subSheet === "payment" ? null : "payment")
          }
        >
          <DollarSign size={13} />
          Payment
        </Button>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          data-tour="btn-attach-jo"
          variant={subSheet === "attach-jo" ? "default" : "outline"}
          onClick={() =>
            setSubSheet(subSheet === "attach-jo" ? null : "attach-jo")
          }
        >
          <Plus size={13} />
          Attach JO
        </Button>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          data-tour="btn-statement"
          variant={subSheet === "statement" ? "default" : "outline"}
          onClick={() =>
            setSubSheet(subSheet === "statement" ? null : "statement")
          }
        >
          <FileText size={13} />
          Statement
        </Button>
        <Button size="sm" className="gap-1.5 h-8 text-xs" variant="outline" disabled>
          <Pencil size={13} />
          Edit
        </Button>
      </div>
      <div
        className={`grid gap-1.5 ${isCompressed ? "grid-cols-1" : "grid-cols-3"}`}
        data-tour="sheet-automation"
      >
        <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs" disabled>
          <Percent size={13} />
          Apply Interest
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs" disabled>
          <Send size={13} />
          Send Reminders
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs" disabled>
          <FileText size={13} />
          Auto-Generate SOA
        </Button>
      </div>
    </div>
  );

  // ─── Ledger ─────────────────────────────────────────────────────────────

  const ledgerSection = (
    <div data-tour="sheet-ledger">
      <div className="flex items-center gap-1 mb-2">
        <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider">
          Transaction Ledger
        </h3>
        <HelpTip text="Complete history of all charges, payments, and adjustments on this account." />
      </div>
      <div className="border rounded-lg overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-[11px] font-semibold">Date</TableHead>
              <TableHead className="text-[11px] font-semibold">Type</TableHead>
              <TableHead className="text-[11px] font-semibold">Description</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Charges</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Payments</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Running Bal.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_LEDGER.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs whitespace-nowrap py-1.5">
                  {format(new Date(entry.date), "MMM d")}
                </TableCell>
                <TableCell className="py-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize px-1.5 py-0 ${ledgerTypeBadge[entry.type] ?? ""}`}
                  >
                    {entry.type}
                  </Badge>
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
    </div>
  );

  // ─── Collapsible: Job Orders ────────────────────────────────────────────

  const jobOrdersSection = (
    <div data-tour="sheet-jo-section">
      <Collapsible open={jobOrdersOpen} onOpenChange={setJobOrdersOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <ReceiptText size={13} />
            Attached Job Orders ({joLineItems.length})
          </span>
          {jobOrdersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">JO #</TableHead>
                  <TableHead className="text-[11px] font-semibold">Branch</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Paid</TableHead>
                  <TableHead className="text-[11px] font-semibold">Status</TableHead>
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
                          className={`text-[10px] px-1.5 py-0 ${fullyPaid
                              ? "bg-green-100 text-green-700 border-green-200"
                              : paid > 0
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }`}
                        >
                          {fullyPaid ? "Paid" : paid > 0 ? "Partial" : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Collapsible: Payments ──────────────────────────────────────────────

  const recentPaymentsSection = (
    <div data-tour="sheet-payments-section">
      <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <DollarSign size={13} />
            Payments ({DEMO_PAYMENTS.length})
          </span>
          {paymentsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">Date</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-[11px] font-semibold">Method</TableHead>
                  <TableHead className="text-[11px] font-semibold">Ref #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_PAYMENTS.map((p) => (
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Collapsible: Statements ────────────────────────────────────────────

  const draftCount = DEMO_STATEMENTS.filter(s => s.status === "draft").length;
  const readyToSendCount = DEMO_STATEMENTS.filter(s => s.status === "finalized").length;

  const recentStatementsSection = (
    <div data-tour="sheet-statements-section">
      <Collapsible open={statementsOpen} onOpenChange={setStatementsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <FileText size={13} />
            Statements ({DEMO_STATEMENTS.length})
            {draftCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-[9px] px-1.5 py-0 rounded-full font-semibold normal-case">
                {draftCount} draft
              </span>
            )}
            {readyToSendCount > 0 && (
              <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[9px] px-1.5 py-0 rounded-full font-semibold normal-case">
                {readyToSendCount} ready to send
              </span>
            )}
          </span>
          {statementsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-lg overflow-auto max-h-[250px] mb-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-[11px] font-semibold">SOA #</TableHead>
                  <TableHead className="text-[11px] font-semibold">Period</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Interest</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Balance</TableHead>
                  <TableHead className="text-[11px] font-semibold">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_STATEMENTS.map((s) => (
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
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize px-1.5 py-0 ${statementStatusBadge[s.status] ?? ""}`}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1 items-center">
                        {s.status === "finalized" && (
                          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-green-600" disabled>
                            Send
                          </Button>
                        )}
                        {s.status === "sent" && (
                          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-muted-foreground" disabled>
                            Resend
                          </Button>
                        )}
                        {(s.status === "finalized" || s.status === "sent") && (
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground" disabled>
                            <Download size={11} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Interest Logs Section ────────────────────────────────────────────

  const interestLogsSection = (
    <div data-tour="sheet-interest-section">
      <Collapsible open={interestLogsOpen} onOpenChange={setInterestLogsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <Percent size={13} />
            Interest History ({DEMO_INTEREST_LOGS.length})
          </span>
          {interestLogsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
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
                {DEMO_INTEREST_LOGS.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono py-1.5">{log.billing_cycle}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(log.applied_at), "MMM d, yy")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums py-1.5">{amt(log.overdue_balance)}</TableCell>
                    <TableCell className="text-xs text-right py-1.5">{log.rate}%</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium text-amber-600 py-1.5">
                      {amt(log.interest_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Email Logs Section ───────────────────────────────────────────────

  const emailStatusIcon: Record<string, JSX.Element> = {
    sent: <CheckCircle2 size={12} className="text-green-600" />,
    failed: <XCircle size={12} className="text-red-500" />,
    pending: <Clock size={12} className="text-yellow-500" />,
  };

  const emailLogsSection = (
    <div data-tour="sheet-email-section">
      <Collapsible open={emailLogsOpen} onOpenChange={setEmailLogsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <Mail size={13} />
            Email History ({DEMO_EMAIL_LOGS.length})
          </span>
          {emailLogsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
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
                {DEMO_EMAIL_LOGS.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap py-1.5">
                      {format(new Date(log.created_at), "MMM d, yy")}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                        {log.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px] py-1.5">
                      {log.recipient}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="flex items-center gap-1 text-xs capitalize">
                        {emailStatusIcon[log.status] ?? null}
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Sub-sheet content ──────────────────────────────────────────────────

  const subSheetTitle: Record<string, string> = {
    payment: "Record Payment",
    "attach-jo": "Attach Job Orders",
    statement: "Generate Statement",
  };

  const subSheetContent = subSheet && (
    <div className="flex flex-col h-full" data-tour="sub-sheet-content">
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-gray-50/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => setSubSheet(null)}
        >
          <ArrowLeft size={16} />
        </Button>
        <h3 className="text-sm font-semibold flex-1">
          {subSheetTitle[subSheet]}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {subSheet === "attach-jo" && <MockAttachJoPanel />}
        {subSheet === "payment" && <MockPaymentPanel />}
        {subSheet === "statement" && <MockStatementPanel />}
      </div>
    </div>
  );

  // ─── Main sheet layout ──────────────────────────────────────────────────

  const shouldStack = isCompressed && typeof window !== "undefined" && window.innerWidth < 1024;

  const mainContent = (
    <div
      className={`flex flex-col h-full transition-all duration-300 ease-in-out ${shouldStack && isCompressed ? "hidden" : ""
        }`}
      style={{
        width: isCompressed && !shouldStack ? "300px" : "100%",
        minWidth: isCompressed && !shouldStack ? "300px" : undefined,
      }}
    >
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {headerSection}
        <Separator />
        {balanceSummary}
        <Separator />
        {actionButtons}
        {!isCompressed && (
          <>
            <Separator />
            {ledgerSection}
            <Separator />
            {jobOrdersSection}
            {recentPaymentsSection}
            {recentStatementsSection}
            {interestLogsSection}
            {emailLogsSection}
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
              Interest: {acct.interest_rate}% monthly &middot; Cutoff: Day{" "}
              {acct.billing_cutoff_day} &middot; Created{" "}
              {format(new Date(acct.created_at), "MMM d, yyyy")}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {mainContent}
      {isCompressed && (
        <div
          className={`border-l bg-white flex-1 transition-all duration-300 ease-in-out overflow-hidden ${shouldStack ? "absolute inset-0 border-l-0" : ""
            }`}
        >
          {subSheetContent}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Sub-Sheet Panels
// ═══════════════════════════════════════════════════════════════════════════════

function MockAttachJoPanel() {
  return (
    <div>
      {/* Search */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">Search Job Orders</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input disabled placeholder="Search JO number, description..." className="pl-9" />
        </div>
      </div>

      {/* Available JOs */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Available Job Orders</h2>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {DEMO_JOB_ORDERS.map((jo, i) => {
            const isSelected = i === 0;
            return (
              <div
                key={jo.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-gray-100 hover:bg-muted/50"
                }`}
              >
                <div className={`w-4 h-4 rounded border mt-0.5 ${isSelected ? "border-primary bg-primary" : "border-gray-300"}`}>
                  {isSelected && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold">{jo.order_no}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{jo.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{jo.branches.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{jo.labor_description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>Total: {amt(jo.grand_total)}</span>
                    <span className="font-bold text-foreground">Balance: {amt(jo.remaining)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="border-b py-2 mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">1 selected</span>
          <span className="font-semibold">Total: {amt(5500)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button disabled>Transfer</Button>
        <Button variant="ghost" disabled>Cancel</Button>
      </div>
    </div>
  );
}

function MockPaymentPanel() {
  return (
    <form>
      {/* Payment Details */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">Payment Details</h2>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Amount *</p>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-1">₱</span>
              <Input disabled value="5,500.00" className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0" />
            </div>
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Date</p>
            <Input disabled value="2026-03-10" type="date" className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0" />
          </div>
        </div>
      </div>

      {/* Method & Reference */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Method & Reference</h2>
        <div className="border-b py-2">
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Payment Method</p>
            <span className="text-sm">Cash</span>
          </div>
        </div>
        <div className="border-b py-2">
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Reference #</p>
            <span className="text-sm text-muted-foreground">Optional</span>
          </div>
        </div>
      </div>

      {/* Allocation */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Allocation</h2>
        <div className="border-b py-2">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="default" className="text-xs h-7" disabled>
              Apply to balance
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs h-7" disabled>
              Specific items
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Payment auto-allocates to the oldest unpaid charges first (FIFO). Switch to "Specific items" to manually choose which line items to pay.
          </p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Notes</h2>
        <Input disabled value="Full payment for LCD Screen Replacement" className="text-sm" />
      </div>

      {/* Actions */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button disabled>Record Payment</Button>
        <Button variant="ghost" disabled>Cancel</Button>
      </div>
    </form>
  );
}

function MockStatementPanel() {
  const stmt = DEMO_STATEMENTS[1];
  return (
    <form>
      {/* Statement Period */}
      <div>
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">Statement Period</h2>
        <p className="text-[11px] text-muted-foreground mb-2">
          Dates are auto-calculated based on billing cutoff day (15) and the last generated statement.
        </p>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Period Start *</p>
            <Input disabled value={stmt.period_start} type="date" className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0" />
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Period End *</p>
            <Input disabled value={stmt.period_end} type="date" className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">Filters</h2>
        <div className="border-b py-2">
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Branch</p>
            <span className="text-sm">All Branches</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 bg-gray-50 rounded-lg border p-4 space-y-2.5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Statement Preview</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Previous Balance</span>
          <span className="tabular-nums font-medium">{amt(stmt.previous_balance)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">New Charges</span>
          <span className="tabular-nums">+{amt(stmt.new_charges)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payments Received</span>
          <span className="tabular-nums text-green-600">-{amt(stmt.payments_received)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-amber-600">Interest Applied</span>
          <span className="tabular-nums text-amber-600">+{amt(stmt.interest_applied)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Current Balance</span>
          <span className="tabular-nums">{amt(stmt.current_balance)}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        After generating, finalize the statement, download as PDF, or email it with the PDF attached.
        Statements are also auto-generated monthly on the 2nd of each month.
      </p>

      {/* Actions */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4">
        <Button disabled>Generate Statement</Button>
        <Button variant="ghost" disabled>Cancel</Button>
      </div>
    </form>
  );
}
