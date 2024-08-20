import {
  ArrowRightLeft,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatNumberWithCommas } from "../../lib/helpers";
import { Separator } from "../../components/ui/separator";
import { Expenses } from "../../lib/types";

interface TotalExpenseProps {
  filteredData: Expenses[];
  percentageChange: number | null;
  analysisMessage: string | null;
  uniqueBills: number;
}

const TotalExpense = ({
  filteredData,
  percentageChange,
  analysisMessage,
  uniqueBills,
}: TotalExpenseProps) => {
  const totalExpense = filteredData
    .reduce((acc, curr) => acc + Number(curr.amount), 0)
    .toFixed(2);

  return (
    <div className="px-4 py-3 rounded-[15px] border-2">
      <h2 className="font-bold text-md">Total Expense</h2>
      <p className="text-3xl font-bold mt-3">
        ₱{formatNumberWithCommas(Number(totalExpense))}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          {percentageChange !== null && (
            <div
              className={`text-xs px-2 py-0.5 rounded-full font-bold flex gap-1 items-center w-fit ${
                percentageChange < 0
                  ? "text-green-700 bg-green-200"
                  : "text-red-700 bg-red-200"
              }`}
            >
              {percentageChange > 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              <p>
                {percentageChange.toString() === "0"
                  ? percentageChange.toFixed(2).toString().replace(/[+-]/g, "")
                  : percentageChange.toFixed(2).toString().replace(/[+-]/g, "")}
                %
              </p>
            </div>
          )}
          {analysisMessage && (
            <p
              className="text-xs mt-2 text-gray-400"
              dangerouslySetInnerHTML={{ __html: analysisMessage }}
            ></p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft
              size={24}
              className="p-1.5 rounded-full bg-red-200 text-primaryRed"
            />
            <p className="text-xs font-bold">
              {filteredData.length} Transactions
            </p>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center gap-2">
            <ReceiptText
              size={24}
              className="p-1.5 rounded-full bg-red-200 text-primaryRed"
            />
            <p className="text-xs font-bold">{uniqueBills} Bills</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalExpense;
