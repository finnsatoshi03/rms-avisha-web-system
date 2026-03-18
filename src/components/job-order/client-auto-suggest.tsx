import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Client } from "../../lib/types";
import { searchClients, createClient } from "../../services/apiClients";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ClientAutoSuggestProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client) => void;
  onClientCreate: (client: Client) => void;
  disabled?: boolean;
  initialName?: string;
}

export default function ClientAutoSuggest({
  selectedClient,
  onClientSelect,
  onClientCreate,
  disabled = false,
  initialName = "",
}: ClientAutoSuggestProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(initialName);
  const [results, setResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("+63 ");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientType, setNewClientType] = useState<"individual" | "company">(
    "individual"
  );

  // Duplicate detection state
  const [potentialDuplicates, setPotentialDuplicates] = useState<Client[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [confirmedCreate, setConfirmedCreate] = useState(false);
  const dupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchClients(term);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, handleSearch]);

  // Check for duplicates when name or phone changes in the create form
  useEffect(() => {
    if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);

    const checkTerm = newClientName.trim() || newClientPhone.replace(/\D/g, "").slice(2);
    if (checkTerm.length < 2) {
      setPotentialDuplicates([]);
      setShowDuplicateWarning(false);
      return;
    }

    dupDebounceRef.current = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        // Search by name
        const nameResults = newClientName.trim().length >= 2
          ? await searchClients(newClientName.trim())
          : [];

        // Search by phone if it's long enough
        const phoneDigits = newClientPhone.replace(/\D/g, "").slice(2);
        const phoneResults = phoneDigits.length >= 4
          ? await searchClients(phoneDigits)
          : [];

        // Merge and deduplicate
        const allResults = [...nameResults];
        for (const pr of phoneResults) {
          if (!allResults.some((r) => r.id === pr.id)) {
            allResults.push(pr);
          }
        }

        setPotentialDuplicates(allResults);
        setShowDuplicateWarning(allResults.length > 0);
        setConfirmedCreate(false);
      } catch {
        setPotentialDuplicates([]);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 500);

    return () => {
      if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);
    };
  }, [newClientName, newClientPhone]);

  const handleSelect = (client: Client) => {
    onClientSelect(client);
    setOpen(false);
    setSearchValue(client.name);
    setShowCreateForm(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("+63 ")) {
      value = "+63 ";
    }
    const digits = value.replace(/\D/g, "").slice(2); // Remove +63
    if (digits.length <= 10) {
      const formatted =
        "+63 " +
        (digits.length > 0 ? digits.slice(0, 3) : "") +
        (digits.length > 3 ? " " + digits.slice(3, 6) : "") +
        (digits.length > 6 ? " " + digits.slice(6, 10) : "");
      setNewClientPhone(formatted.trim());
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;

    // If there are potential duplicates and user hasn't confirmed, show warning
    if (potentialDuplicates.length > 0 && !confirmedCreate) {
      setShowDuplicateWarning(true);
      return;
    }

    setIsCreating(true);
    try {
      const client = await createClient({
        name: newClientName
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        contact_number: newClientPhone,
        email: newClientEmail,
        type: newClientType,
        address: newClientAddress || null,
      });

      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClientCreate(client);
      setOpen(false);
      setSearchValue(client.name);
      setShowCreateForm(false);
      resetCreateForm();
    } catch (error) {
      console.error("Error creating client:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewClientName("");
    setNewClientPhone("+63 ");
    setNewClientEmail("");
    setNewClientAddress("");
    setNewClientType("individual");
    setPotentialDuplicates([]);
    setShowDuplicateWarning(false);
    setConfirmedCreate(false);
  };

  const openCreateForm = () => {
    setNewClientName(searchValue);
    setShowCreateForm(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between border-0 p-0 h-fit focus:ring-0 focus:ring-offset-0 w-full text-3xl font-bold hover:bg-transparent"
          disabled={disabled}
        >
          <span
            className={cn(
              "truncate text-left",
              !selectedClient && "text-muted-foreground"
            )}
          >
            {selectedClient ? selectedClient.name : "Select Client"}
          </span>
          <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[400px]" align="start">
        {!showCreateForm ? (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, phone, or email..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <span className="text-sm text-muted-foreground">
                    No clients found.
                  </span>
                </CommandEmpty>
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {results.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={String(client.id)}
                      onSelect={() => handleSelect(client)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex items-center w-full">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            selectedClient?.id === client.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {client.name}
                            {client.type === "company" && (
                              <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                company
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-3">
                            {client.contact_number && (
                              <span>{client.contact_number}</span>
                            )}
                            {client.email && <span>{client.email}</span>}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <div className="border-t p-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-8 px-2"
                onClick={openCreateForm}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new client
                {searchValue.trim() && ` "${searchValue.trim()}"`}
              </Button>
            </div>
          </Command>
        ) : (
          <div className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">New Client</h4>

            {/* Duplicate detection alert */}
            {showDuplicateWarning && potentialDuplicates.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-amber-800">
                      Possible existing client{potentialDuplicates.length > 1 ? "s" : ""} found
                    </p>
                    <p className="text-amber-700 mt-0.5">
                      Did you mean one of these?
                    </p>
                  </div>
                </div>
                <div className="space-y-1 ml-6">
                  {potentialDuplicates.slice(0, 3).map((dup) => (
                    <button
                      key={dup.id}
                      type="button"
                      className="w-full text-left rounded-md border bg-white px-2 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelect(dup)}
                    >
                      <span className="font-medium">{dup.name}</span>
                      {dup.contact_number && (
                        <span className="text-muted-foreground ml-2">
                          {dup.contact_number}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-7 text-amber-700 hover:text-amber-900"
                  onClick={() => {
                    setConfirmedCreate(true);
                    setShowDuplicateWarning(false);
                  }}
                >
                  None of these — create new client anyway
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={newClientType}
                  onValueChange={(val) =>
                    setNewClientType(val as "individual" | "company")
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
                <Input
                  value={newClientPhone}
                  onChange={handlePhoneChange}
                  placeholder="+63 9XX XXX XXXX"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="Client address"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleCreateClient}
                disabled={!newClientName.trim() || isCreating || isCheckingDuplicates}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {potentialDuplicates.length > 0 && !confirmedCreate
                  ? "Check & Create"
                  : "Create"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
