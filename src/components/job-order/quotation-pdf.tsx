import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { CreateQuotationData } from "../../lib/types";
import font1 from "/fonts/Montserrat-Bold.ttf";
import font2 from "/fonts/Montserrat-Black.ttf";

interface QuotationPDFProps {
  data: CreateQuotationData & {
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
    end_date: string;
  };
  type?: "company" | "client" | "both" | null;
}

Font.register({
  family: "Montserrat-Bold",
  src: font1,
});

Font.register({
  family: "Montserrat-Black",
  src: font2,
});

// Helper function to safely format numbers
const formatCurrency = (value: number | string | undefined): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value || 0;
  return isNaN(numValue) ? "0.00" : numValue.toFixed(2);
};

function FirstPageContent() {
  return (
    <>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image style={styles.headerLogo} src="./RMS-Logo.png" />
      </View>

      {/* Company Description */}
      <View style={styles.companyDescription}>
        <Text style={styles.companyTitle}>
          RMS Avisha Enterprises –{"\n"}
          Printer, Laptop & Photocopier Repair and Rental Services{"\n"}
          Expert Repairs | Reliable Support | Flexible Rental Solutions
        </Text>

        <View style={styles.letterBody}>
          <Text style={styles.companyBody}>
            RMS Avisha Enterprises is a trusted provider of comprehensive and
            professional technical support. Committed to delivering high-quality
            repair solutions, RMS specializes in servicing a wide range of
            office and personal equipment, including printers, laptops, and
            photocopiers. With a team of experienced and certified technicians,
            the company is equipped to handle everything from minor
            troubleshooting to complex hardware and software repairs.
            Understanding the importance of device reliability for both business
            and personal use, RMS emphasizes quick turnaround times without
            compromising on service quality.
          </Text>

          <Text style={styles.companyBody}>
            In addition to repair services, RMS offers flexible and affordable
            printer rental solutions designed to meet the needs of individuals,
            small businesses, and large organizations. Whether for short-term
            projects or long-term office setups, a variety of printer models are
            available to suit specific requirements.
          </Text>

          <Text style={styles.companyBody}>
            To ensure convenience, RMS provides both walk-in services at their
            centrally located repair center and home service options for clients
            who prefer on-site repairs. This approach allows the company to
            serve customers quickly and efficiently, regardless of location. RMS
            remains committed to delivering reliable, convenient, and
            cost-effective solutions that keep essential devices operating at
            peak performance—minimizing downtime and maximizing productivity.
          </Text>
        </View>
      </View>

      {/* Best Regards Section */}
      <View style={styles.bestRegardsSection}>
        <View style={styles.ceoDetailsContainer}>
          <Text style={styles.bestRegards}>Best Regards,</Text>
          <View style={styles.signatureContainer}>
            <Image style={styles.signature} src="./RM-Signature.png" />
            <Text style={styles.ceoName}>Rosemarie S. Lacap</Text>
          </View>
          <Text style={styles.ceoTitle}>Chief Executive Officer (CEO)</Text>
        </View>
        <Image style={styles.partnershipLogo} src="./Brother-Partnership.png" />
      </View>
    </>
  );
}

function SecondPageContent({ data }: { data: QuotationPDFProps["data"] }) {
  return (
    <>
      {/* Header with Logo and Quote Info Table */}
      <View style={styles.secondPageHeader}>
        <Image style={styles.headerLogo} src="./RMS-Logo.png" />

        <View style={styles.quoteInfoTable}>
          {/* Header Row */}
          <View style={styles.quoteInfoHeaderRow}>
            <Text style={styles.quoteInfoHeaderCell}>QUOTE #</Text>
            <Text style={styles.quoteInfoHeaderCell}>DATE</Text>
          </View>
          {/* Value Row */}
          <View style={styles.quoteInfoValueRow}>
            <Text style={styles.quoteInfoValue}>{data.quote_no}</Text>
            <Text style={styles.quoteInfoValue}>
              {new Date(data.date).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          {/* Header Row 2 */}
          <View style={styles.quoteInfoHeaderRow}>
            <Text style={styles.quoteInfoHeaderCell}>JOB ORDER #</Text>
            <Text style={styles.quoteInfoHeaderCell}>END DATE</Text>
          </View>
          {/* Value Row 2 */}
          <View style={styles.quoteInfoValueRow}>
            <Text style={styles.quoteInfoValue}>{data.job_order_no}</Text>
            <Text style={styles.quoteInfoValue}>
              {new Date(data.end_date).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Client Information */}
      <View style={styles.clientInfoSection}>
        <Text style={styles.clientInfoField}>Name: {data.clientData.name}</Text>
        <Text style={styles.clientInfoField}>Company: {data.company}</Text>
        <Text style={styles.clientInfoField}>
          Contact: {data.clientData.contact_number}
        </Text>
        <Text style={styles.clientInfoField}>Address: {data.address}</Text>
      </View>

      {/* Work Description Table */}
      <View style={styles.workDescriptionTable}>
        <View style={styles.workDescriptionRow}>
          <Text style={styles.workDescriptionLabel}>Description of work</Text>
        </View>
        <View style={styles.workDescriptionRow}>
          <Text style={styles.workDescriptionContent}>
            Brand and Model: {data.clientData.brand_model}
            {"\n"}Serial Number: {data.clientData.serial_number}
            {"\n"}Problem: {data.clientData.problem_statement}
          </Text>
        </View>
      </View>

      {/* Itemized Cost Table */}
      <View style={styles.costTable}>
        <View style={styles.costTableHeader}>
          <Text style={styles.costTableHeaderCellDescription}>
            ITEMIZED COST (DESCRIPTION)
          </Text>
          <Text style={styles.costTableHeaderCellSmall}>QTY</Text>
          <Text style={styles.costTableHeaderCellMedium}>UNIT PRICE</Text>
          <Text style={styles.costTableHeaderCellMedium}>AMOUNT</Text>
        </View>

        {data.quotation_items.map((item, index) => (
          <View style={styles.costTableRow} key={index}>
            <Text style={styles.costTableDescriptionCell}>
              {item.description}
            </Text>
            <Text style={styles.costTableCellSmall}>{item.qty}</Text>
            <Text style={styles.costTableCellMedium}>
              {formatCurrency(item.unit_price)}
            </Text>
            <Text style={styles.costTableCellMedium}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}

        <View style={styles.costTableRow}>
          <Text style={styles.costTableDescriptionCell}>
            {data.note ? `NOTE: ${data.note}` : ""}
          </Text>
          <Text style={styles.costTableCellSmall}></Text>
          <Text style={styles.costTableSubtotalLabel}>SUBTOTAL</Text>
          <Text style={styles.costTableCellMedium}>
            {formatCurrency(data.subtotal)}
          </Text>
        </View>

        {data.discount > 0 && (
          <View style={styles.costTableRow}>
            <Text style={styles.costTableDescriptionCell}></Text>
            <Text style={styles.costTableCellSmall}></Text>
            <Text style={styles.costTableSubtotalLabel}>DISCOUNT</Text>
            <Text style={styles.costTableCellMedium}>
              -{formatCurrency(data.discount)}
            </Text>
          </View>
        )}

        <View style={styles.costTableRow}>
          <Text style={styles.costTableDescriptionCell}></Text>
          <Text style={styles.costTableCellSmall}></Text>
          <Text style={styles.costTableTotalLabel}>TOTAL QUOTE</Text>
          <Text style={styles.costTableTotalValue}>
            ₱{formatCurrency(data.total_quote)}
          </Text>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.termsSection}>
        <Text style={styles.termsTitle}>NO WARRANTY PARTS CONSUMABLE</Text>
        <Text style={styles.termsTitle}>SERVICE WARRANTY 1 MONTH</Text>
        <Text style={styles.termsText}>
          This quotation is not a contract or a bill. It is our best guess at
          the total price for the service and goods described above. The
          customer will be billed after indicating acceptance of this quote.
          Payment will be due prior to the delivery of service and goods. Please
          fax or mail the signed quote to the address listed above.
        </Text>
      </View>

      {/* Customer Acceptance */}
      <View style={styles.customerAcceptanceSection}>
        <View style={styles.customerAcceptanceRow}>
          <Text style={styles.customerAcceptanceLabel}>
            Customer Acceptance
          </Text>
          <Text style={styles.customerAcceptanceLabel}></Text>
        </View>
        <View style={styles.customerAcceptanceRow}>
          <Text style={styles.customerAcceptanceLine}>
            __________________________________
          </Text>
          <Text style={styles.customerAcceptanceLine}>
            __________________________________
          </Text>
        </View>
        <View style={styles.customerAcceptanceRow}>
          <Text style={styles.customerAcceptanceLabel}>
            Signature Over Printed Name
          </Text>
          <Text style={styles.customerAcceptanceLabel}>Date</Text>
        </View>
      </View>
    </>
  );
}

const Watermark = () => <Text style={styles.watermark}>COPY</Text>;

export default function QuotationPDF({ data, type }: QuotationPDFProps) {
  const printBoth = (
    <>
      <Page style={styles.page}>
        <FirstPageContent />
      </Page>
      <Page style={styles.page}>
        <Watermark />
        <SecondPageContent data={data} />
        <Text style={styles.footer}>No Copy no claim</Text>
      </Page>
    </>
  );

  return (
    <Document>
      {type === "company" && (
        <Page style={styles.page}>
          <FirstPageContent />
        </Page>
      )}
      {type === "client" && (
        <Page style={styles.page}>
          <Watermark />
          <SecondPageContent data={data} />
          <Text style={styles.footer}>No Copy no claim</Text>
        </Page>
      )}
      {!type || type === "both" ? printBoth : null}
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
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLogo: {
    width: 150,
  },
  companyDescription: {
    marginBottom: 30,
  },
  companyTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "left",
    marginBottom: 15,
    fontFamily: "Montserrat-Bold",
    lineHeight: 1.3,
  },
  letterBody: {
    marginLeft: 20,
  },
  companyBody: {
    fontSize: 9,
    textAlign: "justify",
    lineHeight: 1.4,
    marginBottom: 10,
  },
  bestRegardsSection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  bestRegards: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    marginBottom: 10,
  },
  ceoDetailsContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  signatureContainer: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 5,
  },
  signature: {
    width: 80,
    height: 40,
    position: "absolute",
    top: -10,
    zIndex: 1,
  },
  ceoName: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    marginTop: 15,
  },
  ceoTitle: {
    fontSize: 9,
    fontStyle: "italic",
  },
  partnershipSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  partnershipLogo: {
    width: 200,
  },
  secondPageHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  quoteInfoTable: {
    border: "1px solid black",
    width: "40%",
  },
  quoteInfoHeaderRow: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
    backgroundColor: "#f5f5f5",
  },
  quoteInfoValueRow: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
  },
  quoteInfoHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    width: "50%",
    textAlign: "center",
    padding: 5,
    borderRight: "1px solid black",
  },
  quoteInfoValue: {
    fontSize: 8,
    width: "50%",
    textAlign: "center",
    padding: 5,
    borderRight: "1px solid black",
  },
  clientInfoSection: {
    marginBottom: 20,
  },
  clientInfoField: {
    fontSize: 9,
    marginBottom: 5,
  },
  workDescriptionTable: {
    border: "1px solid black",
    marginBottom: 20,
  },
  workDescriptionRow: {
    borderBottom: "1px solid black",
  },
  workDescriptionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    padding: 5,
    fontFamily: "Montserrat-Bold",
  },
  workDescriptionContent: {
    fontSize: 9,
    padding: 5,
    lineHeight: 1.4,
  },
  costTable: {
    border: "1px solid black",
    marginBottom: 20,
  },
  costTableHeader: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
    backgroundColor: "#f5f5f5",
  },
  costTableHeaderCellDescription: {
    fontSize: 8,
    fontWeight: "bold",
    padding: 5,
    borderRight: "1px solid black",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
    width: "50%",
  },
  costTableHeaderCellSmall: {
    fontSize: 8,
    fontWeight: "bold",
    padding: 5,
    borderRight: "1px solid black",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
    width: "10%",
  },
  costTableHeaderCellMedium: {
    fontSize: 8,
    fontWeight: "bold",
    padding: 5,
    borderRight: "1px solid black",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
    width: "20%",
  },
  costTableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1px solid black",
  },
  costTableDescriptionCell: {
    fontSize: 9,
    padding: 5,
    width: "50%",
    borderRight: "1px solid black",
  },
  costTableCellSmall: {
    fontSize: 9,
    padding: 5,
    width: "10%",
    borderRight: "1px solid black",
    textAlign: "center",
  },
  costTableCellMedium: {
    fontSize: 9,
    padding: 5,
    width: "20%",
    borderRight: "1px solid black",
    textAlign: "center",
  },
  costTableSubtotalLabel: {
    fontSize: 9,
    padding: 5,
    width: "20%",
    borderRight: "1px solid black",
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
  },
  costTableTotalLabel: {
    fontSize: 9,
    padding: 5,
    width: "20%",
    borderRight: "1px solid black",
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
  },
  costTableTotalValue: {
    fontSize: 9,
    padding: 5,
    width: "20%",
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
    textAlign: "center",
  },
  termsSection: {
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: "Montserrat-Bold",
  },
  termsText: {
    fontSize: 8,
    textAlign: "justify",
    lineHeight: 1.3,
  },
  customerAcceptanceSection: {
    marginTop: 30,
  },
  customerAcceptanceRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerAcceptanceLabel: {
    fontSize: 9,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
  },
  customerAcceptanceLine: {
    fontSize: 9,
    marginTop: 5,
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
