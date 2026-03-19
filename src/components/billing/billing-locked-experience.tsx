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
  CreditCard,
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
  DEMO_STATEMENT,
} from "./billing-demo-data";
import { formatNumberWithCommas } from "../../lib/helpers";

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
          professional statements — all in one place. Take an interactive tour
          to see how it works with sample data.
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

  // Start tour after mount so DOM has rendered
  useEffect(() => {
    const t = setTimeout(() => setRunTour(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Tour steps — targets are CSS selectors on the live mock UI
  const steps: Step[] = [
    // ── Phase 1: Accounts list ──
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
    // ── Phase 2: Sheet (these targets only exist once sheet is open) ──
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
      title: "Balance & Aging",
      content:
        "See the total unpaid balance, credit limit usage bar, and aging breakdown — how old the unpaid amounts are.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-actions']",
      title: "Quick Actions",
      content:
        "These buttons let you record payments, attach job orders, generate statements, edit account settings, and apply interest — all from one place.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-ledger']",
      title: "Transaction Ledger",
      content:
        "The full transaction history — every charge, payment, and interest entry with a running balance. This is the source of truth for the account.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-jo-section']",
      title: "Attached Job Orders",
      content:
        "Collapsible section showing all job orders transferred to this billing account, with their paid/unpaid status.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-payments-section']",
      title: "Payments History",
      content:
        "All recorded payments with date, amount, method, and reference number. Payments are automatically allocated to the oldest charges (FIFO).",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='sheet-statements-section']",
      title: "Statements (SOA)",
      content:
        "Generated statements with period, balance, and status. Draft statements can be finalized and sent to the client.",
      placement: "left",
      disableBeacon: true,
    },
    // ── Phase 3: Sub-sheet previews ──
    {
      target: "[data-tour='btn-attach-jo']",
      title: "Attach Job Orders",
      content:
        "Click this to open the job order attachment panel. It shows all eligible JOs for this client — select them to transfer their remaining balances to the billing account.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Job Order Transfer",
      content:
        "Here you can see eligible job orders with their remaining balances. Select one or more, then transfer — the balance moves from the JO to the billing account.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='btn-payment']",
      title: "Record Payment",
      content:
        "Click to open the payment panel. Enter amount, method, and reference number. Payments auto-allocate to the oldest charges via FIFO, or you can manually allocate.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Payment Recording",
      content:
        "Fill in the payment details. The system shows which charges the payment will be applied to. Once confirmed, the balance updates instantly.",
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='btn-statement']",
      title: "Generate Statement",
      content:
        "Click to generate a Statement of Account (SOA). Select a billing period, preview the breakdown, then finalize and send to the client.",
      placement: "left",
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: "[data-tour='sub-sheet-content']",
      title: "Statement Preview",
      content:
        "The statement shows previous balance, new charges, payments, interest, and current balance. Finalize it, then download as PDF or email to the client.",
      placement: "left",
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;

      // Tour finished
      if (status === STATUS.FINISHED) {
        setRunTour(false);
        onFinish();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;

        // Step 1 → 2: open the sheet when moving to step index 2
        if (nextIndex === 2 && !sheetOpen) {
          setSheetOpen(true);
          setSubSheet(null);
          setJobOrdersOpen(false);
          setPaymentsOpen(false);
          setStatementsOpen(true);
          // Delay so the sheet animates open and DOM is ready
          setTimeout(() => setStepIndex(nextIndex), 500);
          return;
        }

        // Going back from sheet to list — close sheet
        if (nextIndex <= 1 && sheetOpen) {
          setSheetOpen(false);
          setSubSheet(null);
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Step 6: open job orders collapsible
        if (nextIndex === 6) {
          setJobOrdersOpen(true);
        }
        // Step 7: open payments collapsible
        if (nextIndex === 7) {
          setPaymentsOpen(true);
        }

        // Step 9 → 10: open attach-jo sub-sheet
        if (nextIndex === 10) {
          setSubSheet("attach-jo");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Step 11 → 12: switch to payment sub-sheet
        if (nextIndex === 12) {
          setSubSheet("payment");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Step 13 → 14: switch to statement sub-sheet
        if (nextIndex === 14) {
          setSubSheet("statement");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        // Going back through sub-sheets
        if (nextIndex === 9 && subSheet) {
          setSubSheet(null);
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
        if (nextIndex === 11 && subSheet !== "attach-jo") {
          setSubSheet("attach-jo");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }
        if (nextIndex === 13 && subSheet !== "payment") {
          setSubSheet("payment");
          setTimeout(() => setStepIndex(nextIndex), 400);
          return;
        }

        setStepIndex(nextIndex);
      }
    },
    [onFinish, sheetOpen, subSheet]
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
            />
          </SheetContent>
        </Sheet>
      </div>
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
                className={`cursor-pointer transition-colors ${
                  i === 0
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-gray-50"
                }`}
                onClick={i === 0 ? onOpenAccount : undefined}
              >
                <TableCell className="font-mono text-sm">
                  {account.account_number}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {account.clients?.name || "—"}
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
}: {
  subSheet: string | null;
  setSubSheet: (s: string | null) => void;
  jobOrdersOpen: boolean;
  setJobOrdersOpen: (v: boolean) => void;
  paymentsOpen: boolean;
  setPaymentsOpen: (v: boolean) => void;
  statementsOpen: boolean;
  setStatementsOpen: (v: boolean) => void;
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
          <p className="text-[11px] text-red-500 mt-0.5">
            {amt(totalOverdue)} overdue
          </p>
        )}
      </div>

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
                className={`text-xs font-semibold tabular-nums ${
                  bucket.value > 0 && bucket.warn ? "text-red-600" : ""
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
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 h-8 text-xs col-span-full"
        disabled
      >
        <Percent size={13} />
        Apply Interest
      </Button>
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
                          className={`text-[10px] px-1.5 py-0 ${
                            fullyPaid
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

  const recentStatementsSection = (
    <div data-tour="sheet-statements-section">
      <Collapsible open={statementsOpen} onOpenChange={setStatementsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-bold opacity-50 uppercase tracking-wider hover:opacity-80 transition-opacity">
          <span className="flex items-center gap-1.5">
            <FileText size={13} />
            Statements (1)
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
                  <TableHead className="text-[11px] font-semibold text-right">Balance</TableHead>
                  <TableHead className="text-[11px] font-semibold">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs font-mono py-1.5">
                    {DEMO_STATEMENT.statement_number}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap py-1.5">
                    {format(new Date(DEMO_STATEMENT.period_start), "MMM d")} -{" "}
                    {format(new Date(DEMO_STATEMENT.period_end), "MMM d")}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium py-1.5">
                    {amt(DEMO_STATEMENT.current_balance)}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize px-1.5 py-0 ${statementStatusBadge[DEMO_STATEMENT.status] ?? ""}`}
                    >
                      {DEMO_STATEMENT.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px]"
                      disabled
                    >
                      Finalize
                    </Button>
                  </TableCell>
                </TableRow>
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
      className={`flex flex-col h-full transition-all duration-300 ease-in-out ${
        shouldStack && isCompressed ? "hidden" : ""
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
          className={`border-l bg-white flex-1 transition-all duration-300 ease-in-out overflow-hidden ${
            shouldStack ? "absolute inset-0 border-l-0" : ""
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
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Select job orders to transfer their remaining balance to this billing
        account.
      </p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-[11px] font-semibold">JO #</TableHead>
              <TableHead className="text-[11px] font-semibold">Description</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">
                Remaining
              </TableHead>
              <TableHead className="text-[11px] font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_JOB_ORDERS.map((jo) => (
              <TableRow key={jo.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="w-4 h-4 rounded border border-gray-300" />
                </TableCell>
                <TableCell className="text-xs font-mono">{jo.order_no}</TableCell>
                <TableCell className="text-xs">{jo.labor_description}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-medium">
                  {amt(jo.remaining)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {jo.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button className="w-full" disabled>
        Transfer Selected
      </Button>
    </div>
  );
}

function MockPaymentPanel() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Amount</label>
          <Input
            disabled
            value="5,500.00"
            className="mt-1 tabular-nums"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">
              Payment Date
            </label>
            <Input disabled value="2026-03-10" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              Method
            </label>
            <Input disabled value="Cash" className="mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">
            Reference #
          </label>
          <Input disabled placeholder="Optional" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Notes</label>
          <Input
            disabled
            value="Full payment for LCD Screen Replacement"
            className="mt-1"
          />
        </div>
      </div>
      <Separator />
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          Allocation Preview (FIFO)
        </p>
        <div className="bg-gray-50 rounded-md border p-3 text-sm flex items-center justify-between">
          <span className="text-gray-600">JO DEMO-101 — LCD Screen Replacement</span>
          <span className="font-medium tabular-nums">{amt(5500)}</span>
        </div>
      </div>
      <Button className="w-full" disabled>
        Record Payment
      </Button>
    </div>
  );
}

function MockStatementPanel() {
  const stmt = DEMO_STATEMENT;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">
            Period Start
          </label>
          <Input disabled value={stmt.period_start} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">
            Period End
          </label>
          <Input disabled value={stmt.period_end} className="mt-1" />
        </div>
      </div>
      <Separator />
      <div className="bg-gray-50 rounded-lg border p-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Previous Balance</span>
          <span className="tabular-nums font-medium">{amt(stmt.previous_balance)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">New Charges</span>
          <span className="tabular-nums text-red-600">+{amt(stmt.new_charges)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payments Received</span>
          <span className="tabular-nums text-green-600">
            -{amt(stmt.payments_received)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Interest Applied</span>
          <span className="tabular-nums text-amber-600">
            +{amt(stmt.interest_applied)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Current Balance</span>
          <span className="tabular-nums">{amt(stmt.current_balance)}</span>
        </div>
      </div>
      <Button className="w-full" disabled>
        Generate Statement
      </Button>
    </div>
  );
}
