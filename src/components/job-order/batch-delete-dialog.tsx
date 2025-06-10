import { useEffect, useState } from "react";
import { Trash2, AlertTriangle, Lock } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getJobOrdersFiltered,
  deleteJobOrder,
} from "../../services/apiJobOrders";
import { JobOrderData } from "../../lib/types";
import toast from "react-hot-toast";

interface BatchDeleteDialogProps {
  branchLocation: string | null;
  technicianId?: string | number | undefined;
  isUser: boolean;
  onSuccess?: () => void;
}

const BatchDeleteDialog = ({
  branchLocation,
  technicianId,
  isUser,
  onSuccess,
}: BatchDeleteDialogProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [deleteDateFrom, setDeleteDateFrom] = useState("");
  const [deleteDateTo, setDeleteDateTo] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [jobOrdersToDelete, setJobOrdersToDelete] = useState<JobOrderData[]>(
    []
  );

  const requiredConfirmationText = "DELETE FOREVER";

  // Query to get job orders in date range for preview
  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: [
      "job-orders-preview",
      deleteDateFrom,
      deleteDateTo,
      branchLocation,
      technicianId,
      isUser,
    ],
    queryFn: async () => {
      if (!deleteDateFrom || !deleteDateTo) return null;

      const response = await getJobOrdersFiltered({
        page: 1,
        limit: 1000,
        searchTerm: "",
        branchLocation,
        technicianId: isUser ? technicianId : undefined,
        statusFilters: [],
        startDate: deleteDateFrom,
        endDate: deleteDateTo,
      });
      return response.data;
    },
    enabled: !!deleteDateFrom && !!deleteDateTo,
  });

  // Batch delete mutation
  const { mutate: batchDeleteJobOrders, isPending: isDeleting } = useMutation({
    mutationFn: async (jobOrderIds: number[]) => {
      return await deleteJobOrder(jobOrderIds);
    },
    onSuccess: () => {
      toast.success(
        `Successfully deleted ${jobOrdersToDelete.length} job orders`
      );
      setIsDeleteDialogOpen(false);
      setIsConfirmDialogOpen(false);
      setDeleteDateFrom("");
      setDeleteDateTo("");
      setConfirmationText("");
      setJobOrdersToDelete([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job orders");
    },
  });

  const handleDateChange = () => {
    if (previewData) {
      setJobOrdersToDelete(previewData);
    }
  };

  const handleDeleteClick = () => {
    if (!deleteDateFrom || !deleteDateTo) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(deleteDateFrom) > new Date(deleteDateTo)) {
      toast.error("Start date must be before end date");
      return;
    }

    if (!previewData || previewData.length === 0) {
      toast.error("No job orders found in the selected date range");
      return;
    }

    setJobOrdersToDelete(previewData);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (confirmationText !== requiredConfirmationText) {
      toast.error(`Please type "${requiredConfirmationText}" to confirm`);
      return;
    }

    const jobOrderIds = jobOrdersToDelete.map((jo) => jo.id);
    batchDeleteJobOrders(jobOrderIds);
  };

  // Update job orders when preview data changes
  useEffect(() => {
    handleDateChange();
  }, [previewData]);

  return (
    <>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <button className="cursor-pointer flex gap-1 items-center border text-red-400 hover:text-red-600 border-red-300 hover:border-red-400 text-sm w-fit px-2 py-1 rounded-lg transition-colors">
            <Trash2 size={16} />
            Batch Delete
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-1">
                Batch Delete Job Orders
              </h2>
              <p className="text-gray-500 text-xs">
                Select a date range to delete multiple job orders
              </p>
            </div>

            {/* Warning Message */}
            <div className="border-l-4 border-amber-500 bg-amber-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Danger Zone
                  </h3>
                  <div className="mt-1 text-sm text-amber-700">
                    <p>
                      This action will permanently delete all job orders within
                      the selected date range. This action cannot be undone and
                      will remove all associated data including materials,
                      payments, and client information.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={deleteDateFrom}
                    onChange={(e) => setDeleteDateFrom(e.target.value)}
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={deleteDateTo}
                    onChange={(e) => setDeleteDateTo(e.target.value)}
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              {/* Preview Section */}
              {deleteDateFrom && deleteDateTo && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </h4>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
                    </div>
                  ) : previewData && previewData.length > 0 ? (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-red-600">
                        {previewData.length} job order(s) will be deleted
                      </p>
                      <div className="mt-2 max-h-24 overflow-y-auto">
                        {previewData.slice(0, 5).map((jo) => (
                          <div key={jo.id} className="text-xs text-gray-500">
                            • {jo.order_no} - {jo.clients?.name} (
                            {jo.machine_type})
                          </div>
                        ))}
                        {previewData.length > 5 && (
                          <div className="text-xs text-gray-400 mt-1">
                            ... and {previewData.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No job orders found in this date range
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  disabled={!previewData || previewData.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Delete {previewData?.length || 0} Job Orders
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                <Lock size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Confirm Deletion
              </h2>
              <p className="text-xs text-gray-500">
                This action is irreversible. Please confirm by typing the text
                below.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 text-center font-mono">
                  {requiredConfirmationText}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type "{requiredConfirmationText}" to confirm:
                </label>
                <Input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={requiredConfirmationText}
                  className="border-gray-200 focus:border-red-400 focus:ring-0 transition-colors font-mono"
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>What will be deleted:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• {jobOrdersToDelete.length} job orders</li>
                  <li>• All associated materials and payments</li>
                  <li>• All related technical reports</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConfirmDialogOpen(false);
                    setConfirmationText("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={
                    confirmationText !== requiredConfirmationText || isDeleting
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Delete Forever
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchDeleteDialog;
