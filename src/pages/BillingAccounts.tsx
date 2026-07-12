import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, ReceiptText, Filter, Download } from "lucide-react";
import toast from "react-hot-toast";

import HeaderText from "../components/ui/headerText";
import PageSkeleton from "../components/ui/page-skeleton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { Separator } from "../components/ui/separator";

import { useBillingAccounts } from "../components/billing/useBilling";
import { useUser } from "../components/auth/useUser";
import {
  BillingAccount,
  BillingAccountStatus,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
} from "../lib/billing-types";
import { Client } from "../lib/types";
import { formatNumberWithCommas } from "../lib/helpers";
import { getClientDisplayName } from "../lib/client-hierarchy";
import BillingAccountFormSheet from "../components/billing/billing-account-form";
import BillingAccountSheetContent from "../components/billing/billing-account-sheet";
import type { BillingStatementPDFData } from "../components/billing/billing-statement-pdf";
import { useFeatureOnboarding } from "../components/onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../components/onboarding/feature-announcement-modal";
import GuidedTour from "../components/onboarding/guided-tour";
import TourReplayButton from "../components/onboarding/tour-replay-button";

const statusVariant: Record<BillingAccountStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  suspended: "bg-yellow-100 text-yellow-800 border-yellow-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const clientTypeBadge: Record<string, string> = {
  individual: "bg-blue-50 text-blue-700 border-blue-200",
  company: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function BillingAccounts() {
  const navigate = useNavigate();
  const { id: urlAccountId } = useParams<{ id?: string }>();
  const { isDev, isAdmin, isManager } = useUser();
  const { data: accounts, isLoading } = useBillingAccounts();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createTourReplay, setCreateTourReplay] = useState<(() => void) | null>(null);
  const [downloadingMockPdf, setDownloadingMockPdf] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  const canCreate = isDev || isAdmin || isManager;

  const {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  } = useFeatureOnboarding("billing_accounts");

  // Mock data shown during tour when no real accounts exist
  const mockCompanyClient: Client = {
    id: 0,
    name: "Sunshine Electronics Corp.",
    contact_number: "+63 912 345 6789",
    email: "billing@sunshine.com",
    type: "company",
    address: null,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const mockIndividualClient: Client = {
    id: 0,
    name: "Juan dela Cruz",
    contact_number: "+63 917 123 4567",
    email: "juan@email.com",
    type: "individual",
    address: null,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const MOCK_ACCOUNTS: BillingAccount[] = [
    {
      id: "mock-1",
      client_id: 0,
      account_number: "BA-01-001",
      status: "active",
      credit_limit: 50000,
      interest_rate: 2,
      billing_cutoff_day: 1,
      billing_contact_name: "Accounting Dept",
      billing_contact_email: "billing@sunshine.com",
      billing_contact_phone: "+63 912 345 6789",
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: mockCompanyClient,
    },
    {
      id: "mock-2",
      client_id: 0,
      account_number: "BA-01-002",
      status: "active",
      credit_limit: 25000,
      interest_rate: 2,
      billing_cutoff_day: 15,
      billing_contact_name: null,
      billing_contact_email: "juan@email.com",
      billing_contact_phone: "+63 917 123 4567",
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: mockIndividualClient,
    },
  ];

  // Deep link support — open sheet if URL has :id
  useEffect(() => {
    if (urlAccountId) {
      setSelectedAccountId(urlAccountId);
    }
  }, [urlAccountId]);

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];

    return (accounts as BillingAccount[]).filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientName = getClientDisplayName(account.clients, "").toLowerCase();
        const accountNumber = account.account_number?.toLowerCase() || "";
        const contactPhone =
          account.billing_contact_phone?.toLowerCase() ||
          account.clients?.contact_number?.toLowerCase() ||
          "";

        return (
          clientName.includes(term) ||
          accountNumber.includes(term) ||
          contactPhone.includes(term)
        );
      }

      return true;
    });
  }, [accounts, searchTerm, statusFilter]);

  const showMockData = showTour && filteredAccounts.length === 0;
  const displayAccounts = showMockData ? MOCK_ACCOUNTS : filteredAccounts;
  const allAccounts = (accounts as BillingAccount[]) ?? [];
  const selectedAccountForMockPdf =
    (selectedAccountId
      ? allAccounts.find((a) => a.id === selectedAccountId)
      : null) ??
    (selectedAccountId
      ? MOCK_ACCOUNTS.find((a) => a.id === selectedAccountId)
      : null);
  const mockPdfAccount =
    selectedAccountForMockPdf ??
    displayAccounts[0] ??
    allAccounts[0] ??
    MOCK_ACCOUNTS[0];

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  const handleOpenAccount = useCallback(
    (accountId: string) => {
      setSelectedAccountId(accountId);
      // Update URL without full navigation so deep links work
      navigate(`/billing/${accountId}`, { replace: true });
    },
    [navigate]
  );

  const handleCloseAccount = useCallback(() => {
    setSelectedAccountId(null);
    navigate("/billing", { replace: true });
  }, [navigate]);

  const handleCreateReplayReady = useCallback(
    (replay: (() => void) | null) => {
      setCreateTourReplay(() => replay);
    },
    []
  );

  const handleDownloadMockStatementPDF = useCallback(async () => {
    if (downloadingMockPdf || !mockPdfAccount) return;
    setDownloadingMockPdf(true);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const lineItems: BillingLineItem[] = [
      {
        id: "mock-li-1",
        billing_account_id: mockPdfAccount.id,
        job_order_id: 1,
        rental_id: null,
        branch_id: 1,
        type: "charge",
        description: "JO JO-01-001 - Printer Repair",
        amount: 4700,
        balance_at_time: 4700,
        due_date: dueDate.toISOString().slice(0, 10),
        created_by: null,
        created_at: now.toISOString(),
      },
    ];

    const payments: BillingPayment[] = [
      {
        id: "mock-pay-1",
        billing_account_id: mockPdfAccount.id,
        amount: 3500,
        payment_date: now.toISOString().slice(0, 10),
        payment_method: "gcash",
        reference_number: "MOCK-3500",
        notes: null,
        created_by: null,
        created_at: now.toISOString(),
      },
    ];

    const statement: BillingStatement = {
      id: "mock-stmt-dev",
      billing_account_id: mockPdfAccount.id,
      statement_number: `SOA-MOCK-${now
        .toISOString()
        .replace(/[-:]/g, "")
        .slice(0, 13)}`,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: now.toISOString().slice(0, 10),
      previous_balance: 0,
      new_charges: 4700,
      payments_received: 3500,
      interest_applied: 0,
      current_balance: 1200,
      due_date: dueDate.toISOString().slice(0, 10),
      branch_filter: null,
      status: "finalized",
      generated_by: null,
      generated_at: now.toISOString(),
      sent_at: null,
      pdf_url: null,
    };

    const pdfData: BillingStatementPDFData = {
      statement,
      accountNumber: mockPdfAccount.account_number,
      clientName: getClientDisplayName(mockPdfAccount.clients, "") || "Mock Client",
      clientContact:
        mockPdfAccount.billing_contact_phone ??
        mockPdfAccount.clients?.contact_number ??
        null,
      clientEmail:
        mockPdfAccount.billing_contact_email ??
        mockPdfAccount.clients?.email ??
        null,
      interestRate: mockPdfAccount.interest_rate ?? 2,
      lineItems,
      payments,
    };

    try {
      const [{ pdf }, { default: BillingStatementPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/billing/billing-statement-pdf"),
      ]);
      const blob = await pdf(<BillingStatementPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${statement.statement_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Mock statement PDF downloaded");
    } catch (err) {
      toast.error("Failed to generate mock statement PDF");
      console.error(err);
    } finally {
      setDownloadingMockPdf(false);
    }
  }, [downloadingMockPdf, mockPdfAccount]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeaderText>Billing Accounts</HeaderText>
          <TourReplayButton onClick={replayTour} label="How billing works" />
        </div>
        <div className="flex items-center gap-2">
          {isDev && (
            <Button
              variant="outline"
              onClick={handleDownloadMockStatementPDF}
              disabled={downloadingMockPdf}
              className="gap-1.5"
              size="sm"
            >
              <Download size={14} />
              {downloadingMockPdf ? "Generating Mock PDF..." : "Mock SOA PDF"}
            </Button>
          )}
          {canCreate && (
            <Button
              data-tour="billing-create"
              onClick={() => setCreateSheetOpen(true)}
              className="gap-1.5"
              size="sm"
            >
              <Plus size={16} />
              Create Account
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="my-4 flex sm:flex-row flex-col sm:gap-3 gap-2">
        <div className="relative" data-tour="billing-search">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
            placeholder="Search.."
          />
          <Search className="absolute left-3 top-2 opacity-60" size={14} />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-tour="billing-status-filter" className="w-[150px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm">
            <Filter size={14} className="mr-1 opacity-60" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg text-sm"
            onClick={resetFilters}
          >
            Reset filters
          </Button>
        )}
      </div>

      {/* Table */}
      {displayAccounts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <ReceiptText
            size={48}
            strokeWidth={1}
            className="mb-3 opacity-40"
          />
          <p className="text-sm">
            {hasActiveFilters
              ? "No billing accounts match your filters."
              : "No billing accounts yet."}
          </p>
          {!hasActiveFilters && canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setCreateSheetOpen(true)}
            >
              <Plus size={14} />
              Create your first account
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 border rounded-lg overflow-auto" data-tour="billing-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-semibold">
                  Account #
                </TableHead>
                <TableHead className="text-xs font-semibold">Client</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Credit Limit
                </TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">
                  Contact
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  className={`cursor-pointer transition-colors ${selectedAccountId === account.id
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-gray-50"
                    }`}
                  onClick={() => !showMockData && handleOpenAccount(account.id)}
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
                      ? `₱${formatNumberWithCommas(account.credit_limit)}`
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
                    {account.billing_contact_phone ||
                      account.clients?.contact_number ||
                      "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {account.created_at
                      ? new Date(account.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {showMockData ? "Demo data shown during tour" : `${filteredAccounts.length} account${filteredAccounts.length !== 1 ? "s" : ""}${hasActiveFilters ? " (filtered)" : ""}`}
      </p>

      {/* Create Account Sheet */}
      <Sheet
        open={createSheetOpen}
        onOpenChange={(open) => {
          setCreateSheetOpen(open);
          if (!open) setCreateTourReplay(null);
        }}
      >
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold flex items-center gap-2">
              <span>New Billing Account</span>
              {createTourReplay && (
                <TourReplayButton
                  onClick={createTourReplay}
                  label="How to create an account"
                />
              )}
            </SheetTitle>
            <Separator className="my-2" />
            <BillingAccountFormSheet
              onClose={() => {
                setCreateSheetOpen(false);
                setCreateTourReplay(null);
              }}
              onSuccess={(accountId) => {
                setCreateSheetOpen(false);
                setCreateTourReplay(null);
                handleOpenAccount(accountId);
              }}
              onReplayReady={handleCreateReplayReady}
            />
          </SheetHeader>
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>

      {/* Account Detail Sheet */}
      <Sheet
        open={!!selectedAccountId}
        onOpenChange={(open) => {
          if (!open) handleCloseAccount();
        }}
      >
        <SheetContent className="min-w-[55vw] p-0 overflow-hidden">
          <SheetTitle className="sr-only">Billing Account Detail</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage billing account
          </SheetDescription>
          {selectedAccountId && (
            <BillingAccountSheetContent
              accountId={selectedAccountId}
              onClose={handleCloseAccount}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Onboarding Tour */}
      <FeatureAnnouncementModal
        open={showAnnouncement}
        onboarding={onboardingData}
        onStartTour={startTour}
      />
      <GuidedTour
        featureKey="billing_accounts"
        active={showTour}
        onComplete={completeTour}
      />
    </div>
  );
}
