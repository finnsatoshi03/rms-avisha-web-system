import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { RentalData, RentalConsumable, RentalInspection } from "../../lib/types";
import {
  getBranchPdfHeaderLinesWithFallback,
  isSupportLine,
} from "../../lib/branch-pdf-header";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 15,
  },
  headerLine: {
    fontSize: 9,
    marginBottom: 2,
  },
  headerLineSmall: {
    fontSize: 8,
    color: "#555",
    marginBottom: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 130,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 3,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    fontSize: 9,
  },
  colDesc: { flex: 3 },
  colQty: { width: 50, textAlign: "center" },
  colPrice: { width: 70, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  totalsSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    marginBottom: 2,
    width: 200,
  },
  totalLabel: {
    flex: 1,
    fontSize: 9,
  },
  totalValue: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
  },
  grandTotal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
});

interface RentalPDFProps {
  rental: RentalData;
}

export default function RentalPDF({ rental }: RentalPDFProps) {
  const headerLines = getBranchPdfHeaderLinesWithFallback(
    rental.branch_id,
    rental.branches?.pdf_header ?? null
  );

  const consumables = (rental.rental_consumables || []) as RentalConsumable[];
  const inspection = rental.rental_inspections as RentalInspection | null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branch Header */}
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Helvetica-Bold",
              marginBottom: 4,
            }}
          >
            {rental.branches?.name || "RMS"}
          </Text>
          {headerLines.map((line, i) => (
            <Text
              key={i}
              style={
                isSupportLine(line) ? styles.headerLineSmall : styles.headerLine
              }
            >
              {line}
            </Text>
          ))}
        </View>

        <Text style={styles.title}>Rental Agreement</Text>

        {/* Rental Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Rental No:</Text>
            <Text style={styles.value}>{rental.rental_no}</Text>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(rental.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{rental.status}</Text>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{rental.rental_type}</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{rental.clients?.name || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>
              {rental.clients?.contact_number || "—"}
            </Text>
          </View>
          {rental.clients?.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{rental.clients.email}</Text>
            </View>
          )}
        </View>

        {/* Printer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Printer:</Text>
            <Text style={styles.value}>
              {rental.rental_assets?.unit_name || "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>
              {rental.rental_assets?.model || "—"}
            </Text>
            <Text style={styles.label}>S/N:</Text>
            <Text style={styles.value}>
              {rental.rental_assets?.serial_number || "—"}
            </Text>
          </View>
        </View>

        {/* Rental Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Period</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>
              {rental.start_date
                ? new Date(rental.start_date).toLocaleDateString()
                : "—"}
            </Text>
            <Text style={styles.label}>End Date:</Text>
            <Text style={styles.value}>
              {rental.end_date
                ? new Date(rental.end_date).toLocaleDateString()
                : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>
              {rental.due_date
                ? new Date(rental.due_date).toLocaleDateString()
                : "—"}
            </Text>
            <Text style={styles.label}>Rate:</Text>
            <Text style={styles.value}>
              ₱{Number(rental.rate_amount).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Consumables Table */}
        {consumables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consumables</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colPrice}>Unit Price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {consumables.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colDesc}>{c.description}</Text>
                <Text style={styles.colQty}>{c.quantity}</Text>
                <Text style={styles.colPrice}>
                  ₱{Number(c.unit_price).toFixed(2)}
                </Text>
                <Text style={styles.colTotal}>
                  ₱{Number(c.total_amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Rate Amount:</Text>
            <Text style={styles.totalValue}>
              ₱{Number(rental.rate_amount).toFixed(2)}
            </Text>
          </View>
          {Number(rental.consumables_total) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Consumables:</Text>
              <Text style={styles.totalValue}>
                ₱{Number(rental.consumables_total).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>
              Grand Total:
            </Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>
              ₱{Number(rental.grand_total).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Inspection Summary (if exists) */}
        {inspection && (
          <View style={[styles.section, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>Inspection Summary</Text>
            {inspection.physical_condition && (
              <View style={styles.row}>
                <Text style={styles.label}>Physical Condition:</Text>
                <Text style={styles.value}>
                  {inspection.physical_condition}
                </Text>
              </View>
            )}
            {inspection.print_quality && (
              <View style={styles.row}>
                <Text style={styles.label}>Print Quality:</Text>
                <Text style={styles.value}>{inspection.print_quality}</Text>
              </View>
            )}
            {inspection.missing_items && (
              <View style={styles.row}>
                <Text style={styles.label}>Missing Items:</Text>
                <Text style={styles.value}>{inspection.missing_items}</Text>
              </View>
            )}
            {inspection.damage_penalty > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Damage Penalty:</Text>
                <Text style={styles.value}>
                  ₱{Number(inspection.damage_penalty).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {rental.branches?.pdf_footer || "Thank you for your business!"}
        </Text>
      </Page>
    </Document>
  );
}
