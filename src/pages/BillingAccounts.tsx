import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, ReceiptText, Filter } from "lucide-react";

import HeaderText from "../components/ui/headerText";
import Loader from "../components/ui/loader";
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
import { BillingAccount, BillingAccountStatus } from "../lib/billing-types";
import { formatNumberWithCommas } from "../lib/helpers";
import BillingAccountFormSheet from "../components/billing/billing-account-form";
import BillingAccountSheetContent from "../components/billing/billing-account-sheet";

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
        const clientName = account.clients?.name?.toLowerCase() || "";
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

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <HeaderText>Billing Accounts</HeaderText>
        {canCreate && (
          <Button
            onClick={() => setCreateSheetOpen(true)}
            className="gap-1.5"
            size="sm"
          >
            <Plus size={16} />
            Create Account
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="my-4 flex sm:flex-row flex-col sm:gap-3 gap-2">
        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
            placeholder="Search.."
          />
          <Search className="absolute left-3 top-2 opacity-60" size={14} />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-fit px-2 py-1 border border-gray-400 rounded-lg text-gray-700 text-sm">
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
      {filteredAccounts.length === 0 ? (
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
        <div className="flex-1 border rounded-lg overflow-auto">
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
              {filteredAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  className={`cursor-pointer transition-colors ${
                    selectedAccountId === account.id
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleOpenAccount(account.id)}
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
        {filteredAccounts.length} account
        {filteredAccounts.length !== 1 ? "s" : ""}
        {hasActiveFilters ? " (filtered)" : ""}
      </p>

      {/* Create Account Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">New Billing Account</SheetTitle>
            <Separator className="my-2" />
            <BillingAccountFormSheet
              onClose={() => setCreateSheetOpen(false)}
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
