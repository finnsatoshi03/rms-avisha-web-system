/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useExpenses } from "../components/expenses/useExpenses";

import { Plus, Search, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Expenses as ExpensesType, Sort } from "../lib/types";
import { formatNumberWithCommas } from "../lib/helpers";

import HeaderText from "../components/ui/headerText";
import Loader from "../components/ui/loader";
import { DatePickerWithRange } from "../components/date-range-picker";
import { Input } from "../components/ui/input";
import SortButton from "../components/sort-button";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import Table from "../components/expenses/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import ExpensesForm from "../components/expenses/expenses-form";
import TotalExpense from "../components/expenses/total-expenses-card";
import { ExpensesStatistics } from "../components/expenses/expenses-statistics";
import { useUser } from "../components/auth/useUser";

export default function Expenses() {
  const { expenses: expenseData, isLoading } = useExpenses();
  const { isAdmin, isTaytay, isPasig } = useUser();

  const expenses: ExpensesType[] = useMemo(() => {
    if (!expenseData) return [];

    let branchId: number;
    if (isTaytay) {
      branchId = 1;
    } else if (isPasig) {
      branchId = 2;
    } else if (isAdmin) {
      // Admin sees all branches, no filtering needed
      return expenses;
    }

    // Filter based on branch_id for Taytay and Pasig
    return expenseData?.filter((expense) => expense.branch_id === branchId);
  }, [expenseData, isTaytay, isPasig, isAdmin]);

  const defaultToDate = endOfMonth(new Date());

  const [defaultFromDate, setDefaultFromDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultFromDate,
    to: defaultToDate,
  });
  const [filteredExpenses, setFilteredExpenses] = useState(expenses);

  const [sorts, setSorts] = useState<Sort[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<ExpensesType[]>(
    filteredExpenses || []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState<ExpensesType[]>([]);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [currentExpense, setCurrentExpense] = useState<ExpensesType | null>(
    null
  );

  const [percentageChange, setPercentageChange] = useState<number | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [statisticsAnalysisMessage, setStatisticsAnalysisMessage] = useState<
    string | null
  >(null);

  const [openModal, setOpenModal] = useState(false);

  const uniqueBills = new Set(
    filteredData.map((expense) => expense.bill_name.toLowerCase())
  ).size;

  const chartData: Partial<ExpensesType>[] = Object.values(
    filteredData.reduce(
      (acc: Record<string, { bill_name: string; amount: number }>, curr) => {
        const billName = curr.bill_name.toLowerCase();
        if (!acc[billName]) {
          acc[billName] = { bill_name: billName, amount: 0 };
        }
        acc[billName].amount += curr.amount;
        return acc;
      },
      {}
    )
  );

  const filterAndSortData = (data: ExpensesType[] | undefined) => {
    if (!data) return [];

    const searchFilteredData = data.filter((item: ExpensesType) => {
      // Convert relevant fields to a single string and then perform the search
      const searchableStr = [
        new Date(item.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Singapore",
        }),
        item.bill_name,
        item.amount,
      ]
        .join(" ")
        .toLowerCase();

      return searchableStr.includes(searchTerm.toLowerCase());
    });

    const sortedData = [...searchFilteredData];
    sorts.forEach((sort) => {
      sortedData.sort((a, b) => {
        let aValue = a[sort.key];
        let bValue = b[sort.key];

        if (sort.key === "created_at") {
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          return sort.direction === "asc"
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }

        if (aValue < bValue) {
          return sort.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sort.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    });

    return sortedData;
  };

  const applySorts = (newSorts: Sort[]) => {
    setSorts(newSorts);
  };

  const handleSortChange = (column: string, direction: any) => {
    applySorts([{ key: column, direction }]);
  };

  const resetFiltersAndSort = () => {
    setSearchTerm("");
    setSorts([]);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const earliestDate = new Date(
        Math.min(
          ...expenses.map((expense) => new Date(expense.created_at).getTime())
        )
      );
      setDefaultFromDate(earliestDate);
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    } else {
      const today = new Date();
      setDefaultFromDate(startOfMonth(today));
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    }
  }, [expenses]);

  useEffect(() => {
    if (expenses && dateRange?.from && dateRange?.to) {
      const filtered = expenses.filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate >= dateRange.from! && expenseDate <= dateRange.to!;
      });
      setFilteredExpenses(filtered);
    } else {
      setFilteredExpenses(expenses);
    }
  }, [dateRange, expenses]);

  useEffect(() => {
    if (filteredExpenses) {
      setFilteredData(filterAndSortData(filteredExpenses));
    }
  }, [filteredExpenses, searchTerm, sorts]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage, itemsPerPage]);

  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));

      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return (
          expenseDate >= startOfCurrentMonth && expenseDate <= endOfCurrentMonth
        );
      });

      const lastMonthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate >= startOfLastMonth && expenseDate <= endOfLastMonth;
      });

      const totalCurrentMonth = currentMonthExpenses.reduce(
        (acc, curr) => acc + Number(curr.amount),
        0
      );
      const totalLastMonth = lastMonthExpenses.reduce(
        (acc, curr) => acc + Number(curr.amount),
        0
      );

      const spentDifference = totalCurrentMonth - totalLastMonth;
      const percentageChange =
        totalLastMonth === 0
          ? null
          : ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;

      setPercentageChange(percentageChange);

      let message = "";
      if (spentDifference > 0) {
        message = `The company spent an extra <span style="font-weight:bold; color:black;">₱${formatNumberWithCommas(
          Number(spentDifference.toFixed(2))
        )}</span> compared to last month.`;
      } else if (spentDifference < 0) {
        message = `The company saved <span style="font-weight:bold; color:black;">₱${formatNumberWithCommas(
          Number(Math.abs(spentDifference).toFixed(2))
        )}</span> compared to last month.`;
      } else {
        message = "The company's spending is the same as last month.";
      }

      setAnalysisMessage(message);
    }
  }, [expenses]);

  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const totalExpensesAllTime = expenses.reduce(
        (acc, curr) => acc + Number(curr.amount),
        0
      );

      const totalExpensesLastMonth = expenses
        .filter((expense) => {
          const expenseDate = new Date(expense.created_at);
          const now = new Date();
          const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          return (
            expenseDate >= startOfLastMonth && expenseDate <= endOfLastMonth
          );
        })
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      let statisticsMessage = "";

      if (totalExpensesLastMonth > totalExpensesAllTime * 0.0833) {
        // 1/12 of the total expenses
        statisticsMessage =
          "The company has an increase of expenses in several bills this month.";
      } else if (totalExpensesLastMonth < totalExpensesAllTime * 0.0833) {
        statisticsMessage =
          "The company has a decrease in expenses this month compared to the overall average.";
      } else {
        statisticsMessage =
          "The company’s expenses this month are consistent with the overall average.";
      }

      setStatisticsAnalysisMessage(statisticsMessage);
    }
  }, [expenses]);

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full">
      <div className="flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <HeaderText>Expenses</HeaderText>
        <DatePickerWithRange
          isAnalytics
          defaultFromDate={defaultFromDate}
          defaultToDate={defaultToDate}
          value={dateRange}
          onChange={setDateRange}
        />
      </div>
      <div className="my-4 flex items-center gap-3">
        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
            placeholder="Search.."
          />
          <Search className="absolute left-3 top-2 opacity-60" size={14} />
        </div>
        <SortButton
          isExpensesTable
          applySorts={applySorts}
          sortCount={sorts.length}
          currentSort={sorts}
        />
        {(searchTerm || sorts.length > 0) && (
          <Button
            variant="ghost"
            className="h-fit w-fit p-0 px-3 py-1.5 gap-1 rounded-lg"
            onClick={resetFiltersAndSort}
          >
            Reset <X size={16} strokeWidth={1.5} />
          </Button>
        )}
        <Separator orientation="vertical" className="mx-2 h-[1.5rem]" />
        <Dialog
          open={openModal}
          onOpenChange={(isOpen) => {
            if (isOpen && !currentEditId) {
              setCurrentExpense(null);
              setCurrentEditId(null);
            }
            setOpenModal(isOpen);
          }}
        >
          <DialogTrigger
            className="relative overflow-hidden flex justify-center group/modal-btn px-4 py-1 h-fit w-fit text-sm border border-primaryRed hover:border-hoveredRed text-primaryRed hover:text-hoveredRed items-center rounded-lg gap-1 bg-none hover:bg-none text-nowrap"
            onClick={() => {
              setCurrentExpense(null);
              setCurrentEditId(null);
              setOpenModal(true);
            }}
          >
            <span className="group-hover/modal-btn:translate-x-40 flex items-center gap-1 text-center transition duration-500">
              Add New Entry
            </span>
            <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-black z-20">
              <Plus size={18} />
            </div>
          </DialogTrigger>
          <DialogContent className="h-fit w-[400px] space-y-0 gap-1">
            <DialogTitle className="font-bold">Add New Entry</DialogTitle>
            <DialogDescription>Input the company's expenses.</DialogDescription>
            <ExpensesForm
              expenseToEdit={currentExpense ? currentExpense : undefined}
              onClose={() => setOpenModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid md:grid-cols-[1fr_0.3fr] grid-cols-1 gap-8 overflow-hidden">
        <Table
          data={paginatedData}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredData.length}
          handlePageChange={handlePageChange}
          handleItemsPerPageChange={handleItemsPerPageChange}
          handleSortChange={handleSortChange}
          currentSort={sorts}
          onOpen={() => setOpenModal(true)}
          onExpenseSelect={(expense) => {
            setCurrentExpense(expense);
            setCurrentEditId(expense ? expense.id : null);
          }}
        />
        <div className="space-y-4 md:flex hidden flex-col h-full overflow-y-auto">
          <TotalExpense
            filteredData={filteredData}
            percentageChange={percentageChange}
            analysisMessage={analysisMessage}
            uniqueBills={uniqueBills}
          />
          <ExpensesStatistics
            chartData={chartData}
            analysisMessage={statisticsAnalysisMessage}
          />
        </div>
      </div>
    </div>
  );
}
