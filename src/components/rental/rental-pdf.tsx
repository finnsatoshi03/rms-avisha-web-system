import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { RentalData, RentalConsumable, RentalInspection } from "../../lib/types";
import {
  getBranchPdfHeaderLinesWithFallback,
  isSupportLine,
} from "../../lib/branch-pdf-header";
import font1 from "/fonts/Montserrat-Bold.ttf";
import font2 from "/fonts/Montserrat-Black.ttf";

Font.register({ family: "Montserrat-Bold", src: font1 });
Font.register({ family: "Montserrat-Black", src: font2 });

interface RentalPDFProps {
  rental: RentalData;
  type?: "company" | "client" | "both" | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Content({ rental }: { rental: RentalData }) {
  const headerLines = getBranchPdfHeaderLinesWithFallback(
    rental.branch_id,
    rental.branches?.pdf_header ?? null
  );
  const consumables = (rental.rental_consumables || []) as RentalConsumable[];
  const inspection = rental.rental_inspections as RentalInspection | null;

  return (
    <>
      {/* Header with logo */}
      <View style={s.header}>
        <Image style={s.headerLogo} src="./RMS-Logo.png" />
        <View style={s.headerText}>
          {headerLines.map((line, i) => (
            <Text
              key={`${line}-${i}`}
              style={isSupportLine(line) ? { color: "#f12924" } : undefined}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      {/* Main table */}
      <View style={s.table}>
        {/* Title */}
        <Text style={[s.tableTitle, { borderBottom: "1px solid black" }]}>
          RENTAL AGREEMENT
        </Text>

        {/* Row: Client Name | Rental No */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Client Name</Text>
          <Text style={[s.val, s.br]}>{rental.clients?.name || "---"}</Text>
          <Text style={[s.label, s.br]}>Rental No.</Text>
          <Text style={[s.val, { color: "#f12924" }]}>{rental.rental_no}</Text>
        </View>

        {/* Row: Contact | Date */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Client Number</Text>
          <Text style={[s.val, s.br]}>
            {rental.clients?.contact_number || "---"}
          </Text>
          <Text style={[s.label, s.br]}>Date</Text>
          <Text style={s.val}>{formatDate(rental.created_at)}</Text>
        </View>

        {/* Row: Email | Rental Type */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Client Email</Text>
          <Text style={[s.val, s.br]}>{rental.clients?.email || "---"}</Text>
          <Text style={[s.label, s.br]}>Rental Type</Text>
          <Text style={s.val}>{rental.rental_type}</Text>
        </View>

        {/* Printer section header */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Printer</Text>
          <Text style={[s.val, s.br]}>
            {rental.rental_assets?.unit_name || "---"}
          </Text>
          <Text style={[s.label, s.br]}>Model</Text>
          <Text style={[s.label, s.br]}>Serial Number</Text>
          <Text style={s.label}>Technician</Text>
        </View>
        <View style={s.row}>
          <Text style={[s.label, s.br]}></Text>
          <Text style={[s.val, s.br]}></Text>
          <Text style={[s.col17, s.br]}>
            {rental.rental_assets?.model || "---"}
          </Text>
          <Text style={[s.col17, s.br]}>
            {rental.rental_assets?.serial_number || "---"}
          </Text>
          <Text style={s.col17}>
            {rental.users?.fullname || "---"}
          </Text>
        </View>

        {/* Period row */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Start Date</Text>
          <Text style={[s.col17, s.br]}>{formatDate(rental.start_date)}</Text>
          <Text style={[s.label, s.br]}>End Date</Text>
          <Text style={[s.col17, s.br]}>{formatDate(rental.end_date)}</Text>
          <Text style={[s.label, s.br]}>Due Date</Text>
          <Text style={s.col17}>{formatDate(rental.due_date)}</Text>
        </View>

        {/* Rate */}
        <View style={s.row}>
          <Text
            style={[
              s.col66,
              s.br,
              {
                fontSize: 8,
                textTransform: "uppercase",
                textAlign: "center",
                fontFamily: "Montserrat-Bold",
              },
            ]}
          >
            Notes
          </Text>
          <Text style={[s.label, s.br]}>Rate</Text>
          <Text style={s.col17}>P{Number(rental.rate_amount).toFixed(2)}</Text>
        </View>
        <View style={s.row}>
          <Text style={[s.col66, s.br]}>{rental.notes || ""}</Text>
          <Text style={[s.label, s.br]}>Rate Total</Text>
          <Text style={s.col17}>P{Number(rental.rate_amount).toFixed(2)}</Text>
        </View>

        {/* Consumables */}
        {consumables.length > 0 && (
          <View style={s.row}>
            <Text
              style={[
                s.col50,
                s.br,
                {
                  fontSize: 8,
                  textTransform: "uppercase",
                  textAlign: "center",
                  fontFamily: "Montserrat-Bold",
                },
              ]}
            >
              Consumable Description
            </Text>
            <Text style={[s.label, s.br]}>Quantity</Text>
            <Text style={[s.label, s.br]}>Unit Price</Text>
            <Text style={s.label}>Amount</Text>
          </View>
        )}
        {consumables.map((c, i) => (
          <View style={s.row} key={i}>
            <Text style={[s.col50, s.br]}>{c.description}</Text>
            <Text style={[s.col17, s.br]}>{c.quantity}</Text>
            <Text style={[s.col17, s.br]}>
              P{Number(c.unit_price).toFixed(2)}
            </Text>
            <Text style={s.col17}>P{Number(c.total_amount).toFixed(2)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.row}>
          <Text style={[s.col66, s.br]}></Text>
          <Text style={[s.label, s.br, { fontSize: 10 }]}>
            Consumables Total
          </Text>
          <Text style={s.col17}>
            P{Number(rental.consumables_total).toFixed(2)}
          </Text>
        </View>
        {Number(rental.discount) > 0 && (
          <View style={s.row}>
            <Text style={[s.col66, s.br]}></Text>
            <Text style={[s.label, s.br, { fontSize: 10 }]}>Discount</Text>
            <Text style={s.col17}>
              -{" "}P{Number(rental.discount).toFixed(2)}
            </Text>
          </View>
        )}
        {Number(rental.downpayment) > 0 && (
          <View style={s.row}>
            <Text style={[s.col66, s.br]}></Text>
            <Text style={[s.label, s.br, { fontSize: 10 }]}>Downpayment</Text>
            <Text style={s.col17}>
              P{Number(rental.downpayment).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={s.row}>
          <Text style={[s.col66, s.br]}></Text>
          <Text style={[s.label, s.br, { fontSize: 10 }]}>Grand Total</Text>
          <Text style={s.col17}>
            P{Number(rental.grand_total).toFixed(2)}
          </Text>
        </View>

        {/* Terms */}
        <View style={s.row}>
          <Text
            style={{
              fontSize: 7,
              textAlign: "center",
              textTransform: "uppercase",
              width: "100%",
            }}
          >
            Terms and Condition
          </Text>
        </View>
        <View
          style={[
            s.row,
            { fontSize: 6, justifyContent: "space-between", padding: 5 },
          ]}
        >
          <View style={{ width: "45%" }}>
            <Text>
              1. This rental agreement covers the printer unit listed above. The
              client is responsible for the proper care and usage of the
              equipment.
            </Text>
            <Text>
              2. The rental rate is billed as indicated above. Late payments may
              incur additional charges.
            </Text>
            <Text>
              3. The client shall be liable for any damage, loss, or theft of the
              equipment during the rental period.
            </Text>
            <Text>
              4. Consumables used during the rental period will be charged
              separately as listed above.
            </Text>
          </View>
          <View style={{ width: "45%" }}>
            <Text>
              5. The equipment must be returned in the same condition as received,
              subject to normal wear and tear.
            </Text>
            <Text>
              6. RMS AVISHA ENTERPRISES reserves the right to inspect the
              equipment upon return and assess penalties for damage.
            </Text>
            <Text>
              7. Early termination may result in a fee not exceeding one month's
              rental.
            </Text>
            <Text>
              8. The company shall not be held liable for loss or damages in the
              event of fire, typhoon, flood, and other acts of God.
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Client Name</Text>
          <Text style={[s.col17, s.br]}>{rental.clients?.name || "---"}</Text>
          <Text style={[s.label, s.br]}>Client Signature</Text>
          <Text style={[s.col17, s.br]}></Text>
          <Text style={[s.label, s.br]}>Date of Approval</Text>
        </View>
        <View style={s.row}>
          <Text style={[s.label, s.br]}>Received by</Text>
          <Text style={[s.col17, s.br]}>
            {rental.users?.fullname || "---"}
          </Text>
          <Text style={[s.label, s.br]}>Receiver Signature</Text>
          <Text style={[s.col17, s.br]}></Text>
          <Text style={[s.label, s.br]}>Date Released</Text>
          <Text style={s.col17}>
            {rental.status === "Completed"
              ? formatDate(rental.updated_at)
              : "---"}
          </Text>
        </View>

        {/* Inspection summary if exists */}
        {inspection && (
          <>
            <View style={{ borderBottom: "1px dashed black", height: 10 }} />
            <View style={[s.row, { height: 10 }]} />
            <Text
              style={[s.tableTitle, { borderBottom: "1px solid black" }]}
            >
              RETURN INSPECTION
            </Text>
            <View style={s.row}>
              <Text style={[s.label, s.br]}>Physical Condition</Text>
              <Text style={[s.val, s.br]}>
                {inspection.physical_condition || "---"}
              </Text>
              <Text style={[s.label, s.br]}>Print Quality</Text>
              <Text style={s.val}>{inspection.print_quality || "---"}</Text>
            </View>
            {(inspection.meter_reading_start != null ||
              inspection.meter_reading_end != null) && (
              <View style={s.row}>
                <Text style={[s.label, s.br]}>Meter Start</Text>
                <Text style={[s.val, s.br]}>
                  {inspection.meter_reading_start ?? "---"}
                </Text>
                <Text style={[s.label, s.br]}>Meter End</Text>
                <Text style={s.val}>
                  {inspection.meter_reading_end ?? "---"}
                </Text>
              </View>
            )}
            {inspection.missing_items && (
              <View style={s.row}>
                <Text style={[s.label, s.br]}>Missing Items</Text>
                <Text style={s.val}>{inspection.missing_items}</Text>
              </View>
            )}
            {inspection.damage_penalty > 0 && (
              <View style={s.row}>
                <Text style={[s.label, s.br]}>Damage Penalty</Text>
                <Text style={s.val}>
                  P{Number(inspection.damage_penalty).toFixed(2)}
                </Text>
              </View>
            )}
            {inspection.notes && (
              <View style={s.row}>
                <Text style={[s.label, s.br]}>Notes</Text>
                <Text style={s.val}>{inspection.notes}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}

const Watermark = () => <Text style={s.watermark}>COPY</Text>;

export default function RentalPDF({ rental, type }: RentalPDFProps) {
  const footerText =
    rental.branches?.pdf_footer?.trim() || "No Copy no claim";

  const printBoth = (
    <>
      <Page style={s.page}>
        <Content rental={rental} />
      </Page>
      <Page style={s.page}>
        <Watermark />
        <Content rental={rental} />
        <Text style={s.footer}>{footerText}</Text>
      </Page>
    </>
  );

  const content = (
    <>
      {type === "company" && (
        <Page style={s.page}>
          <Content rental={rental} />
        </Page>
      )}
      {type === "client" && (
        <Page style={s.page}>
          <Watermark />
          <Content rental={rental} />
          <Text style={s.footer}>{footerText}</Text>
        </Page>
      )}
      {(!type || type === "both") && printBoth}
    </>
  );

  return <Document>{content}</Document>;
}

const s = StyleSheet.create({
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
  table: {
    marginTop: 10,
    display: "flex",
    border: "1px solid black",
  },
  tableTitle: {
    paddingVertical: 3,
    width: "100%",
    color: "#f12924",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Montserrat-Bold",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
  },
  br: {
    borderRight: "1px solid black",
  },
  label: {
    padding: 2,
    fontWeight: 600,
    fontSize: 7,
    width: "16.66%",
    textTransform: "uppercase",
    fontFamily: "Montserrat-Bold",
  },
  val: {
    fontSize: 9,
    width: "33.32%",
    padding: 2,
  },
  col17: {
    fontSize: 9,
    padding: 2,
    width: "16.66%",
  },
  col50: {
    fontSize: 9,
    padding: 2,
    width: "49.98%",
  },
  col66: {
    fontSize: 9,
    padding: 2,
    width: "66.64%",
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
  watermark: {
    position: "absolute",
    fontSize: 150,
    color: "rgba(150, 150, 150, 0.3)",
    fontFamily: "Montserrat-Black",
    transform: "rotate(-45deg)",
    top: "50%",
    left: "50%",
    marginLeft: -200,
    marginTop: -100,
    zIndex: -1,
  },
});
