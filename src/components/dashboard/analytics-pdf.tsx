/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { Metrics } from "../../lib/types";
import { formatNumberWithCommas } from "../../lib/helpers";
import font1 from "/fonts/Cocogoose-Pro-Regular.ttf";
import font2 from "/fonts/Cocogoose-Pro-Italic.ttf";
import font3 from "/fonts/Cocogoose-Pro-Bold.ttf";

Font.register({
  family: "Cocogoose-Pro-Regular",
  src: font1,
});

Font.register({
  family: "Cocogoose-Pro-Italic",
  src: font2,
});

Font.register({
  family: "Cocogoose-Pro-Bold",
  src: font3,
});

interface AnalyticsDashboardPDFProps {
  dateRange: { from: Date; to: Date } | undefined;
  metrics: Metrics;
  salesGrowthChartImage: string;
  revenueBreakdownChartImage: string;
  salesByRegionChartImage: string;
  revenuePerTechChartImage: string;
  techPerformanceChartImage: string;
}

const AnalyticsDashboardPDF: React.FC<AnalyticsDashboardPDFProps> = ({
  dateRange,
  metrics,
  salesGrowthChartImage,
  revenueBreakdownChartImage,
  salesByRegionChartImage,
  revenuePerTechChartImage,
  techPerformanceChartImage,
}) => {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <Document>
      <Page style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.image} src="./RMS-Logo.png" />
          <Text style={styles.headerText}>ANALYSIS</Text>
        </View>
        <View style={styles.header}>
          <View style={styles.section}>
            <Text style={styles.company}>RMS Avisha Enterprises</Text>
            <Text style={styles.slogan}>
              "Price does not compromise Quality"
            </Text>
          </View>
          {dateRange && (
            <View style={{ display: "flex", flexDirection: "row", gap: 2 }}>
              <Text style={{ fontFamily: "Cocogoose-Pro-Bold", fontSize: 12 }}>
                Date:{" "}
              </Text>
              <Text style={{ fontFamily: "Helvetica", fontSize: 12 }}>
                {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.sectionHeader}>Metrics</Text>
        <View style={styles.section}>
          <Text style={styles.text}>
            Total Revenue:{" "}
            {formatNumberWithCommas(
              parseFloat(metrics.totalRevenue.toFixed(2))
            )}{" "}
            php
          </Text>
          <Text style={styles.text}>
            Number of Clients: {formatNumberWithCommas(metrics.numberOfClients)}
          </Text>
          <Text style={styles.text}>
            Number of Sales: {formatNumberWithCommas(metrics.numberOfSales)}
          </Text>
          <Text style={styles.text}>
            Average Order Value:{" "}
            {formatNumberWithCommas(
              parseFloat(metrics.averageOrderValue.toFixed(2))
            )}{" "}
            php
          </Text>
        </View>
        <Text style={styles.sectionHeader}>Sales and Revenue Insights</Text>
        <View>
          {salesGrowthChartImage && <Image src={salesGrowthChartImage} />}
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <View style={{ width: 270 }}>
            {revenueBreakdownChartImage && (
              <Image src={revenueBreakdownChartImage} />
            )}
          </View>
          <View style={{ width: 270 }}>
            {salesByRegionChartImage && <Image src={salesByRegionChartImage} />}
          </View>
        </View>
        <Text style={styles.sectionHeader}>
          Technician Performance Analytics
        </Text>
        <View
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <View style={{ width: 300 }}>
            {revenuePerTechChartImage && (
              <Image src={revenuePerTechChartImage} />
            )}
          </View>
          <View>
            {techPerformanceChartImage && (
              <Image src={techPerformanceChartImage} />
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default AnalyticsDashboardPDF;

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    padding: 20,
    fontFamily: "Helvetica",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  headerText: {
    fontSize: 34,
    fontFamily: "Cocogoose-Pro-Bold",
  },
  company: {
    fontSize: 12,
    fontFamily: "Cocogoose-Pro-Bold",
  },
  slogan: {
    fontSize: 8,
    fontFamily: "Cocogoose-Pro-Italic",
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Cocogoose-Pro-Bold",
    color: "white",
    width: "100%",
    paddingVertical: 5,
    paddingHorizontal: 20,
    marginBottom: 5,
    backgroundColor: "black",
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  image: {
    width: 100,
  },
});
