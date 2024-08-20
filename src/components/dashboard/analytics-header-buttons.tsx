import React, { useState } from "react";
import { Button } from "../ui/button";
import { DatePickerWithRange } from "../date-range-picker";
import { DateRange } from "react-day-picker";
import { Metrics } from "../../lib/types";
import AnalyticsDashboardPDF from "./analytics-pdf";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";

interface DateRangePickerWithExportProps {
  currentTab: string;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  defaultFromDate: Date;
  defaultToDate: Date;
  metrics: Metrics;
}

const DateRangePickerWithExport: React.FC<DateRangePickerWithExportProps> = ({
  currentTab,
  dateRange,
  setDateRange,
  defaultFromDate,
  defaultToDate,
  metrics,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert("Please select a valid date range.");
      return;
    }

    setLoading(true);

    const salesGrowthChartElement = document.querySelector(
      ".sales-growth-chart"
    ) as HTMLElement;
    const revenueBreakdownChartElement = document.querySelector(
      ".revenue-breakdown-chart"
    ) as HTMLElement;
    const salesByRegionChartElement = document.querySelector(
      ".sales-by-region-chart"
    ) as HTMLElement;
    const revenuePerTechChartElement = document.querySelector(
      ".revenue-per-tech-chart"
    ) as HTMLElement;
    const techPerformanceChartElement = document.querySelector(
      ".tech-performance-chart"
    ) as HTMLElement;

    const salesGrowthChartImage = await toPng(salesGrowthChartElement);
    const revenueBreakdownChartImage = await toPng(
      revenueBreakdownChartElement
    );
    const salesByRegionChartImage = await toPng(salesByRegionChartElement);
    const revenuePerTechChartImage = await toPng(revenuePerTechChartElement);
    const techPerformanceChartImage = await toPng(techPerformanceChartElement);

    const doc = (
      <AnalyticsDashboardPDF
        dateRange={{ from: dateRange.from, to: dateRange.to }}
        metrics={metrics}
        salesGrowthChartImage={salesGrowthChartImage}
        revenueBreakdownChartImage={revenueBreakdownChartImage}
        salesByRegionChartImage={salesByRegionChartImage}
        revenuePerTechChartImage={revenuePerTechChartImage}
        techPerformanceChartImage={techPerformanceChartImage}
      />
    );
    const asBlob = await pdf(doc).toBlob();
    saveAs(asBlob, fileName);
    setLoading(false);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fileName =
    dateRange && dateRange.from && dateRange.to
      ? `analytics_dashboard_${formatDate(dateRange.from)}_to_${formatDate(
          dateRange.to
        )}.pdf`
      : "analytics_dashboard.pdf";

  return currentTab === "analytics" ? (
    <div className="flex gap-4 items-center">
      <DatePickerWithRange
        value={dateRange}
        onChange={setDateRange}
        isAnalytics={true}
        defaultFromDate={defaultFromDate}
        defaultToDate={defaultToDate}
      />
      <Button onClick={handleExport} disabled={loading}>
        {loading ? "Generating PDF..." : "Export"}
      </Button>
    </div>
  ) : null;
};

export default DateRangePickerWithExport;
