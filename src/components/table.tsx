/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { PaginationControls } from "./table/pagination-controls";
import { SortableHeader } from "./table/sort-table-header";
import { Status, StatusPopover } from "./table/status-popover";
import { StatusChanger } from "./table/status-changer-dropdown";
import { ConfirmDialog } from "./table/alert-dialog";
import { EllipsisDropdown } from "./table/ellipsis-dropdown";
import JobOrderForm from "./job-order/job-order-form";
import { ExportDropdown } from "./table/export-dropdown";

import { PenLine, Trash2, X } from "lucide-react";

import {
  formatMachineType,
  formatNumberWithCommas,
  renderWarrantyInfo,
} from "../lib/helpers";
import { CreateJobOrderData, JobOrderData, User } from "../lib/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteJobOrder,
  duplicateJobOrder,
  updateJobOrderStatus,
} from "../services/apiJobOrders";
import {
  applySourcePayment,
  deleteReceiptFile,
  recalculateLinkedSourceBilling,
  uploadReceiptFile,
} from "../services/apiBilling";
import {
  deleteQuotationsByJobOrderIds,
  getQuotationsByJobOrder,
} from "../services/apiQuotations";
import { useUser } from "./auth/useUser";

import toast from "react-hot-toast";
import { Separator } from "@radix-ui/react-separator";
import { TableCellWithHover } from "./job-order/cell-hover";
import { PaymentDialog } from "./table/payment-dialog";
import BillingImpactConfirmDialog from "./billing/billing-impact-confirm-dialog";
import { isBillingLinkedSource } from "../lib/billing-sync";

export default function Table({
  data,
  originalData,
  technicians,
  resetFilters,
  visibleColumns = [],
  currentPage,
  itemsPerPage,
  totalItems,
  handlePageChange,
  handleItemsPerPageChange,
  handleSortChange,
  handleColumnVisibilityChange,
  currentSort,
  deleteMode = "job_order",
}: {
  data: JobOrderData[];
  originalData: JobOrderData[];
  technicians: User[];
  resetFilters: () => void;
  visibleColumns: string[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
  handleItemsPerPageChange: (items: number) => void;
  handleSortChange: (column: string, direction: "asc" | "desc") => void;
  handleColumnVisibilityChange: (column: string, isVisible: boolean) => void;
  currentSort: { key: string; direction: "asc" | "desc" }[];
  deleteMode?: "job_order" | "quotation";
}) {
  const queryClient = useQueryClient();
  const { isUser } = useUser();
  const isQuotationDeleteMode = deleteMode === "quotation";
  const { isPending: isDeleting, mutate } = useMutation({
    mutationFn: async (ids: number[]) => {
      if (isQuotationDeleteMode) {
        await deleteQuotationsByJobOrderIds(ids);
        return;
      }
      await deleteJobOrder(ids);
    },
  });

  const { mutate: updateStatusMutate, isPending: isUpdatingStatus } =
    useMutation({
      mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
        updateJobOrderStatus(ids, status),
    });

  const { mutate: duplicateJobOrderMutate, isPending: isDuplicating } =
    useMutation({
      mutationFn: (id: number) => duplicateJobOrder(id),
    });

  const [orders, setOrders] = useState(data);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [sortStates, setSortStates] = useState<{
    [key: string]: "asc" | "desc" | null;
  }>({
    machine_type: null,
    status: null,
    "users.fullname": null,
    grand_total: null,
  });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [statusToChange, setStatusToChange] = useState<Status | null>(null);

  const [viewJobOrder, setViewJobOrder] = useState<JobOrderData | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

  const [isEditSheetOpen, setEditSheetOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false); // Confirm dialog for deleting orders
  const [confirmStatusDialogOpen, setConfirmStatusDialogOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<JobOrderData | null>(null);
  const [billingImpactDialogOpen, setBillingImpactDialogOpen] = useState(false);
  const [billingImpactPending, setBillingImpactPending] = useState(false);
  const [billingImpactOrders, setBillingImpactOrders] = useState<JobOrderData[]>(
    []
  );
  const [billingImpactAction, setBillingImpactAction] = useState<
    (() => void) | null
  >(null);

  // Fetch quotations for selected job order (only when single row is selected)
  const { data: quotations = [] } = useQuery({
    queryKey: ["quotations", selectedRows[0]],
    queryFn: () => getQuotationsByJobOrder(selectedRows[0]),
    enabled: selectedRows.length === 1,
  });

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (selectedRows.length > 0) {
      setShowNotification(true);
      setAnimationClass("slideUp");
    } else if (showNotification) {
      setAnimationClass("slideDown");
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 200); // Duration of the slide-down animation
      return () => clearTimeout(timer);
    }
  }, [selectedRows.length]);

  useEffect(() => {
    setOrders(data);
  }, [data]);

  useEffect(() => {
    const initialSortState = currentSort.reduce<Record<string, "asc" | "desc">>(
      (acc, sort) => {
        acc[sort.key] = sort.direction;
        return acc;
      },
      {}
    );
    setSortStates(initialSortState);
  }, [currentSort]);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    handleSortChange(column, direction);
    setSortStates({
      machine_type: null,
      status: null,
      "users.fullname": null,
      grand_total: null,
      [column]: direction,
    });
  };

  const handleRowClick = (jobOrder: JobOrderData) => {
    setViewJobOrder(jobOrder);
    setIsViewSheetOpen(true);
  };

  const handleRowSelection = (id: number) => {
    setSelectedRows((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((rowId) => rowId !== id)
        : [...prevSelected, id]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedRows.length === orders.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(orders.map((order) => order.id));
    }
  };

  const handleDeleteRow = (id: number) => {
    setDeleteIds([id]);
    setConfirmDialogOpen(true);
  };

  const handleDeleteSelectedRows = () => {
    if (selectedRows.length === 0) return;
    setDeleteIds(selectedRows);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteIds.length === 0) return;

    mutate(deleteIds, {
      onSuccess: () => {
        toast.success(
          isQuotationDeleteMode
            ? "Quotation(s) archived successfully"
            : "Job Order(s) archived successfully"
        );
        if (isQuotationDeleteMode) {
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
          queryClient.invalidateQueries({ queryKey: ["jobOrderQuotations"] });
        } else {
          queryClient.invalidateQueries({
            queryKey: ["job_order"],
          });
        }
        queryClient.invalidateQueries({ queryKey: ["archive"] });
        setOrders((prevOrders) =>
          prevOrders.filter((order) => !deleteIds.includes(order.id))
        );
        setSelectedRows([]);
        setDeleteIds([]);
        setConfirmDialogOpen(false);
      },
      onError: (error: Error) => {
        toast.error(
          error.message ||
            (isQuotationDeleteMode
              ? "An error occurred while archiving the quotation(s)"
              : "An error occurred while archiving the Job Order(s)"),
          { duration: 6000 }
        );
        console.error(error);
        setConfirmDialogOpen(false);
      },
    });
  };

  const isRowSelected = (id: number) => selectedRows.includes(id);
  const areAllRowsSelected = selectedRows.length === orders.length;

  const updateStatus = (order_no: string, newStatus: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.order_no === order_no ? { ...order, status: newStatus } : order
      )
    );
  };

  const isOrderBillingLinked = (order: JobOrderData) =>
    isBillingLinkedSource({
      sourceType: "job_order",
      sourceId: order.id,
      transferredToBilling: order.transferred_to_billing,
      paymentDetails: order.payment_details,
    });

  const openBillingImpactGuard = (
    ordersToRecalculate: JobOrderData[],
    action: () => void
  ) => {
    if (ordersToRecalculate.length === 0) {
      action();
      return;
    }

    setBillingImpactOrders(ordersToRecalculate);
    setBillingImpactAction(() => action);
    setBillingImpactDialogOpen(true);
  };

  const markTransferredOrderCompleted = (
    order: JobOrderData,
    options?: { clearSelectedRows?: boolean }
  ) => {
    updateStatusMutate(
      { ids: [order.id], status: "Completed" },
      {
        onSuccess: () => {
          updateStatus(order.order_no, "Completed");
          if (options?.clearSelectedRows) {
            setSelectedRows([]);
          }
          toast.success("Job Order completed (payment via billing account)");
          queryClient.invalidateQueries({ queryKey: ["job_order"] });
          queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
          queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
          queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
          queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
        },
        onError: (error) => {
          toast.error("An error occurred while updating the Job Order status");
          console.error(error);
        },
      }
    );
  };

  const handleBillingImpactProceed = async () => {
    if (!billingImpactAction) return;

    setBillingImpactPending(true);
    try {
      for (const order of billingImpactOrders) {
        await recalculateLinkedSourceBilling("job_order", order.id, {
          reason: "Manual status/edit flow recalculation",
        });
      }

      billingImpactAction();
      toast.success(
        "Billing has been updated based on your changes. Previous payments were adjusted."
      );
      setBillingImpactDialogOpen(false);
      setBillingImpactOrders([]);
      setBillingImpactAction(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to recalculate linked billing record."
      );
    } finally {
      setBillingImpactPending(false);
    }
  };

  const performSingleStatusChange = (
    orderToUpdate: JobOrderData,
    status: Status
  ) => {
    if (status.label === "Completed") {
      // If JO is transferred to billing, skip payment dialog — payment is handled via billing
      if (orderToUpdate.transferred_to_billing) {
        markTransferredOrderCompleted(orderToUpdate);
        setOpenPopover(null);
        return;
      }
      setShowPaymentDialog(true);
      setSelectedOrder(orderToUpdate);
      return;
    }

    updateStatusMutate(
      { ids: [orderToUpdate.id], status: status.label },
      {
        onSuccess: () => {
          updateStatus(orderToUpdate.order_no, status.label);
          toast.success("Job Order status updated successfully");
          queryClient.invalidateQueries({ queryKey: ["job_order"] });
        },
        onError: (error) => {
          toast.error("An error occurred while updating the Job Order status");
          console.error(error);
        },
      }
    );
  };

  const handleStatusChange = (order_no: string, status: Status) => {
    const orderToUpdate = orders.find((order) => order.order_no === order_no);

    if (orderToUpdate) {
      const createdDate = new Date(orderToUpdate.created_at);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const isPendingTooLong =
        orderToUpdate.status === "Pending" && createdDate < twoDaysAgo;
      const isTechnicalReportEmpty =
        !orderToUpdate.technical_report ||
        orderToUpdate.technical_report.trim() === "";

      if (isPendingTooLong && isTechnicalReportEmpty) {
        toast.error(
          "Status cannot be changed. The job order has been pending for more than two days, and the technical report is missing."
        );
        return;
      }

      const needsBillingGuard =
        status.label !== orderToUpdate.status &&
        orderToUpdate.status === "Completed" &&
        isOrderBillingLinked(orderToUpdate);

      if (needsBillingGuard) {
        openBillingImpactGuard([orderToUpdate], () =>
          performSingleStatusChange(orderToUpdate, status)
        );
      } else {
        performSingleStatusChange(orderToUpdate, status);
      }
    }
    setOpenPopover(null);
  };

  const handlePaymentSubmit = async (
    payments: Record<string, number>,
    receiptFile?: File | null
  ) => {
    if (!selectedOrder) return;

    const totalPayment = Object.values(payments).reduce(
      (acc, amount) => acc + amount,
      0
    );
    const amountDue = Math.max(
      Number(selectedOrder.grand_total || 0) - Number(selectedOrder.downpayment || 0),
      0
    );

    // Payment must match the current amount due (grand total less downpayment).
    if (Math.abs(totalPayment - amountDue) > 0.01) {
      alert(
        `The total payment amount (${totalPayment}) does not match the order total (${amountDue})`
      );
      return;
    }

    let uploadedReceiptPath: string | null = null;
    try {
      if (receiptFile) {
        uploadedReceiptPath = await uploadReceiptFile({
          sourceType: "job_order",
          sourceId: selectedOrder.id,
          file: receiptFile,
        });
      }

      await applySourcePayment("job_order", selectedOrder.id, payments, {
        receiptUrl: uploadedReceiptPath,
      });
      updateStatusMutate(
        { ids: [selectedOrder.id], status: "Completed" },
        {
          onSuccess: () => {
            toast.success(
              "Job Order status updated and payment processed successfully"
            );
            queryClient.invalidateQueries({ queryKey: ["job_order"] });
            queryClient.invalidateQueries({ queryKey: ["billing_line_items"] });
            queryClient.invalidateQueries({ queryKey: ["billing_balance"] });
            queryClient.invalidateQueries({ queryKey: ["billing_ledger"] });
            queryClient.invalidateQueries({ queryKey: ["billing_accounts"] });
            setSelectedRows([]);
            setShowPaymentDialog(false);
          },
          onError: (error) => {
            toast.error(
              "An error occurred while updating the Job Order status"
            );
            console.error(error);
          },
        }
      );
    } catch (error) {
      if (uploadedReceiptPath) {
        try {
          await deleteReceiptFile(uploadedReceiptPath);
        } catch (deleteError) {
          console.error("Failed to rollback receipt upload", deleteError);
        }
      }
      toast.error("An error occurred while updating the payment details");
      console.error(error);
    }
  };

  const handleBulkStatusChange = (status: Status) => {
    const ordersToUpdate = orders.filter((order) =>
      selectedRows.includes(order.id)
    );

    const problematicOrders = ordersToUpdate.filter((order) => {
      const createdDate = new Date(order.created_at);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const isPendingTooLong =
        order.status === "Pending" && createdDate < twoDaysAgo;
      const isTechnicalReportEmpty =
        !order.technical_report || order.technical_report.trim() === "";

      return isPendingTooLong && isTechnicalReportEmpty;
    });

    if (problematicOrders.length > 0) {
      toast.error(
        `Status change blocked for ${problematicOrders.length} job order(s). Ensure technical reports are provided for job orders pending for more than two days.`
      );
      return;
    }

    if (status.label === "Completed") {
      if (selectedRows.length === 1) {
        const orderToUpdate = orders.find(
          (order) => order.id === selectedRows[0]
        );
        if (orderToUpdate) {
          if (orderToUpdate.transferred_to_billing) {
            markTransferredOrderCompleted(orderToUpdate, {
              clearSelectedRows: true,
            });
            return;
          }

          const isTechnicalReportEmpty =
            !orderToUpdate.technical_report ||
            orderToUpdate.technical_report.trim() === "";

          if (isTechnicalReportEmpty) {
            toast.error(
              "Technical report is required before completing the job order."
            );
            // setCurrentEditId(orderToUpdate.id);
            // setEditSheetOpen(true);
            return;
          }
          setShowPaymentDialog(true);
          setSelectedOrder(orderToUpdate);
        }
      } else {
        toast.error(
          "Bulk completion is not allowed. Please complete orders individually to ensure proper payment processing."
        );
        return;
      }
    } else {
      setStatusToChange(status);
      setConfirmStatusDialogOpen(true);
    }
  };

  const confirmBulkStatusChange = () => {
    if (statusToChange) {
      const idsToUpdate = selectedRows;
      const linkedOrders = orders.filter(
        (order) =>
          idsToUpdate.includes(order.id) &&
          order.status === "Completed" &&
          statusToChange.label !== order.status &&
          isOrderBillingLinked(order)
      );

      const applyBulkStatus = () =>
        updateStatusMutate(
          { ids: idsToUpdate, status: statusToChange.label },
          {
            onSuccess: () => {
              setOrders((prevOrders) =>
                prevOrders.map((order) =>
                  idsToUpdate.includes(order.id)
                    ? { ...order, status: statusToChange.label }
                    : order
                )
              );
              setSelectedRows([]);
              setStatusToChange(null);
              toast.success("Job Orders status updated successfully");
              queryClient.invalidateQueries({ queryKey: ["job_order"] });
            },
            onError: (error) => {
              toast.error(
                "An error occurred while updating the Job Orders status"
              );
              console.error(error);
            },
          }
        );

      if (linkedOrders.length > 0) {
        openBillingImpactGuard(linkedOrders, applyBulkStatus);
      } else {
        applyBulkStatus();
      }
      setConfirmStatusDialogOpen(false);
    }
  };

  // elipsis dropdown actions
  const handleEditClick = (id: number) => {
    setCurrentEditId(id);
    setEditSheetOpen(true);
  };

  const handleDuplicateClick = (id: number) => {
    duplicateJobOrderMutate(id, {
      onSuccess: () => {
        toast.success("Job Order duplicated successfully");
        queryClient.invalidateQueries({ queryKey: ["job_order"] });
      },
      onError: (error) => {
        toast.error("An error occurred while duplicating the Job Order");
        console.error(error);
      },
    });
  };

  const shouldHighlightRow = (createdAt: string, status: string) => {
    const createdDate = new Date(createdAt);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return status === "Pending" && createdDate < twoDaysAgo;
  };

  const currentOrder = orders.find((order) => order.id === currentEditId);

  return (
    <>
      {originalData.length === 0 ? (
        <div className="w-full h-[50vh] flex flex-col gap-2 text-center items-center justify-center">
          <p>
            No job orders found. Please create new job orders to see the
            dashboard data.
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="w-full h-[50vh] flex flex-col gap-2 text-center items-center justify-center">
          <p>
            Oops! The filters you've applied didn't match any Job Orders. Please
            adjust your filters and try again.
          </p>
          <button
            className="px-2 py-0.5 text-sm bg-slate-100 rounded-lg"
            onClick={resetFilters}
          >
            Remove all filters
          </button>
        </div>
      ) : (
        <>
          {showNotification && (
            <div className="w-full flex items-center justify-center h-0">
              <div
                className={`w-fit text-sm bg-slate-800 md:py-3 py-5 md:px-5 px-8 text-white rounded-3xl md:rounded-full absolute bottom-4 flex  md:flex-row flex-col md:gap-0 gap-4 items-center justify-between ${animationClass} z-50`}
                style={{
                  animation: `${animationClass} 0.2s ease-out forwards`,
                }}
              >
                <div className="flex items-center gap-4">
                  <X
                    size={16}
                    strokeWidth={1.5}
                    className="cursor-pointer hover:text-slate-200"
                    onClick={() => setSelectedRows([])}
                  />
                  <p className="flex items-center gap-2">
                    <span className="p-1 bg-slate-700 size-6 flex items-center justify-center rounded-full">
                      {selectedRows.length}
                    </span>
                    row(s) selected
                  </p>
                </div>
                <div className="flex gap-2 md:ml-24 ml-0">
                  {selectedRows.length === 1 &&
                    (() => {
                      const currentOrder: JobOrderData | undefined =
                        orders.find((order) => order.id === selectedRows[0]);

                      if (!currentOrder) return null;

                      let parsedAccessories: string[] = [];
                      if (typeof currentOrder.accessories === "string") {
                        try {
                          parsedAccessories = JSON.parse(
                            currentOrder.accessories
                          ) as string[];
                        } catch (error) {
                          console.error("Failed to parse accessories", error);
                        }
                      }

                      const orderReceivedTechnician = technicians.find(
                        (tech) => tech.id === currentOrder.order_received
                      );
                      const orderReceivedTechnicianName =
                        orderReceivedTechnician
                          ? orderReceivedTechnician.fullname
                          : "---";

                      const technician = technicians.find(
                        (tech) => tech.id === currentOrder.technician_id
                      );
                      const technicianName = technician
                        ? technician.fullname
                        : "---";

                      const jobOrderData: CreateJobOrderData = {
                        order_no: currentOrder.order_no || "",
                        accessories: parsedAccessories,
                        additional_comments:
                          currentOrder.additional_comments || "",
                        amount: currentOrder.amount ?? 0,
                        branch_id: currentOrder.branch_id ?? 0,
                        brand_model: currentOrder.brand_model || "",
                        contact_number:
                          currentOrder.clients?.contact_number || "",
                        completed_at: currentOrder.completed_at || "",
                        date: currentOrder.created_at
                          ? new Date(currentOrder.created_at)
                          : new Date(),
                        email: currentOrder.clients?.email || "",
                        grand_total: currentOrder.grand_total ?? 0,
                        labor_description: currentOrder.labor_description || "",
                        labor_total: currentOrder.labor_total ?? 0,
                        machine_type: currentOrder.machine_type || "",
                        material_total: currentOrder.material_total ?? 0,
                        materials:
                          currentOrder.materials.map((material: any) => ({
                            material: material.material_description || "",
                            quantity: material.quantity ?? 0,
                            unitPrice: material.unit_price ?? 0,
                          })) || [],
                        name: currentOrder.clients?.name || "",
                        order_received: orderReceivedTechnicianName,
                        technician_id: technicianName,
                        problem_statement: currentOrder.problem_statement || "",
                        rate: currentOrder.rate ? currentOrder.rate : 0,
                        serial_number: currentOrder.serial_number || "",
                        sub_total: currentOrder.sub_total ?? 0,
                        payment_details: currentOrder.payment_details || {},
                        status: currentOrder.status || "",
                      };

                      const fileName = `JobOrder_${currentOrder.order_no}_${
                        currentOrder.clients?.name || "Client"
                      }.pdf`;

                      return (
                        <>
                          <ExportDropdown
                            jobOrderData={jobOrderData}
                            quotations={quotations}
                            fileName={fileName}
                            branchId={currentOrder.branch_id}
                          />
                          <Button
                            className="rounded-full bg-slate-700 gap-1"
                            onClick={() => handleEditClick(selectedRows[0])}
                          >
                            <PenLine size={18} strokeWidth={1.5} />
                            <span className="hidden sm:block">Edit</span>
                          </Button>
                        </>
                      );
                    })()}
                  <StatusChanger onChangeStatus={handleBulkStatusChange} />
                  {selectedRows.length > 0 && !isUser && (
                    <Button
                      className="rounded-full bg-red-700 gap-1"
                      onClick={handleDeleteSelectedRows}
                      disabled={isDeleting}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                      <span className="hidden sm:block">Archive</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="h-[calc(100%-7.5rem)] flex flex-col justify-between">
            <TableUI>
              <TableHeader>
                <TableRow className="bg-slate-100 border-none">
                  <TableHead className="w-[3%]">
                    <Checkbox
                      checked={areAllRowsSelected}
                      onCheckedChange={handleSelectAllRows}
                    />
                  </TableHead>
                  <TableHead className="w-[10%]">Order No.</TableHead>
                  <TableHead className="w-[18%]">Client Name</TableHead>
                  {visibleColumns.includes("created_at") && (
                    <TableHead className="w-[13%]">
                      <SortableHeader
                        column="created_at"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("machine_type") && (
                    <TableHead className="w-[13%]">
                      <SortableHeader
                        column="machine_type"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("status") && (
                    <TableHead className="w-[15%]">
                      <SortableHeader
                        column="status"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("warranty") && (
                    <TableHead className="w-[12%]">
                      <SortableHeader
                        column="warranty"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  {visibleColumns.includes("users.fullname") && (
                    <TableHead className="w-[18%]">
                      <SortableHeader
                        column="users.fullname"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[10%]">
                    <SortableHeader
                      column="grand_total"
                      sortStates={sortStates}
                      handleSort={handleSort}
                      handleColumnVisibilityChange={
                        handleColumnVisibilityChange
                      }
                    />
                  </TableHead>
                  {visibleColumns.includes("completed_at") && (
                    <TableHead className="w-[13%]">
                      <SortableHeader
                        column="completed_at"
                        sortStates={sortStates}
                        handleSort={handleSort}
                        handleColumnVisibilityChange={
                          handleColumnVisibilityChange
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[3%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: JobOrderData) => {
                  const highlight = shouldHighlightRow(
                    order.created_at,
                    order.status
                  );

                  return (
                    <TableRow
                      key={order.id}
                      className={`text-gray-500 cursor-pointer ${
                        highlight ? "bg-red-100" : ""
                      }`} // Apply red background if condition is met
                      onClick={() => handleRowClick(order)}
                    >
                      <TableCellWithHover
                        highlight={highlight}
                        isRowSelected={isRowSelected(order.id)}
                        handleRowSelection={() => handleRowSelection(order.id)}
                        // orderId={order.id}
                      />
                      <TableCell>{order.order_no}</TableCell>
                      <TableCell className="font-bold text-black">
                        {order.is_copy
                          ? `(Copy) ${order.clients.name}`
                          : order.clients.name}
                      </TableCell>
                      {visibleColumns.includes("created_at") && (
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              timeZone: "Asia/Singapore",
                            }
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes("machine_type") && (
                        <TableCell>
                          {formatMachineType(order.machine_type)}
                        </TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell>
                          <StatusPopover
                            order={order}
                            handleStatusChange={handleStatusChange}
                            openPopover={openPopover}
                            setOpenPopover={setOpenPopover}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.includes("warranty") && (
                        <TableCell>
                          {renderWarrantyInfo(order?.warranty) ?? ""}
                        </TableCell>
                      )}
                      {visibleColumns.includes("users.fullname") && (
                        <TableCell
                          className={`${
                            !order.users && "text-red-600 font-bold"
                          }`}
                        >
                          {order.users?.fullname ??
                            order.users?.email ??
                            "Not Assigned"}
                        </TableCell>
                      )}
                      <TableCell className="font-bold text-black">
                        ₱{formatNumberWithCommas(Number(order.grand_total))}
                      </TableCell>
                      {visibleColumns.includes("completed_at") && (
                        <TableCell>
                          {order.completed_at
                            ? new Date(order.completed_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: "Asia/Singapore",
                                }
                              )
                            : "N/A"}
                        </TableCell>
                      )}
                      <TableCell>
                        <EllipsisDropdown
                          onViewClick={() => handleRowClick(order)}
                          onEditClick={() => handleEditClick(order.id)}
                          onDuplicateClick={() =>
                            handleDuplicateClick(order.id)
                          }
                          onDeleteClick={() => handleDeleteRow(order.id)}
                          isDuplicating={isDuplicating}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TableUI>
            <PaginationControls
              totalItems={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              handleItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </>
      )}
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSubmit={handlePaymentSubmit}
        isBillingLinked={
          selectedOrder ? isOrderBillingLinked(selectedOrder) : false
        }
        order={selectedOrder ?? ({} as JobOrderData)}
      />
      <BillingImpactConfirmDialog
        open={billingImpactDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (billingImpactPending) return;
            setBillingImpactDialogOpen(false);
            setBillingImpactOrders([]);
            setBillingImpactAction(null);
            return;
          }
          setBillingImpactDialogOpen(open);
        }}
        onProceed={handleBillingImpactProceed}
        isPending={billingImpactPending}
      />
      <ConfirmDialog
        isOpen={confirmStatusDialogOpen}
        onClose={() => setConfirmStatusDialogOpen(false)}
        onConfirm={confirmBulkStatusChange}
        message="Are you sure you want to change the status of the selected orders?"
        isPending={isUpdatingStatus}
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmDelete}
        message={
          isQuotationDeleteMode
            ? "Archive the selected quotation(s)? This will move them to Archive and keep linked job orders intact."
            : "Archive the selected job order(s)? This will move them to Archive."
        }
        destructive
        isPending={isDeleting}
      />
      <Sheet open={isEditSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">Edit Job Order</SheetTitle>
            <Separator className="my-2" />
            <JobOrderForm
              jobOrderToEdit={currentOrder ? currentOrder : undefined}
              technicians={technicians}
              onClose={() => setEditSheetOpen(false)}
            />
          </SheetHeader>
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="min-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-bold">View Job Order</SheetTitle>
            <Separator className="my-2" />
            <JobOrderForm
              jobOrderToEdit={viewJobOrder ? viewJobOrder : undefined}
              readonly={true}
              technicians={technicians}
            />
          </SheetHeader>
          <SheetDescription></SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  );
}
