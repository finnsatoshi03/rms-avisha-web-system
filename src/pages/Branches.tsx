import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import HeaderText from "../components/ui/headerText";
import Loader from "../components/ui/loader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { ConfirmDialog } from "../components/table/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useUser } from "../components/auth/useUser";
import { Separator } from "../components/ui/separator";
import { PaginationControls } from "../components/table/pagination-controls";
import {
  BranchDependencyCounts,
  BranchRecord,
  createBranch,
  deleteBranch,
  getBranchDependencyCounts,
  getBranchJobOrderCounts,
  getBranches,
  hasBranchDependencies,
  isValidManualPrefix,
  updateBranch,
} from "../services/apiBranches";
import {
  BranchPdfHeaderFields,
  composeBranchPdfHeader,
  parseBranchPdfHeader,
} from "../lib/branch-pdf-header";

type BranchFormState = {
  name: string;
  prefix: string;
  header_address_line_1: string;
  header_address_line_2: string;
  header_call_contact: string;
  header_text_contact: string;
  header_customer_service: string;
  header_extra_line_1: string;
  header_extra_line_2: string;
  pdf_footer: string;
};

const DEFAULT_FOOTER = "No Copy no claim";

const EMPTY_FORM: BranchFormState = {
  name: "",
  prefix: "",
  header_address_line_1: "",
  header_address_line_2: "",
  header_call_contact: "",
  header_text_contact: "",
  header_customer_service: "",
  header_extra_line_1: "",
  header_extra_line_2: "",
  pdf_footer: DEFAULT_FOOTER,
};

function toHeaderFields(form: BranchFormState): BranchPdfHeaderFields {
  return {
    addressLine1: form.header_address_line_1,
    addressLine2: form.header_address_line_2,
    callContact: form.header_call_contact,
    textContact: form.header_text_contact,
    customerService: form.header_customer_service,
    extraLines: [form.header_extra_line_1, form.header_extra_line_2],
  };
}

function toForm(branch: BranchRecord): BranchFormState {
  const parsed = parseBranchPdfHeader(branch.pdf_header ?? "");

  return {
    name: branch.name,
    prefix: branch.prefix,
    header_address_line_1: parsed.addressLine1,
    header_address_line_2: parsed.addressLine2,
    header_call_contact: parsed.callContact,
    header_text_contact: parsed.textContact,
    header_customer_service: parsed.customerService,
    header_extra_line_1: parsed.extraLines[0] ?? "",
    header_extra_line_2: parsed.extraLines[1] ?? "",
    pdf_footer: branch.pdf_footer ?? DEFAULT_FOOTER,
  };
}

function BranchFormFields({
  form,
  setForm,
  disablePrefix = false,
}: {
  form: BranchFormState;
  setForm: (value: BranchFormState) => void;
  disablePrefix?: boolean;
}) {
  const headerPreview = composeBranchPdfHeader(toHeaderFields(form));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="space-y-0">
          <Label className={`${form.name ? "opacity-60" : "opacity-100"}`}>
            Branch Name
          </Label>
          <Input
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
            placeholder="e.g., Cainta"
            className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
          />
        </div>

        <div className="space-y-0 min-w-[180px]">
          <Label className={`${form.prefix ? "opacity-60" : "opacity-100"}`}>
            Prefix {disablePrefix ? "(Locked)" : "(Optional)"}
          </Label>
          <Input
            value={form.prefix}
            onChange={(event) =>
              setForm({
                ...form,
                prefix: event.target.value.replace(/\D/g, "").slice(0, 2),
              })
            }
            placeholder={disablePrefix ? "--" : "03"}
            disabled={disablePrefix}
            maxLength={2}
            className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
          />
          {!disablePrefix ? (
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-assign next available prefix.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-slate-50/50 space-y-4">
        <div>
          <p className="text-sm font-semibold">PDF Header</p>
          <p className="text-xs text-muted-foreground">
            Fill fields below. The system stores one combined header value for PDF rendering.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
          <div className="space-y-0">
            <Label
              className={`${form.header_address_line_1 ? "opacity-60" : "opacity-100"}`}
            >
              Address Line 1
            </Label>
            <Input
              value={form.header_address_line_1}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_address_line_1: event.target.value,
                })
              }
              placeholder="e.g., EVERLASTING BLDG, 172"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>

          <div className="space-y-0">
            <Label
              className={`${form.header_address_line_2 ? "opacity-60" : "opacity-100"}`}
            >
              Address Line 2
            </Label>
            <Input
              value={form.header_address_line_2}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_address_line_2: event.target.value,
                })
              }
              placeholder="e.g., Rizal Ave, Taytay, 1920 Rizal"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
          <div className="space-y-0">
            <Label
              className={`${form.header_call_contact ? "opacity-60" : "opacity-100"}`}
            >
              Call Contact
            </Label>
            <Input
              value={form.header_call_contact}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_call_contact: event.target.value,
                })
              }
              placeholder="e.g., (02) 8983-3684"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>

          <div className="space-y-0">
            <Label
              className={`${form.header_text_contact ? "opacity-60" : "opacity-100"}`}
            >
              Text Contact
            </Label>
            <Input
              value={form.header_text_contact}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_text_contact: event.target.value,
                })
              }
              placeholder="e.g., (09)43-606-4129"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
          <div className="space-y-0">
            <Label
              className={`${form.header_customer_service ? "opacity-60" : "opacity-100"}`}
            >
              Customer Service
            </Label>
            <Input
              value={form.header_customer_service}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_customer_service: event.target.value,
                })
              }
              placeholder="e.g., (02) 8254-4828"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>

          <div className="space-y-0">
            <Label
              className={`${form.header_extra_line_1 ? "opacity-60" : "opacity-100"}`}
            >
              Extra Header Line 1 (Optional)
            </Label>
            <Input
              value={form.header_extra_line_1}
              onChange={(event) =>
                setForm({
                  ...form,
                  header_extra_line_1: event.target.value,
                })
              }
              placeholder="Optional"
              className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
            />
          </div>
        </div>

        <div className="space-y-0">
          <Label
            className={`${form.header_extra_line_2 ? "opacity-60" : "opacity-100"}`}
          >
            Extra Header Line 2 (Optional)
          </Label>
          <Input
            value={form.header_extra_line_2}
            onChange={(event) =>
              setForm({
                ...form,
                header_extra_line_2: event.target.value,
              })
            }
            placeholder="Optional"
            className="border-0 border-b p-0 h-fit focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
          />
        </div>

        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold mb-1">Header Preview</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-sans">
            {headerPreview || "No header content yet."}
          </pre>
        </div>
      </div>

      <div className="space-y-0">
        <Label className={`${form.pdf_footer ? "opacity-60" : "opacity-100"}`}>
          PDF Footer
        </Label>
        <Textarea
          value={form.pdf_footer}
          onChange={(event) =>
            setForm({
              ...form,
              pdf_footer: event.target.value,
            })
          }
          rows={2}
          placeholder="No Copy no claim"
          className="border-0 border-b p-0 min-h-0 h-[56px] resize-y focus-visible:border-b-black focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none mb-2"
        />
      </div>
    </div>
  );
}

export default function Branches() {
  const { isAdmin } = useUser();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [createForm, setCreateForm] = useState<BranchFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<BranchFormState>(EMPTY_FORM);
  const [selectedBranch, setSelectedBranch] = useState<BranchRecord | null>(null);
  const [checkingBranchId, setCheckingBranchId] = useState<number | null>(null);

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches", "management"],
    queryFn: getBranches,
  });

  const { data: jobOrderCounts, isLoading: isCountsLoading } = useQuery({
    queryKey: ["branches", "joborders-count"],
    queryFn: getBranchJobOrderCounts,
  });

  const branchIdsKey = useMemo(
    () => branches.map((branch) => branch.id).join(","),
    [branches]
  );

  const { data: dependencyByBranch = {}, isLoading: isDependencyLoading } =
    useQuery({
      queryKey: ["branches", "dependencies", branchIdsKey],
      queryFn: async () => {
        const pairs = await Promise.all(
          branches.map(async (branch) => {
            const counts = await getBranchDependencyCounts(branch.id);
            return [branch.id, counts] as const;
          })
        );

        return pairs.reduce((acc, [branchId, counts]) => {
          acc[branchId] = counts;
          return acc;
        }, {} as Record<number, BranchDependencyCounts>);
      },
      enabled: branches.length > 0,
    });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      toast.success("Branch created.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create branch.");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      branchId,
      payload,
    }: {
      branchId: number;
      payload: { name: string; pdf_header?: string | null; pdf_footer?: string | null };
    }) => updateBranch(branchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setEditOpen(false);
      setSelectedBranch(null);
      toast.success("Branch updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update branch.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (branchId: number) => deleteBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setDeleteOpen(false);
      setSelectedBranch(null);
      toast.success("Branch deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete branch.");
    },
  });

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return branches;

    return branches.filter((branch) => {
      const searchBlob = `${branch.name} ${branch.prefix}`.toLowerCase();
      return searchBlob.includes(term);
    });
  }, [branches, searchTerm]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRows.slice(startIndex, endIndex);
  }, [currentPage, filteredRows, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));

  const handleCreate = () => {
    const name = createForm.name.trim();
    const prefix = createForm.prefix.trim();

    if (!name) {
      toast.error("Branch name is required.");
      return;
    }

    if (prefix && !isValidManualPrefix(prefix)) {
      toast.error("Manual prefix must be a unique 2-digit number between 03 and 99.");
      return;
    }

    createMutation.mutate({
      name,
      prefix: prefix || null,
      pdf_header: composeBranchPdfHeader(toHeaderFields(createForm)),
      pdf_footer: createForm.pdf_footer,
    });
  };

  const handleOpenEdit = (branch: BranchRecord) => {
    setSelectedBranch(branch);
    setEditForm(toForm(branch));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedBranch) return;

    const name = editForm.name.trim();
    if (!name) {
      toast.error("Branch name is required.");
      return;
    }

    setCheckingBranchId(selectedBranch.id);
    try {
      const latestCounts = await getBranchDependencyCounts(selectedBranch.id);
      if (hasBranchDependencies(latestCounts)) {
        toast.error("Cannot edit branch. Existing records depend on this branch.");
        setEditOpen(false);
        return;
      }

      editMutation.mutate({
        branchId: selectedBranch.id,
        payload: {
          name,
          pdf_header: composeBranchPdfHeader(toHeaderFields(editForm)),
          pdf_footer: editForm.pdf_footer,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify branch dependencies."
      );
    } finally {
      setCheckingBranchId(null);
    }
  };

  const handleOpenDelete = (branch: BranchRecord) => {
    setSelectedBranch(branch);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;

    setCheckingBranchId(selectedBranch.id);
    try {
      const latestCounts = await getBranchDependencyCounts(selectedBranch.id);
      if (hasBranchDependencies(latestCounts)) {
        toast.error("Cannot delete branch. Existing records depend on this branch.");
        setDeleteOpen(false);
        return;
      }

      deleteMutation.mutate(selectedBranch.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify branch dependencies."
      );
    } finally {
      setCheckingBranchId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (!isAdmin) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          You do not have access to this module.
        </p>
      </div>
    );
  }

  if (isBranchesLoading || isCountsLoading || isDependencyLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-[calc(100%-1rem)]">
      <HeaderText>Branch Management</HeaderText>

      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
              placeholder="Search branch name or prefix.."
            />
            <Search className="absolute left-3 top-2 opacity-60" size={14} />
          </div>

          {searchTerm && (
            <Button
              variant="ghost"
              className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
              onClick={handleResetFilters}
            >
              Reset <X size={16} strokeWidth={1.5} />
            </Button>
          )}

          <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              className="relative overflow-hidden flex justify-center group/modal-btn px-4 py-1 h-fit w-fit text-sm border border-primaryRed hover:border-hoveredRed text-primaryRed hover:text-hoveredRed items-center rounded-lg gap-1 bg-none hover:bg-none text-nowrap"
              onClick={() => setCreateOpen(true)}
            >
              <span className="group-hover/modal-btn:translate-x-40 flex items-center gap-1 text-center transition duration-500">
                Add Branch
              </span>
              <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-black z-20">
                <Plus size={18} />
              </div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-bold">Add New Branch</DialogTitle>
                <DialogDescription>
                  Prefix is optional. If empty, the system auto-assigns the next available value.
                </DialogDescription>
              </DialogHeader>

              <BranchFormFields form={createForm} setForm={setCreateForm} />

              <DialogFooter className="space-x-4">
                <Button
                  className="h-fit py-1"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="h-fit py-1"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="h-[calc(100%-6.5rem)] flex flex-col justify-between">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100 border-none">
              <TableHead className="w-[36%]">Branch Name</TableHead>
              <TableHead className="w-[12%]">Prefix</TableHead>
              <TableHead className="w-[18%]">Created Date</TableHead>
              <TableHead className="w-[14%]">Job Orders</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No branches found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((branch) => {
                const jobOrderCount = jobOrderCounts?.[branch.id] ?? 0;
                const counts = dependencyByBranch[branch.id];
                const locked = counts ? hasBranchDependencies(counts) : true;
                const canEdit = !locked;
                const canDelete = !locked;
                const isChecking = checkingBranchId === branch.id;

                return (
                  <TableRow key={branch.id}>
                    <TableCell className="font-bold text-black">{branch.name}</TableCell>
                    <TableCell>{branch.prefix}</TableCell>
                    <TableCell>
                      {branch.created_at
                        ? new Date(branch.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Singapore",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>{jobOrderCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-fit py-1"
                            onClick={() => handleOpenEdit(branch)}
                            disabled={isChecking}
                          >
                            <Pencil size={14} className="mr-1" />
                            Edit
                          </Button>
                        ) : null}

                        {canDelete ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-fit py-1"
                            onClick={() => handleOpenDelete(branch)}
                            disabled={isChecking}
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </Button>
                        ) : null}

                        {!canEdit && !canDelete ? (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredRows.length > 0 ? (
          <PaginationControls
            totalItems={filteredRows.length}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            handleItemsPerPageChange={handleItemsPerPageChange}
          />
        ) : null}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelectedBranch(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bold">Edit Branch</DialogTitle>
            <DialogDescription>
              Prefix is locked to protect existing job order numbers.
            </DialogDescription>
          </DialogHeader>

          <BranchFormFields form={editForm} setForm={setEditForm} disablePrefix />

          <DialogFooter className="space-x-4">
            <Button className="h-fit py-1" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editMutation.isPending} className="h-fit py-1">
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
        destructive
        isPending={deleteMutation.isPending}
        message={`Delete branch "${selectedBranch?.name ?? ""}"? This cannot be undone.`}
      />
    </div>
  );
}
