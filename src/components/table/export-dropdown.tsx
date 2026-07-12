import { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { saveAs } from "file-saver";
import { CreateJobOrderData, CreateQuotationData } from "../../lib/types";
import {
  resolveQuotationDownpayment,
  withComputedQuotationTotals,
} from "../../lib/quotation-totals";

interface ExportDropdownProps {
  jobOrderData: CreateJobOrderData;
  quotations: Array<{
    id: number;
    quote_no: string;
    job_order_id: number;
    date_created: string;
    end_date: string;
    company: string;
    address: string;
    note: string;
    subtotal: number;
    discount: number;
    downpayment?: number | null;
    labor_rate: number;
    service_fee: number;
    total_quote: number;
    quotation_items?: Array<{
      description: string;
      qty: number;
      unit_price: number;
      amount: number;
      material_id?: string;
      is_manual?: boolean;
    }>;
  }>;
  fileName: string;
  branchId: number;
}

export const ExportDropdown = ({
  jobOrderData,
  quotations,
  fileName,
  branchId,
}: ExportDropdownProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<
    "jo" | `quotation-${number}` | null
  >(null);

  const handleExportJobOrder = async () => {
    setIsExporting(true);
    setExportingType("jo");
    try {
      const [{ pdf }, { default: JobOrderPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../job-order/job-order-pdf"),
      ]);
      const doc = <JobOrderPDF data={jobOrderData} />;
      const asBlob = await pdf(doc).toBlob();
      saveAs(asBlob, fileName);
    } catch (error) {
      console.error("Error generating Job Order PDF:", error);
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportQuotation = async (quotation: (typeof quotations)[0]) => {
    setIsExporting(true);
    setExportingType(`quotation-${quotation.id}`);
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const laborRate = Number(quotation.labor_rate || 0);
      const serviceFee = Number(quotation.service_fee || 0);
      const resolvedAmount = Math.max(serviceFee - laborRate, 0);
      const sourceDiscount = Number(
        jobOrderData.discount ?? quotation.discount ?? 0
      );
      const sourceDownpayment = Number(
        resolveQuotationDownpayment(
          quotation.downpayment,
          jobOrderData.downpayment
        ) ?? 0
      );
      const normalizedTotals = withComputedQuotationTotals({
        subtotal: quotation.subtotal || 0,
        discount: sourceDiscount,
        downpayment: sourceDownpayment,
        labor_rate: laborRate,
        amount: resolvedAmount,
        service_fee: serviceFee,
        total_quote: quotation.total_quote || 0,
        quotation_items: quotation.quotation_items || [],
      });

      const quotationPDFData: CreateQuotationData & {
        clientData: {
          name: string;
          contact_number: string;
          email: string;
          brand_model: string;
          serial_number: string;
          machine_type: string;
          problem_statement: string;
        };
        branch_id: number;
        quote_no: string;
        job_order_no: string;
        date: string;
      } = {
        quote_no: quotation.quote_no || "",
        job_order_id: quotation.job_order_id,
        end_date: quotation.end_date || endDate.toISOString().split("T")[0],
        company: quotation.company || "",
        address: quotation.address || "",
        note: quotation.note || "",
        subtotal: normalizedTotals.subtotal,
        discount: normalizedTotals.discount,
        downpayment: normalizedTotals.downpayment,
        labor_rate: normalizedTotals.labor_rate,
        amount: normalizedTotals.amount,
        service_fee: normalizedTotals.service_fee,
        total_quote: normalizedTotals.total_quote,
        quotation_items: quotation.quotation_items || [],
        clientData: {
          name: jobOrderData.name || "",
          contact_number: jobOrderData.contact_number || "",
          email: jobOrderData.email || "",
          brand_model: jobOrderData.brand_model || "",
          serial_number: jobOrderData.serial_number || "",
          machine_type: jobOrderData.machine_type || "",
          problem_statement: jobOrderData.problem_statement || "",
        },
        branch_id: branchId,
        job_order_no: jobOrderData.order_no || "",
        date: new Date().toISOString().split("T")[0],
      };

      const [{ pdf }, { default: QuotationPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../job-order/quotation-pdf"),
      ]);
      const doc = <QuotationPDF data={quotationPDFData} type="both" />;
      const asBlob = await pdf(doc).toBlob();
      saveAs(
        asBlob,
        `Quotation_${quotation.quote_no}_${jobOrderData.name}.pdf`
      );
    } catch (error) {
      console.error("Error generating Quotation PDF:", error);
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  // If no quotations, render simple button
  if (!quotations || quotations.length === 0) {
    return (
      <Button
        className="rounded-full bg-slate-700 gap-1"
        onClick={handleExportJobOrder}
        disabled={isExporting}
      >
        {isExporting && exportingType === "jo" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:block">Exporting PDF..</span>
          </>
        ) : (
          <>
            <FileDown size={18} strokeWidth={1.5} />
            <span className="hidden sm:block">Export</span>
          </>
        )}
      </Button>
    );
  }

  // If quotations exist, render dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="rounded-full bg-slate-700 gap-1"
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:block">Exporting..</span>
            </>
          ) : (
            <>
              <FileDown size={18} strokeWidth={1.5} />
              <span className="hidden sm:block">Export</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-slate-800 text-white border-slate-700"
      >
        <DropdownMenuLabel className="text-slate-300">
          Export Options
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          className="focus:bg-slate-700 focus:text-white cursor-pointer"
          onClick={handleExportJobOrder}
          disabled={isExporting}
        >
          <FileText size={16} strokeWidth={1.5} className="mr-2" />
          Job Order PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuLabel className="text-slate-300 text-xs">
          Quotations
        </DropdownMenuLabel>
        {quotations.map((quotation) => (
          <DropdownMenuItem
            key={quotation.id}
            className="focus:bg-slate-700 focus:text-white cursor-pointer"
            onClick={() => handleExportQuotation(quotation)}
            disabled={isExporting}
          >
            <FileText size={16} strokeWidth={1.5} className="mr-2" />
            <div className="flex flex-col">
              <span className="text-sm">{quotation.quote_no}</span>
              <span className="text-xs text-slate-400">
                {new Date(quotation.date_created).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
