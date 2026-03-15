export type BranchPdfHeaderFields = {
  addressLine1: string;
  addressLine2: string;
  callContact: string;
  textContact: string;
  customerService: string;
  extraLines: string[];
};

const CUSTOMER_SERVICE_PREFIX = "CUSTOMER SERVICE:";

export const DEFAULT_BRANCH_HEADER_LINES_BY_ID: Record<number, string[]> = {
  1: [
    "EVERLASTING BLDG, 172",
    "Rizal Ave, Taytay, 1920 Rizal",
    "Call (02) 8983-3684  Text (09)43-606-4129",
    "CUSTOMER SERVICE: (02) 8254-4828",
  ],
  2: [
    "ACM BUILDING ORTIGAS AVE., BRGY",
    "STA LUCIA DE CASTRO PASIG CITY",
    "Call (02) 8254-9823  Text (09)66-774-5227",
    "CUSTOMER SERVICE: (02) 8254-9823",
  ],
};

function sanitizeLine(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function isSupportLine(line: string) {
  return /call|customer service|text/i.test(line);
}

export function parseBranchPdfHeader(
  pdfHeader: string | null | undefined
): BranchPdfHeaderFields {
  const lines = (pdfHeader ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: BranchPdfHeaderFields = {
    addressLine1: "",
    addressLine2: "",
    callContact: "",
    textContact: "",
    customerService: "",
    extraLines: [],
  };

  const addressLines: string[] = [];

  lines.forEach((line) => {
    const customerServiceMatch = line.match(/^\s*customer service\s*:?\s*(.+)$/i);
    if (customerServiceMatch) {
      parsed.customerService = sanitizeLine(customerServiceMatch[1]);
      return;
    }

    const callTextMatch = line.match(
      /^\s*call\s+(.+?)(?:\s+text\s+(.+))?\s*$/i
    );
    if (callTextMatch) {
      parsed.callContact = sanitizeLine(callTextMatch[1]);
      parsed.textContact = sanitizeLine(callTextMatch[2]);
      return;
    }

    addressLines.push(line);
  });

  parsed.addressLine1 = addressLines[0] ?? "";
  parsed.addressLine2 = addressLines[1] ?? "";
  parsed.extraLines = addressLines.slice(2);

  return parsed;
}

export function composeBranchPdfHeader(fields: BranchPdfHeaderFields) {
  const lines: string[] = [];

  const addressLine1 = sanitizeLine(fields.addressLine1);
  const addressLine2 = sanitizeLine(fields.addressLine2);
  const callContact = sanitizeLine(fields.callContact);
  const textContact = sanitizeLine(fields.textContact);
  const customerService = sanitizeLine(fields.customerService);

  if (addressLine1) {
    lines.push(addressLine1);
  }

  if (addressLine2) {
    lines.push(addressLine2);
  }

  if (callContact || textContact) {
    const parts: string[] = [];
    if (callContact) {
      parts.push(`Call ${callContact}`);
    }
    if (textContact) {
      parts.push(`Text ${textContact}`);
    }
    lines.push(parts.join("  "));
  }

  if (customerService) {
    lines.push(`${CUSTOMER_SERVICE_PREFIX} ${customerService}`);
  }

  for (const extraLine of fields.extraLines) {
    const cleaned = sanitizeLine(extraLine);
    if (cleaned) {
      lines.push(cleaned);
    }
  }

  return lines.join("\n");
}

export function getBranchPdfHeaderLines(pdfHeader: string | null | undefined) {
  const parsed = parseBranchPdfHeader(pdfHeader);
  const normalized = composeBranchPdfHeader(parsed);
  if (!normalized) {
    return [];
  }

  return normalized.split(/\r?\n/).filter(Boolean);
}

export function getBranchPdfHeaderLinesWithFallback(
  branchId: number | null | undefined,
  pdfHeader: string | null | undefined
) {
  const configured = getBranchPdfHeaderLines(pdfHeader);
  if (configured.length > 0) {
    return configured;
  }

  if (typeof branchId === "number") {
    return DEFAULT_BRANCH_HEADER_LINES_BY_ID[branchId] ?? [];
  }

  return [];
}
