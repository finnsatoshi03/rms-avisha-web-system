import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { getJobOrdersFiltered } from "../../services/apiJobOrders";
import { JobOrderData } from "../../lib/types";
import toast from "react-hot-toast";

interface ExportDialogProps {
  branchId: number | null;
  technicianId?: string | number | undefined;
  isUser: boolean;
}

const ExportDialog = ({
  branchId,
  technicianId,
  isUser,
}: ExportDialogProps) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  // CSV export mutation
  const { mutate: exportToCsv, isPending: isExporting } = useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => {
      const response = await getJobOrdersFiltered({
        page: 1,
        limit: 10000, // Large limit to get all records in date range
        searchTerm: "",
        branchId,
        technicianId: isUser ? technicianId : undefined,
        statusFilters: [],
        startDate,
        endDate,
      });
      return response.data;
    },
    onSuccess: (data) => {
      handleCsvDownload(data);
      setIsExportDialogOpen(false);
      setExportDateFrom("");
      setExportDateTo("");
      toast.success("CSV exported successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export CSV");
    },
  });

  // CSV generation and download handler
  const handleCsvDownload = (data: JobOrderData[]) => {
    const headers = [
      "Job Order ID",
      "Date Created",
      "Customer Name",
      "Machine Type",
      "Brand Model",
      "Status",
      "Warranty",
      "Technician Name",
      "Branch Location",
      "Total Amount",
      "Completed Date",
    ];

    const csvData = data.map((jobOrder) => [
      jobOrder.order_no || "",
      jobOrder.created_at
        ? new Date(jobOrder.created_at).toLocaleDateString()
        : "",
      jobOrder.clients?.name || "",
      jobOrder.machine_type || "",
      jobOrder.brand_model || "",
      jobOrder.status || "",
      jobOrder.warranty || "",
      jobOrder.users?.fullname || "",
      jobOrder.branches?.location || "",
      jobOrder.grand_total ? jobOrder.grand_total.toLocaleString() : "0",
      jobOrder.completed_at
        ? new Date(jobOrder.completed_at).toLocaleDateString()
        : "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `job-orders-${exportDateFrom}-to-${exportDateTo}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle export button click
  const handleExportClick = () => {
    if (!exportDateFrom || !exportDateTo) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(exportDateFrom) > new Date(exportDateTo)) {
      toast.error("Start date must be before end date");
      return;
    }

    exportToCsv({ startDate: exportDateFrom, endDate: exportDateTo });
  };

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DialogTrigger asChild>
        <button className="cursor-pointer flex gap-1 items-center border text-gray-400 hover:text-gray-700 text-sm border-gray-400 w-fit px-2 py-1 rounded-lg">
          <Download size={16} />
          Export CSV
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
              <Download size={20} className="text-gray-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-1">
              Export Job Orders
            </h2>
            <p className="text-gray-500 text-xs">
              Select a date range to export your job orders as CSV
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  From
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
                className="flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportClick}
                disabled={isExporting}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
