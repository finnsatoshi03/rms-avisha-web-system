import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { generateMonochromaticColors } from "../../lib/helpers";
import { Expenses } from "../../lib/types";

const chartConfig = {
  amount: {
    label: "Amount",
  },
  bills: {
    label: "Bills",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ExpensesStatistics({
  chartData,
  analysisMessage,
}: {
  chartData: Partial<Expenses>[];
  analysisMessage: string | null;
}) {
  const [innerRadius, setInnerRadius] = React.useState(70);
  const baseColor = "#f12924";
  const numberOfShades = chartData.length;
  const monochromeColors = generateMonochromaticColors(
    baseColor,
    numberOfShades
  );

  const sortedChartData = chartData.sort((a, b) => b.amount! - a.amount!);

  const formattedChartData = sortedChartData.map((data, index) => ({
    ...data,
    fill: monochromeColors[index],
  }));

  const totalAmount = React.useMemo(() => {
    return formattedChartData.reduce((acc, curr) => acc + curr.amount!, 0);
  }, [formattedChartData]);

  React.useEffect(() => {
    const updateInnerRadius = () => {
      if (window.innerWidth < 1024) {
        setInnerRadius(50);
      } else if (window.innerWidth <= 1600) {
        setInnerRadius(55);
      } else {
        setInnerRadius(70);
      }
    };

    updateInnerRadius();
    window.addEventListener("resize", updateInnerRadius);

    return () => window.removeEventListener("resize", updateInnerRadius);
  }, []);

  return (
    <Card className="px-4 py-3 rounded-[15px] border-2 flex flex-col h-fit">
      <CardHeader className="pb-0 p-0">
        <CardTitle className="text-md font-bold font-sans tracking-normal">
          Statistics
        </CardTitle>
        {analysisMessage && (
          <CardDescription className="text-xs">
            {analysisMessage}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={formattedChartData}
              dataKey="amount"
              nameKey="bill_name"
              innerRadius={innerRadius}
              strokeWidth={5}
              paddingAngle={2.5}
              cornerRadius={10}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalAmount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Amount
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="bill_name"
                  className="text-black"
                />
              }
              iconType="circle"
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center text-left"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
