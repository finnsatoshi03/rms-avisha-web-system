import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";

import { Client } from "../../lib/types";
import { CreateBillingAccountData } from "../../lib/billing-types";
import {
  useBillingAccountByClient,
  useCreateBillingAccount,
  useUpdateBillingAccount,
  useBillingAccount,
} from "./useBilling";
import ClientAutoSuggest from "../job-order/client-auto-suggest";
import { useClientChildren } from "../clients/useClients";
import { getClient } from "../../services/apiClients";
import { getClientDisplayName } from "../../lib/client-hierarchy";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import PhoneInput from "../ui/phone-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Label } from "../ui/label";
import { useFeatureOnboarding } from "../onboarding/useFeatureOnboarding";
import FeatureAnnouncementModal from "../onboarding/feature-announcement-modal";
import GuidedTour from "../onboarding/guided-tour";
import { getServerNow } from "../../lib/server-time";

const CUTOFF_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

interface BillingAccountFormSheetProps {
  accountId?: string;
  onClose: () => void;
  onSuccess: (accountId: string) => void;
  onReplayReady?: (replay: (() => void) | null) => void;
}

export default function BillingAccountFormSheet({
  accountId,
  onClose,
  onSuccess,
  onReplayReady,
}: BillingAccountFormSheetProps) {
  const isEditMode = !!accountId;

  const { data: existingAccount } = useBillingAccount(accountId);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSubClientId, setSelectedSubClientId] = useState<string>("none");
  const [creditLimit, setCreditLimit] = useState<string>("0");
  const [billingCutoffDay, setBillingCutoffDay] = useState<string>("1");
  const [interestRate, setInterestRate] = useState<string>("0.00");
  const [billingContactName, setBillingContactName] = useState("");
  const [billingContactEmail, setBillingContactEmail] = useState("");
  const [billingContactPhone, setBillingContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const isParentSelection = selectedClient?.parent_client_id == null;
  const selectedParentId = isParentSelection ? selectedClient?.id : null;
  const { children: childClients } = useClientChildren(selectedParentId);
  const selectedSubClient =
    selectedSubClientId !== "none"
      ? childClients.find((child) => String(child.id) === selectedSubClientId) || null
      : null;
  const effectiveBillingClient = selectedSubClient || selectedClient;

  const { data: existingClientAccount } = useBillingAccountByClient(
    !isEditMode ? effectiveBillingClient?.id : undefined
  );

  const createMutation = useCreateBillingAccount();
  const updateMutation = useUpdateBillingAccount();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  } = useFeatureOnboarding("billing_account_create");

  useEffect(() => {
    if (isEditMode) {
      onReplayReady?.(null);
      return;
    }

    onReplayReady?.(replayTour);
    return () => onReplayReady?.(null);
  }, [isEditMode, replayTour, onReplayReady]);

  useEffect(() => {
    if (isEditMode && existingAccount) {
      setCreditLimit(String(existingAccount.credit_limit ?? 0));
      setBillingCutoffDay(String(existingAccount.billing_cutoff_day ?? 1));
      setInterestRate(String(existingAccount.interest_rate ?? 0.0));
      setBillingContactName(existingAccount.billing_contact_name ?? "");
      setBillingContactEmail(existingAccount.billing_contact_email ?? "");
      setBillingContactPhone(existingAccount.billing_contact_phone ?? "");
      setNotes(existingAccount.notes ?? "");
      if (existingAccount.clients) {
        if (
          existingAccount.clients.parent_client_id != null &&
          existingAccount.clients.parent_client
        ) {
          setSelectedClient(existingAccount.clients.parent_client as Client);
          setSelectedSubClientId(String(existingAccount.clients.id));
        } else {
          setSelectedClient(existingAccount.clients);
          setSelectedSubClientId("none");
        }
      }
    }
  }, [isEditMode, existingAccount]);

  const clientHasExistingAccount =
    !isEditMode && existingClientAccount && effectiveBillingClient;

  const parseInterestRate = (value: string): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  useEffect(() => {
    if (isEditMode || !effectiveBillingClient) return;
    setBillingContactEmail(effectiveBillingClient.email || "");
    setBillingContactPhone(effectiveBillingClient.contact_number || "");
  }, [effectiveBillingClient, isEditMode]);

  const handleClientPick = async (client: Client) => {
    if (client.parent_client_id != null) {
      try {
        const parent = await getClient(String(client.parent_client_id));
        setSelectedClient(parent);
        setSelectedSubClientId(String(client.id));
      } catch {
        setSelectedClient(client);
        setSelectedSubClientId("none");
      }
      return;
    }

    setSelectedClient(client);
    setSelectedSubClientId("none");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode) {
      if (!effectiveBillingClient) return;

      const data: CreateBillingAccountData = {
        client_id: effectiveBillingClient.id,
        credit_limit: Number(creditLimit) || 0,
        interest_rate: parseInterestRate(interestRate),
        billing_cutoff_day: Number(billingCutoffDay),
        billing_contact_name: billingContactName || undefined,
        billing_contact_email: billingContactEmail || undefined,
        billing_contact_phone: billingContactPhone || undefined,
        notes: notes || undefined,
      };

      createMutation.mutate(data, {
        onSuccess: (newAccount) => {
          onSuccess(newAccount.id);
        },
      });
    } else {
      updateMutation.mutate(
        {
          id: accountId!,
          updates: {
            credit_limit: Number(creditLimit) || 0,
            interest_rate: parseInterestRate(interestRate),
            billing_cutoff_day: Number(billingCutoffDay),
            billing_contact_name: billingContactName || undefined,
            billing_contact_email: billingContactEmail || undefined,
            billing_contact_phone: billingContactPhone || undefined,
            notes: notes || undefined,
          },
        },
        {
          onSuccess: () => {
            onSuccess(accountId!);
          },
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Top pills ─ same as JO form ──────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <div className="px-3 py-1 bg-gray-200 rounded-full text-gray-600 text-xs w-fit flex items-center gap-1">
          <Clock size={12} strokeWidth={1.5} />
          {isEditMode && existingAccount
            ? new Date(existingAccount.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            : getServerNow().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
        </div>
        {isEditMode && existingAccount && (
          <div className="px-3 py-1 bg-red-200 rounded-full text-red-600 text-xs w-fit flex items-center gap-1">
            #{existingAccount.account_number}
          </div>
        )}
        {isEditMode && existingAccount && (
          <div
            className={`px-3 py-1 rounded-full text-xs w-fit flex items-center gap-1 ${existingAccount.status === "active"
              ? "bg-green-200 text-green-700"
              : existingAccount.status === "suspended"
                ? "bg-yellow-200 text-yellow-700"
                : "bg-gray-200 text-gray-600"
              }`}
          >
            {existingAccount.status}
          </div>
        )}
      </div>

      {/* ── Client name ─ same large bold as JO form ─────────────── */}
      {isEditMode ? (
        <div className="text-3xl font-bold mb-2">
          {getClientDisplayName(existingAccount?.clients) ?? "Unknown client"}
          {existingAccount?.clients?.type === "company" && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full align-middle">
              company
            </span>
          )}
        </div>
      ) : (
        <div className="mb-2" data-tour="billing-form-client">
          <ClientAutoSuggest
            selectedClient={selectedClient}
            onClientSelect={handleClientPick}
            onClientCreate={handleClientPick}
          />
          {selectedClient && selectedClient.parent_client_id == null && childClients.length > 0 && (
            <div className="mt-2 p-2 border rounded-lg bg-muted/20">
              <Label className="text-xs">Department / Branch (optional)</Label>
              <Select
                value={selectedSubClientId}
                onValueChange={setSelectedSubClientId}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue placeholder="Parent-level (all departments)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Parent-level (all departments)
                  </SelectItem>
                  {childClients.map((child) => (
                    <SelectItem key={child.id} value={String(child.id)}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {clientHasExistingAccount && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-2">
          This client already has a billing account (
          {existingClientAccount.account_number}). Each client can only have one
          billing account.
        </div>
      )}

      {/* ── Basic Information ─ same rounded-xl box as JO ────────── */}
      <div data-tour="billing-form-contact">
        <h2 className="text-xs mb-1 mt-2 font-bold opacity-40">
          Basic Information
        </h2>
        <div className="grid md:grid-cols-3 grid-cols-1 gap-2 px-4 py-2 border rounded-xl">
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Contact Name</p>
            <Input
              placeholder="e.g., Accounting Dept"
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
              value={billingContactName}
              onChange={(e) => setBillingContactName(e.target.value)}
            />
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Contact Email <span className="ml-1 text-[11px] font-normal italic text-destructive/80">required *</span></p>
            <Input
              placeholder="billing@example.com"
              type="email"
              required
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
              value={billingContactEmail}
              onChange={(e) => setBillingContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-0">
            <p className="text-sm font-medium leading-none">Contact Phone <span className="ml-1 text-[11px] font-normal italic text-destructive/80">required *</span></p>
            <PhoneInput
              value={billingContactPhone}
              onChange={setBillingContactPhone}
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>

      {/* ── Account Settings ─ border-b rows, label left / value right ── */}
      <div data-tour="billing-form-settings">
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Account Settings
        </h2>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Credit Limit</p>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0 = no limit"
              className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-fit text-right"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            0 = no limit
          </p>
        </div>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Billing Cutoff Day</p>
            <Select
              value={billingCutoffDay}
              onValueChange={setBillingCutoffDay}
            >
              <SelectTrigger className="border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-fit text-right">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent align="end">
                {CUTOFF_DAYS.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    Day {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-b py-2">
          <div className="space-y-0 flex justify-between items-center w-full">
            <p className="text-sm font-medium leading-none">Interest Rate</p>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="border-0 p-0 h-fit focus-visible:ring-0 focus-visible:ring-offset-0 w-16 text-right"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            monthly, on overdue balances
          </p>
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <h2 className="text-xs mb-1 mt-4 font-bold opacity-40">
          Notes
        </h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes about this billing account..."
          rows={3}
          className="text-sm"
        />
      </div>

      {/* ── Actions ─ same layout as JO form ────────────────────── */}
      <div className="flex md:flex-row flex-col md:justify-between mt-4" data-tour="billing-form-submit">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            (!isEditMode && !effectiveBillingClient) ||
            !!clientHasExistingAccount ||
            !billingContactEmail.trim() ||
            !billingContactPhone.trim()
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Updating.." : "Creating.."}
            </>
          ) : isEditMode ? (
            "Update Billing Account"
          ) : (
            "Create Billing Account"
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {/* Onboarding Tour */}
      {!isEditMode && (
        <>
          <FeatureAnnouncementModal
            open={showAnnouncement}
            onboarding={onboardingData}
            onStartTour={startTour}
          />
          <GuidedTour
            featureKey="billing_account_create"
            active={showTour}
            onComplete={completeTour}
          />
        </>
      )}
    </form>
  );
}
