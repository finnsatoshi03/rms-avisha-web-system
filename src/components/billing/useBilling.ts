import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBillingAccounts,
  getBillingAccount,
  getBillingAccountByClientId,
  createBillingAccount,
  updateBillingAccount,
  deleteBillingAccount,
  getBillingAccountBalance,
  getBillingAccountAging,
  getBillingLineItems,
  getBillingPayments,
  recordBillingPayment,
  getBillingStatements,
  generateBillingStatement,
  updateBillingStatement,
  transferJobOrderToBilling,
  transferRentalToBilling,
  applyAccountInterest,
  applyMonthlyInterest,
  getBillingDashboardSummary,
  getBillingLedger,
  getEligibleJobOrders,
  getEligibleRentals,
  getBillingInterestLogs,
  getEmailLogs,
  triggerSendBillingReminders,
  triggerApplyBillingInterest,
  triggerGenerateBillingStatements,
} from "../../services/apiBilling";
import { BillingStatementStatus, CreateBillingAccountData, RecordPaymentData } from "../../lib/billing-types";
import toast from "react-hot-toast";

// ========================
// Queries
// ========================

export function useBillingAccounts() {
  return useQuery({
    queryKey: ["billing_accounts"],
    queryFn: getBillingAccounts,
  });
}

export function useBillingAccount(id: string | undefined) {
  return useQuery({
    queryKey: ["billing_account", id],
    queryFn: () => getBillingAccount(id!),
    enabled: !!id,
  });
}

export function useBillingAccountByClient(clientId: number | undefined) {
  return useQuery({
    queryKey: ["billing_account_by_client", clientId],
    queryFn: () => getBillingAccountByClientId(clientId!),
    enabled: !!clientId,
  });
}

export function useBillingAccountBalance(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_balance", accountId],
    queryFn: () => getBillingAccountBalance(accountId!),
    enabled: !!accountId,
  });
}

export function useBillingAccountAging(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_aging", accountId],
    queryFn: () => getBillingAccountAging(accountId!),
    enabled: !!accountId,
  });
}

export function useBillingLineItems(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_line_items", accountId],
    queryFn: () => getBillingLineItems(accountId!),
    enabled: !!accountId,
  });
}

export function useBillingPayments(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_payments", accountId],
    queryFn: () => getBillingPayments(accountId!),
    enabled: !!accountId,
  });
}

export function useBillingStatements(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_statements", accountId],
    queryFn: () => getBillingStatements(accountId!),
    enabled: !!accountId,
  });
}

export function useBillingLedger(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_ledger", accountId],
    queryFn: () => getBillingLedger(accountId!),
    enabled: !!accountId,
  });
}

export function useEligibleJobOrders(clientId: number | undefined) {
  return useQuery({
    queryKey: ["eligible_jos_for_billing", clientId],
    queryFn: () => getEligibleJobOrders(clientId!),
    enabled: !!clientId,
  });
}

export function useEligibleRentals(clientId: number | undefined) {
  return useQuery({
    queryKey: ["eligible_rentals_for_billing", clientId],
    queryFn: () => getEligibleRentals(clientId!),
    enabled: !!clientId,
  });
}

export function useBillingDashboardSummary(branchId?: number) {
  return useQuery({
    queryKey: ["billing_dashboard_summary", branchId],
    queryFn: () => getBillingDashboardSummary(branchId),
  });
}

// ========================
// Mutations
// ========================

export function useCreateBillingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBillingAccountData) => createBillingAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      toast.success("Billing account created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBillingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateBillingAccountData> & { status?: string } }) =>
      updateBillingAccount(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing_account", data.id] });
      toast.success("Billing account updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBillingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBillingAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.removeQueries({ queryKey: ["billing_account", id] });
      toast.success("Billing account deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRecordBillingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentData) => recordBillingPayment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billing_payments", variables.billing_account_id] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance", variables.billing_account_id] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging", variables.billing_account_id] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger", variables.billing_account_id] });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items", variables.billing_account_id] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing_dashboard_summary"] });
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTransferJobOrderToBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ joId, accountId }: { joId: number; accountId: string }) =>
      transferJobOrderToBilling(joId, accountId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billing_line_items", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["eligible_jos_for_billing"] });
      queryClient.invalidateQueries({ queryKey: ["job_order"] });
      queryClient.invalidateQueries({ queryKey: ["billing_dashboard_summary"] });

      if (data?.warnings?.length > 0) {
        data.warnings.forEach((w: { message: string }) => {
          toast(w.message, { icon: "⚠️", duration: 5000 });
        });
      }
      toast.success(`Transferred ₱${Number(data.amount_transferred).toLocaleString()} to billing`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTransferRentalToBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rentalId, accountId }: { rentalId: number; accountId: string }) =>
      transferRentalToBilling(rentalId, accountId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billing_line_items", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["eligible_rentals_for_billing"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["billing_dashboard_summary"] });

      if (data?.warnings?.length > 0) {
        data.warnings.forEach((w: { message: string }) => {
          toast(w.message, { icon: "⚠️", duration: 5000 });
        });
      }
      toast.success(`Transferred ₱${Number(data.amount_transferred).toLocaleString()} to billing`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateBillingStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      periodStart,
      periodEnd,
      branchFilter,
    }: {
      accountId: string;
      periodStart: string;
      periodEnd: string;
      branchFilter?: number;
    }) => generateBillingStatement(accountId, periodStart, periodEnd, branchFilter),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["billing_statements", variables.accountId] });
      toast.success("Statement generated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBillingStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<{ status: BillingStatementStatus; sent_at: string }> }) =>
      updateBillingStatement(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing_statements"] });
      toast.success("Statement updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApplyAccountInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => applyAccountInterest(accountId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      if (data?.interest_applied > 0) {
        toast.success(`Interest of ₱${Number(data.interest_applied).toLocaleString()} applied`);
      } else {
        toast("No overdue balance to apply interest to", { icon: "ℹ️" });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApplyMonthlyInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => applyMonthlyInterest(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing_dashboard_summary"] });
      toast.success(`Interest applied to ${data.accounts_affected} account(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ========================
// Interest & Email Logs
// ========================

export function useBillingInterestLogs(accountId: string | undefined) {
  return useQuery({
    queryKey: ["billing_interest_logs", accountId],
    queryFn: () => getBillingInterestLogs(accountId!),
    enabled: !!accountId,
  });
}

export function useEmailLogs(accountId?: string) {
  return useQuery({
    queryKey: ["email_logs", accountId],
    queryFn: () => getEmailLogs(accountId),
  });
}

// ========================
// Manual Triggers
// ========================

export function useTriggerSendBillingReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerSendBillingReminders(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email_logs"] });
      toast.success(`Reminders sent to ${data.reminders_sent} account(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTriggerApplyBillingInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerApplyBillingInterest(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing_interest_logs"] });
      queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
      queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
      queryClient.invalidateQueries({ queryKey: ["billing_aging"] });
      queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["billing_dashboard_summary"] });
      toast.success(`Interest applied to ${data.accounts_affected} account(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTriggerGenerateStatements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerGenerateBillingStatements(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing_statements"] });
      queryClient.invalidateQueries({ queryKey: ["email_logs"] });
      toast.success(`${data.statements_generated} statement(s) generated & sent`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
