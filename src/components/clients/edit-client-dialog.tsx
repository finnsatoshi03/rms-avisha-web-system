import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import { Client } from "../../lib/types";
import { getClientImpact } from "../../services/apiClients";
import { useUpdateClient } from "./useUpdateClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import PhoneInput from "../ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface EditClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (client: Client) => void;
}

type EditableField =
  | "name"
  | "type"
  | "contact_number"
  | "email"
  | "address"
  | "notes";

const FIELD_LABELS: Record<EditableField, string> = {
  name: "Name",
  type: "Type",
  contact_number: "Contact No.",
  email: "Email",
  address: "Address",
  notes: "Notes",
};

const EMPTY_PHONE = "+63";

function normalizeFieldValue(field: EditableField, value: string): string {
  const trimmed = value.trim();
  if (field === "contact_number" && trimmed === EMPTY_PHONE) return "";
  return trimmed;
}

export default function EditClientDialog({
  client,
  open,
  onOpenChange,
  onUpdated,
}: EditClientDialogProps) {
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [name, setName] = useState("");
  const [type, setType] = useState<"individual" | "company">("individual");
  const [phone, setPhone] = useState("+63 ");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate: update, isPending } = useUpdateClient();

  useEffect(() => {
    if (!open || !client) return;
    setStep("edit");
    setName(client.name || "");
    setType(client.type || "individual");
    setPhone(client.contact_number || "+63 ");
    setEmail(client.email || "");
    setAddress(client.address || "");
    setNotes(client.notes || "");
  }, [open, client]);

  const { data: impact, isLoading: isImpactLoading } = useQuery({
    queryKey: ["client-impact", client?.id],
    queryFn: () => getClientImpact(client!.id),
    enabled: open && client != null,
    staleTime: 30_000,
  });

  const changes = useMemo(() => {
    if (!client) return [];

    const currentValues: Record<EditableField, string> = {
      name,
      type,
      contact_number: phone,
      email,
      address,
      notes,
    };

    return (Object.keys(FIELD_LABELS) as EditableField[])
      .map((field) => {
        const oldValue = normalizeFieldValue(field, client[field] || "");
        const newValue = normalizeFieldValue(field, currentValues[field]);
        return { field, oldValue, newValue };
      })
      .filter(({ oldValue, newValue }) => oldValue !== newValue);
  }, [client, name, type, phone, email, address, notes]);

  const totalLinked = impact
    ? impact.job_orders + impact.rentals + impact.billing_accounts
    : 0;

  const handleConfirm = () => {
    if (!client || changes.length === 0) return;

    const data = Object.fromEntries(
      changes.map(({ field, newValue }) => [
        field,
        field === "address" || field === "notes"
          ? newValue || null
          : newValue,
      ])
    ) as Partial<Client>;

    update(
      { id: client.id, data },
      {
        onSuccess: (updatedClient) => {
          onUpdated?.(updatedClient);
          onOpenChange(false);
        },
      }
    );
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {step === "edit" ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Fix or update this client's details. Changes reflect on all
                linked records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">
                  Name
                  <span className="ml-1.5 text-[10px] font-normal italic text-destructive/80">
                    required *
                  </span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client name"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={type}
                  onValueChange={(val) =>
                    setType(val as "individual" | "company")
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Client address"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes"
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("confirm")}
                disabled={!name.trim() || changes.length === 0}
              >
                Review changes
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm client update</DialogTitle>
              <DialogDescription>
                Review the changes before saving.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {changes.map(({ field, oldValue, newValue }) => (
                  <div key={field} className="text-sm">
                    <span className="text-xs text-muted-foreground">
                      {FIELD_LABELS[field]}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="line-through text-muted-foreground break-all">
                        {oldValue || <em className="not-italic">(empty)</em>}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium break-all">
                        {newValue || <em className="not-italic">(empty)</em>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-amber-800">
                    {isImpactLoading ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking linked records...
                      </span>
                    ) : totalLinked > 0 ? (
                      <>
                        <p className="font-semibold">
                          This client is linked to:
                        </p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                          {impact!.job_orders > 0 && (
                            <li>
                              {impact!.job_orders} job order
                              {impact!.job_orders > 1 ? "s" : ""}
                            </li>
                          )}
                          {impact!.rentals > 0 && (
                            <li>
                              {impact!.rentals} rental
                              {impact!.rentals > 1 ? "s" : ""}
                            </li>
                          )}
                          {impact!.billing_accounts > 0 && (
                            <li>
                              {impact!.billing_accounts} billing account
                              {impact!.billing_accounts > 1 ? "s" : ""}
                            </li>
                          )}
                        </ul>
                        <p className="mt-1">
                          All will display the updated details.
                        </p>
                      </>
                    ) : (
                      <p>This client has no linked records yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("edit")}
                disabled={isPending}
              >
                Back
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={isPending}>
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Confirm update
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
