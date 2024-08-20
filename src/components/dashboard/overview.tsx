import { OverviewData } from "../../lib/types";
import OverviewCard from "./overview-card";

export default function OverviewSection({
  overviewData,
}: {
  overviewData: OverviewData[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {overviewData.map((data, index) => (
        <OverviewCard data={data} key={index} />
      ))}
    </div>
  );
}
