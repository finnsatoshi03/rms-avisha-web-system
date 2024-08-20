import { useState, useEffect } from "react";
import { Filter as FilterIcon, Plus, X } from "lucide-react";
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
import { FilterSortButton } from "./filter-sort-button";
import { Input } from "./ui/input";
import { Filter } from "../lib/types";

const filterFields = {
  order_no: "Order No.",
  "clients.name": "Clients Name",
  created_at: "Date",
  machine_type: "Machine Type",
  status: "Status",
  "users.fullname": "Technician Name",
  grand_total: "Price",
};

export default function FilterButton({
  applyFilters,
  filterCount,
}: {
  applyFilters: (filters: Filter[]) => void;
  filterCount: number;
}) {
  const [isFilterActive, setFilterActive] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([]);

  useEffect(() => {
    if (filterCount === 0) {
      setFilters([]);
    }
  }, [filterCount]);

  const handleAddFilterClick = () => {
    const unusedKeys = Object.keys(filterFields).filter(
      (key) => !filters.some((filter) => filter.key === key)
    );
    if (unusedKeys.length > 0) {
      setFilters([
        ...filters,
        { key: unusedKeys[0], operator: "is", value: "" },
      ]);
    }
  };

  const handleApplyFilters = (newFilters: Filter[]) => {
    const nonEmptyFilters = newFilters.filter(
      (filter: Filter) => filter.value.trim() !== ""
    );
    applyFilters(nonEmptyFilters);
  };

  return (
    <Popover>
      <PopoverTrigger>
        <FilterSortButton
          isActive={isFilterActive}
          count={filterCount > 0}
          onToggle={() => setFilterActive(!isFilterActive)}
          icon={<FilterIcon strokeWidth={1.5} size={18} />}
          text={`Filter${filterCount > 0 ? ` (${filterCount} rules)` : ""}`}
        />
      </PopoverTrigger>
      <PopoverContent
        className="py-2 w-[350px]"
        align="start"
        onCloseAutoFocus={() => {
          setFilterActive(false);
        }}
      >
        <div className="">
          {filters.length === 0 ? (
            <div>
              <h4 className="opacity-75 text-sm">No filters applied.</h4>
              <p className="text-xs leading-4 opacity-65">
                Choose the criteria you want to focus on, like status, date, or
                technician.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filters.map((filter, index) => (
                <div
                  className="w-full grid grid-cols-[1fr_0.1fr_1fr_0.1fr] items-center justify-center gap-4"
                  key={index}
                >
                  <Select
                    value={filter.key}
                    onValueChange={(newKey) => {
                      const newFilters = [...filters];
                      newFilters[index].key = newKey;
                      setFilters(newFilters);
                    }}
                  >
                    <SelectTrigger className="text-xs h-full m-0 focus:ring-0 focus:ring-transparent p-0 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Filter By</SelectLabel>
                        {Object.entries(filterFields)
                          .filter(
                            ([key]) =>
                              !filters.some(
                                (otherFilter, otherIndex) =>
                                  otherIndex !== index &&
                                  otherFilter.key === key
                              )
                          )
                          .map(([key, label]) => (
                            <SelectItem value={key} key={key}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filter.operator}
                    onValueChange={(newOperator) => {
                      const newFilters = [...filters];
                      newFilters[index].operator = newOperator as
                        | "is"
                        | "is_not";
                      setFilters(newFilters);
                    }}
                  >
                    <SelectTrigger className="text-xs h-full m-0 focus:ring-0 focus:ring-transparent p-0 border-none w-fit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="is">is</SelectItem>
                        <SelectItem value="is_not">is not</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter a value"
                    className="h-full p-0 text-xs focus-visible:ring-0 focus-visible:ring-transparent px-2"
                    value={filter.value}
                    onChange={(e) => {
                      const newFilters = [...filters];
                      newFilters[index].value = e.target.value;
                      setFilters(newFilters);
                    }}
                  />
                  <X
                    size={14}
                    strokeWidth={1.5}
                    strokeOpacity={0.8}
                    className="cursor-pointer"
                    onClick={() => {
                      const newFilters = [...filters];
                      newFilters.splice(index, 1);
                      setFilters(newFilters);
                      handleApplyFilters(newFilters);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="h-[1px] w-full bg-gray-400 my-2 absolute left-0"></div>
          <div className="mt-4 flex justify-between">
            <button
              className="text-primaryRed text-sm flex items-center gap-1"
              onClick={handleAddFilterClick}
            >
              <Plus size={16} strokeWidth={1.5} />
              Add filter
            </button>
            <button
              className="bg-primaryRed text-xs px-2 py-1 text-white rounded-lg"
              onClick={() => handleApplyFilters(filters)}
            >
              Apply filter
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
