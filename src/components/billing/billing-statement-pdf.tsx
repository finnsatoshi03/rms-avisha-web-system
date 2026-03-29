import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import font1 from "/fonts/Montserrat-Bold.ttf";
import font2 from "/fonts/Montserrat-Black.ttf";
import { BillingStatement, BillingLineItem, BillingPayment } from "../../lib/billing-types";
import { formatNumberWithCommas } from "../../lib/helpers";

Font.register({ family: "Montserrat-Bold", src: font1 });
Font.register({ family: "Montserrat-Black", src: font2 });

function amt(value: number): string {
  return `P${formatNumberWithCommas(Math.abs(value))}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Resolve logo to absolute URL so @react-pdf/renderer can fetch it in browser
const LOGO_URL = new URL("/RMS-Logo.png", window.location.origin).href;

export interface BillingStatementPDFData {
  statement: BillingStatement;
  accountNumber: string;
  clientName: string;
  clientContact: string | null;
  clientEmail: string | null;
  interestRate: number;
  lineItems: BillingLineItem[];
  payments: BillingPayment[];
}

export default function BillingStatementPDF({
  data,
}: {
  data: BillingStatementPDFData;
}) {
  const { statement: s, lineItems, payments } = data;

  const periodStart = new Date(s.period_start);
  const periodEnd = new Date(s.period_end);
  periodEnd.setHours(23, 59, 59);

  const periodLineItems = lineItems.filter((li) => {
    const d = new Date(li.created_at);
    return d >= periodStart && d <= periodEnd;
  });

  const periodPayments = payments.filter((p) => {
    const d = new Date(p.payment_date);
    return d >= periodStart && d <= periodEnd;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header: Logo + Company Info (same layout as JO PDF) ─ */}
        <View style={styles.header}>
          <Image style={styles.headerLogo} src={LOGO_URL} />
          <View style={styles.headerText}>
            <Text>RMS AVISHA ENTERPRISES</Text>
            <Text>Authorized Service Center</Text>
            <Text style={{ color: "#f12924" }}>CUSTOMER SERVICE: (02) 8254-4828</Text>
            <Text style={{ color: "#f12924" }}>www.rmsavisha.company</Text>
          </View>
        </View>

        {/* ── Title ──────────────────────────────────────────────── */}
        <View style={styles.tableContainer}>
          <Text style={[styles.tableHeader, { borderBottom: "1px solid black" }]}>
            STATEMENT OF ACCOUNT
          </Text>

          {/* ── Account Info Grid ────────────────────────────────── */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Client Name
            </Text>
            <Text style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}>
              {data.clientName}
            </Text>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Statement #
            </Text>
            <Text style={[styles.tableClientInfo, { color: "#f12924" }]}>
              {s.statement_number}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Contact No.
            </Text>
            <Text style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}>
              {data.clientContact || "—"}
            </Text>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Account #
            </Text>
            <Text style={styles.tableClientInfo}>
              {data.accountNumber}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Client Email
            </Text>
            <Text style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}>
              {data.clientEmail || "—"}
            </Text>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Period
            </Text>
            <Text style={styles.tableClientInfo}>
              {fmtDate(s.period_start)} — {fmtDate(s.period_end)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Interest Rate
            </Text>
            <Text style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}>
              {data.interestRate}% / month
            </Text>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Due Date
            </Text>
            <Text style={[styles.tableClientInfo, { color: "#f12924", fontFamily: "Montserrat-Bold" }]}>
              {s.due_date ? fmtDate(s.due_date) : "N/A"}
            </Text>
          </View>

          {/* ── Summary Section Header ───────────────────────────── */}
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.summaryHeaderLabel,
                {
                  fontSize: 8,
                  textTransform: "uppercase",
                  textAlign: "center",
                  borderRight: "1px solid black",
                  fontFamily: "Montserrat-Bold",
                },
              ]}
            >
              Account Summary
            </Text>
            <Text style={styles.summaryHeaderAmount}>Amount</Text>
          </View>

          {/* Previous Balance */}
          <View style={styles.tableRow}>
            <Text style={[styles.summaryLabel, { borderRight: "1px solid black" }]}>
              Previous Balance (before {fmtDate(s.period_start)})
            </Text>
            <Text style={styles.summaryAmount}>{amt(s.previous_balance)}</Text>
          </View>

          {/* New Charges */}
          <View style={styles.tableRow}>
            <Text style={[styles.summaryLabel, { borderRight: "1px solid black" }]}>
              New Charges
            </Text>
            <Text style={styles.summaryAmount}>{amt(s.new_charges)}</Text>
          </View>

          {/* Interest */}
          {s.interest_applied > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.summaryLabel, { borderRight: "1px solid black", color: "#d97706" }]}>
                Interest Applied ({data.interestRate}%)
              </Text>
              <Text style={[styles.summaryAmount, { color: "#d97706" }]}>
                {amt(s.interest_applied)}
              </Text>
            </View>
          )}

          {/* Payments */}
          {s.payments_received > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.summaryLabel, { borderRight: "1px solid black", color: "#16a34a" }]}>
                Payments Received
              </Text>
              <Text style={[styles.summaryAmount, { color: "#16a34a" }]}>
                -{amt(s.payments_received)}
              </Text>
            </View>
          )}

          {/* Total Due */}
          <View style={styles.tableRow}>
            <Text style={[styles.summaryTotalLabel, { borderRight: "1px solid black" }]}>
              Total Due
            </Text>
            <Text style={styles.summaryTotalAmount}>
              {amt(s.current_balance)}
            </Text>
          </View>

          {/* ── Line Items Detail Header ─────────────────────────── */}
          {periodLineItems.length > 0 && (
            <>
              <View style={styles.tableRow}>
                <Text
                  style={{
                    fontSize: 7,
                    textAlign: "center",
                    textTransform: "uppercase",
                    width: "100%",
                    fontFamily: "Montserrat-Bold",
                    paddingVertical: 2,
                  }}
                >
                  Charges & Adjustments Detail
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { width: "15%", borderRight: "1px solid black" }]}>
                  Date
                </Text>
                <Text style={[styles.tableLabel, { width: "12%", borderRight: "1px solid black" }]}>
                  Type
                </Text>
                <Text style={[styles.tableLabel, { width: "48%", borderRight: "1px solid black" }]}>
                  Description
                </Text>
                <Text style={[styles.tableLabel, { width: "25%" }]}>
                  Amount
                </Text>
              </View>
              {periodLineItems.map((li) => (
                <View style={styles.tableRow} key={li.id}>
                  <Text style={[styles.tableCol17, { width: "15%", borderRight: "1px solid black", fontSize: 7 }]}>
                    {fmtDate(li.created_at)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol17,
                      {
                        width: "12%",
                        borderRight: "1px solid black",
                        textTransform: "capitalize",
                        fontSize: 7,
                      },
                    ]}
                  >
                    {li.type}
                  </Text>
                  <Text style={[styles.tableCol17, { width: "48%", borderRight: "1px solid black", fontSize: 7 }]}>
                    {li.description}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol17,
                      {
                        width: "25%",
                        fontSize: 8,
                        color: li.type === "interest" ? "#d97706" : undefined,
                      },
                    ]}
                  >
                    {amt(li.amount)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* ── Payments Detail ──────────────────────────────────── */}
          {periodPayments.length > 0 && (
            <>
              <View style={styles.tableRow}>
                <Text
                  style={{
                    fontSize: 7,
                    textAlign: "center",
                    textTransform: "uppercase",
                    width: "100%",
                    fontFamily: "Montserrat-Bold",
                    paddingVertical: 2,
                  }}
                >
                  Payments Detail
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { width: "20%", borderRight: "1px solid black" }]}>
                  Date
                </Text>
                <Text style={[styles.tableLabel, { width: "25%", borderRight: "1px solid black" }]}>
                  Method
                </Text>
                <Text style={[styles.tableLabel, { width: "25%", borderRight: "1px solid black" }]}>
                  Reference
                </Text>
                <Text style={[styles.tableLabel, { width: "30%" }]}>
                  Amount
                </Text>
              </View>
              {periodPayments.map((p) => (
                <View style={styles.tableRow} key={p.id}>
                  <Text style={[styles.tableCol17, { width: "20%", borderRight: "1px solid black", fontSize: 7 }]}>
                    {fmtDate(p.payment_date)}
                  </Text>
                  <Text style={[styles.tableCol17, { width: "25%", borderRight: "1px solid black", textTransform: "capitalize", fontSize: 7 }]}>
                    {p.payment_method || "—"}
                  </Text>
                  <Text style={[styles.tableCol17, { width: "25%", borderRight: "1px solid black", fontSize: 7 }]}>
                    {p.reference_number || "—"}
                  </Text>
                  <Text style={[styles.tableCol17, { width: "30%", color: "#16a34a", fontSize: 8 }]}>
                    {amt(p.amount)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* ── Terms ────────────────────────────────────────────── */}
          <View style={styles.tableRow}>
            <Text
              style={{
                fontSize: 7,
                textAlign: "center",
                textTransform: "uppercase",
                width: "100%",
              }}
            >
              Terms and Conditions
            </Text>
          </View>
          <View
            style={[
              styles.tableRow,
              { fontSize: 6, justifyContent: "space-between", padding: 5 },
            ]}
          >
            <View style={{ width: "45%" }}>
              <Text>
                1. Payment is due on or before the due date indicated above.
              </Text>
              <Text>
                2. A monthly interest of {data.interestRate}% will be applied to overdue balances.
              </Text>
            </View>
            <View style={{ width: "45%" }}>
              <Text>
                3. Please include your account number as reference when making payments.
              </Text>
              <Text>
                4. For any discrepancies, please contact us within 7 days of receiving this statement.
              </Text>
            </View>
          </View>

          {/* ── Generated Info ────────────────────────────────────── */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Prepared By
            </Text>
            <Text style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}>
              System Generated
            </Text>
            <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
              Date Generated
            </Text>
            <Text style={styles.tableClientInfo}>
              {fmtDate(s.generated_at)}
            </Text>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <Text style={styles.footer}>
          THIS IS A SYSTEM-GENERATED STATEMENT
        </Text>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    flexDirection: "column",
    padding: 20,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  headerLogo: {
    width: 150,
  },
  headerText: {
    fontSize: 12,
  },
  tableContainer: {
    marginTop: 10,
    display: "flex",
    border: "1px solid black",
    borderTop: "1px solid black",
  },
  tableHeader: {
    paddingVertical: 3,
    width: "100%",
    color: "#f12924",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Montserrat-Bold",
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
  },
  tableLabel: {
    padding: 2,
    fontWeight: 600,
    fontSize: 7,
    width: "16.66%",
    textTransform: "uppercase",
    fontFamily: "Montserrat-Bold",
  },
  tableCol17: {
    fontSize: 9,
    padding: 2,
    width: "16.66%",
  },
  tableCol49: {
    fontSize: 9,
    padding: 2,
    width: "49.98%",
  },
  tabelCol66: {
    fontSize: 9,
    padding: 2,
    width: "66.64%",
  },
  summaryHeaderLabel: {
    width: "83.34%",
    padding: 2,
    fontSize: 7,
  },
  summaryHeaderAmount: {
    width: "16.66%",
    padding: 2,
    fontSize: 7,
    textAlign: "right",
    textTransform: "uppercase",
    fontFamily: "Montserrat-Bold",
  },
  summaryLabel: {
    width: "83.34%",
    padding: 2,
    fontSize: 9,
  },
  summaryAmount: {
    width: "16.66%",
    padding: 2,
    fontSize: 9,
    textAlign: "right",
  },
  summaryTotalLabel: {
    width: "83.34%",
    padding: 2,
    fontSize: 10,
    textTransform: "uppercase",
    textAlign: "right",
    fontFamily: "Montserrat-Bold",
  },
  summaryTotalAmount: {
    width: "16.66%",
    padding: 2,
    fontSize: 11,
    color: "#f12924",
    textAlign: "right",
    fontFamily: "Montserrat-Bold",
  },
  tableClientInfo: {
    fontSize: 9,
    width: "33.32%",
    padding: 2,
  },
  footer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    marginTop: 5,
    fontSize: 14,
    textTransform: "uppercase",
    fontFamily: "Montserrat-Black",
  },
});
