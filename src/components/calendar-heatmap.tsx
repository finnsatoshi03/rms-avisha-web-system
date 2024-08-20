// @ts-nocheck

import { format } from "date-fns";
import CalendarHeatmap from "react-calendar-heatmap";

interface Props {
  values: { date: string; count: number }[];
  selectedYear: number;
}

CalendarHeatmap.prototype.getHeight = function () {
  return (
    this.getWeekWidth() + (this.getMonthLabelSize() - this.props.gutterSize)
  );
};

const CalendarHeatmapComponent = ({ values, selectedYear }: Props) => (
  <CalendarHeatmap
    showWeekdayLabels
    startDate={new Date(`${selectedYear}-01-01`)}
    endDate={new Date(`${selectedYear}-12-31`)}
    values={values}
    classForValue={(value: Record<string, number>) => {
      if (!value || value.count === 0) {
        return "color-scale-0";
      } else if (value.count >= 1 && value.count <= 3) {
        return "color-scale-1";
      } else if (value.count >= 4 && value.count <= 6) {
        return "color-scale-2";
      } else if (value.count >= 7 && value.count <= 10) {
        return "color-scale-3";
      } else {
        return "color-scale-4";
      }
    }}
    tooltipDataAttrs={(value: Record<string, number>) => {
      let tooltipContent;
      if (!value.count) {
        tooltipContent = `No repair${value.count === 1 ? "" : "s"} on ${format(
          new Date(value.date),
          "MMMM do yyyy"
        )}`;
      } else {
        tooltipContent = `${value.count} repair${
          value.count === 1 ? "" : "s"
        } on ${format(new Date(value.date), "MMMM do yyyy")}`;
      }
      return {
        "data-tooltip-id": "my-tooltip",
        "data-tooltip-content": tooltipContent,
      };
    }}
  />
);

export default CalendarHeatmapComponent;
