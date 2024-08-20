import { useState, useEffect } from "react";
import { SortAscIcon, X } from "lucide-react";
import { FilterSortButton } from "../components/filter-sort-button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "../components/ui/select";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Sort } from "../lib/types";

const sortFields: { [key: string]: string } = {
  order_no: "Order No.",
  "clients.name": "Clients Name",
  created_at: "Date",
  machine_type: "Machine Type",
  status: "Status",
  "users.fullname": "Technician Name",
  warranty: "Warranty",
  grand_total: "Price",
};

const clientTableSortFields: { [key: string]: string } = {
  name: "Name",
  orders: "Orders",
  total_spent: "Total Spent",
  last_order: "Last Order",
  contact_no: "Contact No.",
  email: "Email",
};

const materialTableSortFields: { [key: string]: string } = {
  sku: "SKU",
  material_name: "Name",
  price: "price",
  stocks: "Stocks",
  category: "Category",
  last_in: "Last In",
};

const expensesTableSortFields: { [key: string]: string } = {
  created_at: "Date",
  bill_name: "Bill Name",
  amount: "Amount",
};

export default function SortButton({
  applySorts,
  sortCount,
  currentSort,
  isClientsTable = false,
  isMaterialsTable = false,
  isExpensesTable = false,
}: {
  applySorts: (sorts: Sort[]) => void;
  sortCount: number;
  currentSort: Sort[];
  isClientsTable?: boolean;
  isMaterialsTable?: boolean;
  isExpensesTable?: boolean;
}) {
  const [isSortActive, setSortActive] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const [sortingList, setSortingList] = useState<Sort[]>([]);

  const fields = isClientsTable
    ? clientTableSortFields
    : isMaterialsTable
    ? materialTableSortFields
    : isExpensesTable
    ? expensesTableSortFields
    : sortFields;

  useEffect(() => {
    setSortingList(currentSort);
  }, [currentSort]);

  useEffect(() => {
    if (sortCount === 0) {
      setSortingList([]);
      setSelectedValue("");
    }
  }, [sortCount]);

  const handleApplySorts = () => {
    applySorts(sortingList);
  };

  const handleRemoveSort = (index: number) => {
    const newSortingList: Sort[] = sortingList.filter((_, i) => i !== index);
    setSortingList(newSortingList);

    if (newSortingList.length === 0) {
      setSelectedValue("");
      setSortActive(false);
    }

    applySorts(newSortingList);
  };

  return (
    <Popover>
      <PopoverTrigger>
        <FilterSortButton
          isActive={isSortActive}
          count={sortCount > 0}
          onToggle={() => setSortActive(!isSortActive)}
          icon={<SortAscIcon strokeWidth={1.5} size={18} />}
          text={`Sort${sortCount > 0 ? ` (${sortCount} rules)` : ""}`}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[350px] py-2"
        align="start"
        onCloseAutoFocus={() => setSortActive(false)}
      >
        <div>
          {sortingList.length === 0 ? (
            <div>
              <h4 className="opacity-75 text-sm">No sorts applied.</h4>
              <p className="text-xs leading-4 opacity-65">
                Add a column below to sort the view of the table.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sortingList.map((sort, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex gap-1 items-center">
                    <Label className="text-xs">
                      {index > 0 ? "then by" : "sort by"}
                    </Label>
                    <div className="text-sm font-bold">{fields[sort.key]}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor={`sort-${index}`} className="text-xs">
                        ascending:
                      </Label>
                      <Switch
                        id={`sort-${index}`}
                        className="h-4 w-6"
                        checked={sort.direction === "asc"}
                        onCheckedChange={(checked) => {
                          const newSortingList = [...sortingList];
                          newSortingList[index].direction = checked
                            ? "asc"
                            : "desc";
                          setSortingList(newSortingList);
                          applySorts(newSortingList);
                        }}
                      />
                    </div>
                    <X
                      size={14}
                      strokeWidth={1.5}
                      strokeOpacity={0.8}
                      className="cursor-pointer"
                      onClick={() => handleRemoveSort(index)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="h-[1px] w-full bg-gray-400 my-2 absolute left-0"></div>
          <div className="mt-4 flex justify-between items-center gap-5">
            <Select
              value={selectedValue}
              onValueChange={(newValue) => {
                setSelectedValue(newValue);
                const newSortingList: Sort[] = [
                  ...sortingList,
                  { key: newValue, direction: "asc" as "asc" | "desc" },
                ];
                setSortingList(newSortingList);
              }}
            >
              <SelectTrigger className="text-xs h-full m-0 focus:ring-0 focus:ring-transparent p-0 border-none">
                {selectedValue === "" ? (
                  <SelectValue placeholder="Pick a column to sort by" />
                ) : (
                  <SelectValue>{fields[selectedValue]}</SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort By</SelectLabel>
                  {Object.keys(fields)
                    .filter(
                      (key) => !sortingList.some((sort) => sort.key === key)
                    )
                    .map((key) => (
                      <SelectItem key={key} value={key}>
                        {fields[key]}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <button
              className="bg-primaryRed text-xs px-1.5 py-1 text-white rounded-lg w-[55%]"
              onClick={handleApplySorts}
            >
              Apply sorting
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
