import { Document } from "@react-pdf/renderer";
import { CreateJobOrderData, CreateQuotationData } from "../../lib/types";
import JobOrderPDF from "./job-order-pdf";
import QuotationPDF from "./quotation-pdf";

interface MergedPDFProps {
  jobOrderData: CreateJobOrderData;
  quotationData: CreateQuotationData;
  orderReceivedTechnicianName: string;
  technicianName: string;
}

export default function MergedPDF({
  jobOrderData,
  quotationData,
  orderReceivedTechnicianName,
  technicianName,
}: MergedPDFProps) {
  const jobOrderPDFData = {
    ...jobOrderData,
    order_received: orderReceivedTechnicianName,
    technician_id: technicianName,
  };

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1); // Default 1 month validity

  const quotationPDFData = {
    ...quotationData,
    quote_no: quotationData.quote_no || "", // Use actual quote_no, no fallback
    end_date: quotationData.end_date || endDate.toISOString().split("T")[0],
    clientData: {
      name: jobOrderData.name || "",
      contact_number: jobOrderData.contact_number || "",
      email: jobOrderData.email || "",
      brand_model: jobOrderData.brand_model || "",
      serial_number: jobOrderData.serial_number || "",
      machine_type: jobOrderData.machine_type || "",
      problem_statement: jobOrderData.problem_statement || "",
    },
    branch_id: jobOrderData.branch_id || 0,
    branch: quotationData.branch ?? jobOrderData.branch,
    job_order_no: jobOrderData.order_no || "", // Use actual job order number, no fallback
    date: new Date().toISOString().split("T")[0],
  };

  return (
    <Document>
      {/* Job Order Pages */}
      <JobOrderPDF data={jobOrderPDFData} type="client" contentOnly={true} />

      {/* Quotation Pages */}
      <QuotationPDF data={quotationPDFData} type="both" contentOnly={true} />
    </Document>
  );
}
