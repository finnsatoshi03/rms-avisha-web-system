import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { CreateJobOrderData } from "../../lib/types";
import { formatMachineType } from "../../lib/helpers";
import font1 from "/fonts/Montserrat-Bold.ttf";
import font2 from "/fonts/Montserrat-Black.ttf";

interface JobOrderPDFProps {
  data: CreateJobOrderData;
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

function Content({ data }: { data: CreateJobOrderData }) {
  const paymentDetails = data.payment_details || {};

  const formattedPaymentDetails = Object.entries(paymentDetails)
    .map(([method, amount]) => `${method}: ${amount}`)
    .join(", ");

  return (
    <>
      <View style={styles.header}>
        <Image style={styles.headerLogo} src="./RMS-Logo.png" />
        <View style={styles.headerText}>
          <Text>
            {data.branch_id === 1
              ? "EVERLASTING BLDG, 172"
              : "ACM BUILDING ORTIGAS AVE., BRGY"}
          </Text>
          <Text>
            {data.branch_id === 1
              ? "Rizal Ave, Taytay, 1920 Rizal"
              : "STA LUCIA DE CASTRO PASIG CITY"}
          </Text>
          <Text style={{ color: "#f12924" }}>
            Call {data.branch_id === 1 ? "(02) 8983-3684" : "(02) 8254-9823"}{" "}
            Text {data.branch_id === 1 ? "(09)43-606-4129" : "(09)94-880-8918"}
          </Text>
          <Text style={{ color: "#f12924" }}>
            CUSTOMER SERVICE:{" "}
            {data.branch_id === 1 ? "(02) 8254-4828" : "(02) 8254-9823"}
          </Text>
        </View>
      </View>
      <View style={styles.tableContainer}>
        <Text style={[styles.tableHeader, { borderBottom: "1px solid black" }]}>
          JOB ORDER
        </Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Client Name
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.name}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Order Number
          </Text>
          <Text style={[styles.tableClientInfo, { color: "#f12924" }]}>
            {data.order_no}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Client Number
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.contact_number}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Date
          </Text>
          <Text style={styles.tableClientInfo}>
            {new Date(data.date).toLocaleDateString("en-US", {
              weekday: "short", // "Wed"
              year: "numeric", // "2024"
              month: "short", // "Jul"
              day: "numeric", // "10"
            })}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Client Email
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.email}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Order Received
          </Text>
          <Text style={styles.tableClientInfo}>{data.order_received}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Problem Statement
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.problem_statement}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Brand/Model
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Serial Number
          </Text>
          <Text style={styles.tableLabel}>Machine Type</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Additional Comments
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.additional_comments}
          </Text>
          <Text style={[styles.tableCol17, { borderRight: "1px solid black" }]}>
            {data.brand_model}
          </Text>
          <Text style={[styles.tableCol17, { borderRight: "1px solid black" }]}>
            {data.serial_number}
          </Text>
          <Text style={styles.tableCol17}>
            {formatMachineType(data.machine_type)}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tabelCol66,
              {
                fontSize: 8,
                textTransform: "uppercase",
                textAlign: "center",
                borderRight: "1px solid black",
                fontFamily: "Montserrat-Bold",
              },
            ]}
          >
            Labor Description
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Rate
          </Text>
          <Text style={styles.tableLabel}>Amount</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tabelCol66, { borderRight: "1px solid black" }]}>
            {data.labor_description}
          </Text>
          <Text style={[styles.tableCol17, { borderRight: "1px solid black" }]}>
            {data.rate}
          </Text>
          <Text style={styles.tableCol17}>{data.amount}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[styles.tabelCol66, { borderRight: "1px solid black" }]}
          ></Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Labor Total
          </Text>
          <Text style={styles.tableCol17}>{data.labor_total}</Text>
        </View>
        {data.materials && data.materials?.length > 0 && (
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.tableCol49,
                {
                  fontSize: 8,
                  textTransform: "uppercase",
                  textAlign: "center",
                  borderRight: "1px solid black",
                  fontFamily: "Montserrat-Bold",
                },
              ]}
            >
              Material Description
            </Text>
            <Text
              style={[styles.tableLabel, { borderRight: "1px solid black" }]}
            >
              Quantity
            </Text>
            <Text
              style={[styles.tableLabel, { borderRight: "1px solid black" }]}
            >
              Price Per Unit
            </Text>
            <Text style={styles.tableLabel}>Amount</Text>
          </View>
        )}
        {data.materials &&
          data.materials.map((material, index) => (
            <View style={styles.tableRow} key={index}>
              {Object.entries(material)
                .filter(([key]) => key !== "material_id")
                .map(([key, value], mapIndex) => {
                  let textStyle;
                  if (mapIndex === 0) {
                    textStyle = [
                      styles.tableCol49,
                      {
                        borderRight: "1px solid black",
                      },
                    ];
                  } else if (mapIndex === 1 || mapIndex === 2) {
                    textStyle = [
                      styles.tableCol17,
                      { borderRight: "1px solid black" },
                    ];
                  }

                  return (
                    <Text key={key} style={textStyle}>
                      {value}
                    </Text>
                  );
                })}
              <Text style={styles.tableCol17}>
                {(material.quantity ?? 0) * (material.unitPrice ?? 0) || 0}
              </Text>
            </View>
          ))}
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tabelCol66,
              {
                fontSize: 8,
                textTransform: "uppercase",
                textAlign: "center",
                borderRight: "1px solid black",
                fontFamily: "Montserrat-Bold",
              },
            ]}
          >
            Accessories
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Material Total
          </Text>
          <Text style={styles.tableCol17}>{data.material_total}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tabelCol66,
              {
                borderRight: "1px solid black",
              },
            ]}
          >
            {data.accessories && data.accessories.join(", ")}
          </Text>
          <Text
            style={[
              styles.tableLabel,
              { borderRight: "1px solid black", fontSize: 10 },
            ]}
          >
            Sub Total
          </Text>
          <Text style={styles.tableCol17}>{data.sub_total}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[
              styles.tabelCol66,
              {
                borderRight: "1px solid black",
              },
            ]}
          ></Text>
          <Text
            style={[
              styles.tableLabel,
              { borderRight: "1px solid black", fontSize: 10 },
            ]}
          >
            Grand Total
          </Text>
          <Text style={styles.tableCol17}>{data.grand_total}</Text>
        </View>
        <View style={styles.tableRow}>
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
            styles.tableRow,
            { fontSize: 6, justifyContent: "space-between", padding: 5 },
          ]}
        >
          <View style={{ width: "45%" }}>
            <Text>
              1. This Quote is an estimate of repair costs based on defect(s)
              transparent during initial checking and may change during actual
              repair. In cases where there are changes in re- pair costs during
              actual repair, a new quote will be issued subject to the approval
              of the client.
            </Text>
            <Text>
              2. In case of dissapproved service quotation, a diagnostic fee of
              PHP 250.00 will be collected upon claiming of item.
            </Text>
            <Text>
              3. Forty percent (40%) of total quoted amount will be billed for
              the cancellation of approved service quotation.
            </Text>
            <Text>
              4. Free Labor charge for the same defects for 7 days from the date
              of OR while replaced parts are guaranteddfor 30 days against
              inherent defects.
            </Text>
            <Text>
              5. Storage fee of Php 450.00 per month from the receipt date of
              the notice to claim shall be imposed against unclaimed items
            </Text>
          </View>
          <View style={{ width: "45%" }}>
            <Text>
              6. RMS AVISHA ENTERPRISES reserves the right to dispose or auction
              the items without any compensation to the client if items remain
              unclaimed 1 month. From receipt of the last notification claim.
            </Text>
            <Text>
              7. Fee not exceeding Php 500 shall be charged upon request for
              delivery.
            </Text>
            <Text>8. Repair jobs are on COD basis only.</Text>
            <Text>9. This service quotation is valid only for 15 days.</Text>
            <Text>
              10. The company shall not be held liable for loss or damages of
              the unit in the event of fire, typhoon flood, and other acts of
              God not attributable to the fault of the company.
            </Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Clients name
          </Text>
          <Text style={[styles.tableCol17, { borderRight: "1px solid black" }]}>
            {data.name}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Clients Signature
          </Text>
          <Text
            style={[styles.tableCol17, { borderRight: "1px solid black" }]}
          ></Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Date of Approval
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Unit labored by
          </Text>
          <Text style={[styles.tableCol17, { borderRight: "1px solid black" }]}>
            {data.technician_id}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Receiver's Signature
          </Text>
          <Text
            style={[styles.tableCol17, { borderRight: "1px solid black" }]}
          ></Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Date released
          </Text>
          <Text style={styles.tableCol17}>
            {data.completed_at
              ? new Date(data.completed_at).toLocaleDateString("en-US", {
                  weekday: "short", // "Wed"
                  year: "numeric", // "2024"
                  month: "short", // "Jul"
                  day: "numeric", // "10"
                })
              : "---"}
          </Text>
        </View>
        <View style={{ borderBottom: "1px dashed black", height: 15 }}></View>
        <View style={[styles.tableRow, { height: 15 }]}></View>
        <View
          style={[
            {
              width: "100%",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 10,
              paddingHorizontal: 40,
            },
            styles.tableRow,
          ]}
        >
          <View style={styles.warrantyHeader}>
            <Image style={{ width: 100 }} src="./RMS-Logo.png" />
            <View style={{ fontSize: 9 }}>
              <Text>
                {data.branch_id === 1
                  ? "EVERLASTING BLDG, 172"
                  : "ACM BUILDING ORTIGAS AVE., BRGY"}
              </Text>
              <Text>
                {data.branch_id === 1
                  ? "Rizal Ave, Taytay, 1920 Rizal"
                  : "STA LUCIA DE CASTRO PASIG CITY"}
              </Text>
              <Text style={{ color: "#f12924" }}>
                Call{" "}
                {data.branch_id === 1 ? "(02) 8983-3684" : "(02) 8254-9823"}{" "}
                Text{" "}
                {data.branch_id === 1 ? "(09)43-606-4129" : "(09)94-880-8918"}
              </Text>
              <Text style={{ color: "#f12924" }}>
                CUSTOMER SERVICE:{" "}
                {data.branch_id === 1 ? "(02) 8254-4828" : "(02) 8254-9823"}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <Text style={{ fontSize: 8, textAlign: "right", marginRight: 10 }}>
              Visit our{"\n"}website for{"\n"}more info{" "}
            </Text>
            <Image style={{ width: 50 }} src="./qr_code.png" />
          </View>
        </View>
        <Text style={[styles.tableHeader, { borderBottom: "1px solid black" }]}>
          {data.status?.toLowerCase() !== "completed"
            ? "JOB ORDER"
            : "WARRANTY SLIP"}
        </Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Client Name
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.name}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Order No.
          </Text>
          <Text
            style={[
              styles.tableClientInfo,
              { color: "#f12924", fontStyle: "bold" },
            ]}
          >
            {data.order_no}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Brand Model
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.brand_model}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Date Received
          </Text>
          <Text style={[styles.tableClientInfo]}>
            {new Date(data.date).toLocaleDateString("en-US", {
              weekday: "short", // "Wed"
              year: "numeric", // "2024"
              month: "short", // "Jul"
              day: "numeric", // "10"
            })}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Serial Number
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.serial_number || "---"}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Date Released
          </Text>
          <Text style={[styles.tableClientInfo]}>
            {data.completed_at
              ? new Date(data.completed_at).toLocaleDateString("en-US", {
                  weekday: "short", // "Wed"
                  year: "numeric", // "2024"
                  month: "short", // "Jul"
                  day: "numeric", // "10"
                })
              : "---"}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Total Amount
          </Text>
          <Text
            style={[styles.tableClientInfo, { borderRight: "1px solid black" }]}
          >
            {data.grand_total}
          </Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Payment Method
          </Text>
          <Text style={[styles.tableClientInfo]}>
            {formattedPaymentDetails}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text
            style={[styles.tableCol49, { borderRight: "1px solid black" }]}
          ></Text>
          <Text style={[styles.tableLabel, { borderRight: "1px solid black" }]}>
            Signature
          </Text>
          <Text style={[styles.tableClientInfo]}></Text>
        </View>
      </View>
    </>
  );
}

const Watermark = () => <Text style={styles.watermark}>COPY</Text>;

export default function JobOrderPDF({ data, type }: JobOrderPDFProps) {
  const printBoth = (
    <>
      <Page style={styles.page}>
        <Content data={data} />
      </Page>
      <Page style={styles.page}>
        <Watermark />
        <Content data={data} />
        <Text style={styles.footer}>No Copy no claim</Text>
      </Page>
    </>
  );

  return (
    <Document>
      {type === "company" && (
        <Page style={styles.page}>
          <Content data={data} />
        </Page>
      )}
      {type === "client" && (
        <Page style={styles.page}>
          <Watermark />
          <Content data={data} />
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
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  warrantyHeader: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
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
