/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatNumberWithCommas } from "../../lib/helpers";
import { Separator } from "../ui/separator";
import { format } from "date-fns";

export default function CustomToolTip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="px-4 py-3 rounded-t-lg rounded-br-lg bg-white shadow-md">
        <h1 className="text-xs font-bold">{payload[0].name || label}</h1>
        {payload[0].payload.date && (
          <>
            <p className="font-bold">
              <span className="opacity-60 font-normal">Date:</span>{" "}
              {format(new Date(payload[0].payload.date), "MMMM dd, yyyy")}
            </p>
            <Separator className="my-1" />
          </>
        )}
        <p className="font-bold">
          <span className="opacity-60 font-normal">Total Sales:</span> ₱
          {formatNumberWithCommas(payload[0].value)}
        </p>
      </div>
    );
  }

  return null;
}
