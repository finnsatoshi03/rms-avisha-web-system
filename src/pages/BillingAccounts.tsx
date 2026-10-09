import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, Filter, Download, X, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";

import HeaderText from "../components/ui/headerText";
import PageSkeleton from "../components/ui/page-skeleton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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

import {
  useBillingAccounts,
  useBillingAccountTotals,
} from "../components/billing/useBilling";
import { useUser } from "../components/auth/useUser";
import {
  BillingAccount,
  BillingAccountStatus,
  BillingLineItem,
  BillingPayment,
  BillingStatement,
} from "../lib/billing-types";
import { formatNumberWithCommas } from "../lib/helpers";
import { getClientDisplayName } from "../lib/client-hierarchy";
import BillingAccountFormSheet from "../components/billing/billing-account-form";
import BillingAccountSheetContent from "../components/billing/billing-account-sheet";
import { replayBillingIntro } from "../components/billing/billing-intro-gate";
import type { BillingStatementPDFData } from "../components/billing/billing-statement-pdf";
import { getServerNow } from "../lib/server-time";
import { TooltipProvider } from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import {
  DensityToggle,
  TruncatedText,
  dataTableClass,
  dataTableHeaderRowClass,
  dataTableRowClass,
  numericCellClass,
  rowAccentClass,
  useDataTableRef,
  useDensity,
} from "../components/table/data-table-kit";
import { PaginationControls } from "../components/table/pagination-controls";

// Billing has no checkbox column: account no. pins at the left edge, name next to it.
const accountPin = "sticky left-0 z-[1] bg-inherit w-36 min-w-36 max-w-36";
const namePin =
  "sticky left-36 z-[1] bg-inherit w-72 min-w-72 max-w-72 transition-shadow group-data-[scrolled=true]/table:shadow-[inset_-1px_0_0_hsl(var(--border)),6px_0_8px_-6px_rgb(0_0_0/0.15)]";

const statusVariant: Record<BillingAccountStatus, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  suspended: "bg-amber-50 text-amber-800 border-amber-200",
  closed: "bg-stone-100 text-stone-600 border-stone-200",
};

export default function BillingAccounts() {
  const navigate = useNavigate();
  const { id: urlAccountId } = useParams<{ id?: string }>();
  const { isDev, isAdmin, isManager } = useUser();
  const { data: accounts, isLoading } = useBillingAccounts();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [density, changeDensity] = useDensity("billing-accounts-table-density");
  const tableRef = useDataTableRef();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [downloadingMockPdf, setDownloadingMockPdf] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );

  const canCreate = isDev || isAdmin || isManager;

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

  const allAccounts = useMemo(
    () => (accounts as BillingAccount[]) ?? [],
    [accounts]
  );
  const totals = useBillingAccountTotals(allAccounts.map((a) => a.id));

  // Who needs attention first: most overdue, then highest balance.
  const displayAccounts = useMemo(
    () =>
      [...filteredAccounts].sort(
        (a, b) =>
          (totals[b.id]?.overdue ?? 0) - (totals[a.id]?.overdue ?? 0) ||
          (totals[b.id]?.balance ?? 0) - (totals[a.id]?.balance ?? 0)
      ),
    [filteredAccounts, totals]
  );

  const mockPdfAccount =
    allAccounts.find((a) => a.id === selectedAccountId) ?? allAccounts[0];

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
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

  const handleDownloadMockStatementPDF = useCallback(async () => {
    if (downloadingMockPdf || !mockPdfAccount) return;
    setDownloadingMockPdf(true);

    const now = getServerNow();
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

  const totalPages = Math.ceil(displayAccounts.length / itemsPerPage);
  const pagedAccounts = displayAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="h-full">
      <div className="flex items-center gap-3">
        <HeaderText>Billing Accounts</HeaderText>
        {(isAdmin || isDev) && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={replayBillingIntro}
          >
            <PlayCircle size={16} />
            Watch intro video
          </Button>
        )}
      </div>
      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search client, account #, or phone"
            />
            <Search className="absolute left-3 top-2 opacity-60" size={14} />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm">
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
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={resetFilters}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}
          {canCreate && (
            <>
              <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />
              <button
                className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1"
                onClick={() => setCreateSheetOpen(true)}
              >
                <Plus size={18} />
                Add
              </button>
            </>
          )}
        </div>
        {isDev && mockPdfAccount && (
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
      </div>

      {allAccounts.length === 0 ? (
        <div className="w-full h-[50vh] flex flex-col gap-2 text-center items-center justify-center">
          <p>No billing accounts yet. Click Add to create one for a client.</p>
        </div>
      ) : displayAccounts.length === 0 ? (
        <div className="w-full h-[50vh] flex flex-col gap-2 text-center items-center justify-center">
          <p>No billing accounts match your filters.</p>
          <button
            className="px-2 py-0.5 text-sm bg-slate-100 rounded-lg"
            onClick={resetFilters}
          >
            Remove all filters
          </button>
        </div>
      ) : (
        <div className="h-[calc(100%-7.5rem)] flex flex-col justify-between">
          <TooltipProvider delayDuration={300}>
          <Table ref={tableRef} className={cn(dataTableClass, "min-w-[760px]")}>
            <TableHeader>
              <TableRow className={dataTableHeaderRowClass}>
                <TableHead className={accountPin}>Account No.</TableHead>
                <TableHead className={namePin}>Client Name</TableHead>
                <TableHead className="w-[18%] text-right">Owes</TableHead>
                <TableHead className="w-[18%] text-right">Overdue</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAccounts.map((account) => {
                const { balance, overdue } = totals[account.id] ?? {};
                return (
                  <TableRow
                    key={account.id}
                    className={dataTableRowClass(density)}
                    onClick={() => handleOpenAccount(account.id)}
                  >
                    <TableCell className={cn(accountPin, rowAccentClass, "font-mono")}>
                      {account.account_number}
                    </TableCell>
                    <TableCell className={cn(namePin, "font-bold text-black")}>
                      <TruncatedText text={getClientDisplayName(account.clients) || "—"} />
                    </TableCell>
                    <TableCell className={cn(numericCellClass, "font-bold text-black")}>
                      {balance === undefined
                        ? "…"
                        : `₱${formatNumberWithCommas(balance)}`}
                    </TableCell>
                    <TableCell
                      className={cn(numericCellClass, overdue && "font-bold text-red-600")}
                    >
                      {overdue === undefined
                        ? "…"
                        : overdue > 0
                          ? `₱${formatNumberWithCommas(overdue)}`
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusVariant[account.status] || ""}`}
                      >
                        {account.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TooltipProvider>
          <PaginationControls
            extra={<DensityToggle value={density} onChange={changeDensity} />}
            totalItems={displayAccounts.length}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            handleItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Create Account Sheet */}
      <Sheet
        open={createSheetOpen}
        onOpenChange={(open) => {
          setCreateSheetOpen(open);
        }}
      >
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">New Billing Account</SheetTitle>
            <Separator className="my-2" />
            <BillingAccountFormSheet
              onClose={() => {
                setCreateSheetOpen(false);
              }}
              onSuccess={(accountId) => {
                setCreateSheetOpen(false);
                handleOpenAccount(accountId);
              }}
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

    </div>
  );
}
