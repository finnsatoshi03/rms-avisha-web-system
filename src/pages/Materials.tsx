import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import ColumnVisibilityDropdown from "../components/column-visibility-drop-down";
import SortButton from "../components/sort-button";
import HeaderText from "../components/ui/headerText";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";

import { MaterialStocks, Sort } from "../lib/types";
import MaterialsTable from "../components/materials/table";
import { useQuery } from "@tanstack/react-query";
import { getMaterialStocks } from "../services/apiMaterials";
import Loader from "../components/ui/loader";

import MaterialForm from "../components/materials/material-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useUser } from "../components/auth/useUser";

const viewColumns = [
  {
    key: "sku",
    title: "SKU",
  },
  // {
  //   key: "category",
  //   title: "Category",
  // },
  {
    key: "last_in",
    title: "Last In",
  },
];

export default function Materials() {
  const { isTaytay, isPasig } = useUser();

  const { data: stocks, isLoading } = useQuery({
    queryKey: ["materialStocks", { fetchAll: false }],
    queryFn: () => getMaterialStocks({ fetchAll: false }),
  });
  const materials = useMemo(() => {
    if (!stocks) return [];

    return stocks.filter((stock: MaterialStocks) => {
      // If no branch_id is set, show in both branches
      if (!stock.branch_id) return true;

      // Otherwise, filter by branch
      return isTaytay
        ? stock.branches?.location === "Taytay"
        : isPasig
        ? stock.branches?.location === "Pasig"
        : true;
    });
  }, [stocks, isTaytay, isPasig]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [filteredData, setFilteredData] = useState<MaterialStocks[]>(
    materials || []
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewColumns.map((col) => col.key)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState<MaterialStocks[]>([]);

  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (materials) {
      setFilteredData(filterAndSortData(materials));
    }
  }, [materials, searchTerm, sorts]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage, itemsPerPage]);

  const filterAndSortData = (data: MaterialStocks[] | undefined) => {
    if (!data) return [];

    const searchFilteredData = data.filter((item: MaterialStocks) => {
      // Convert relevant fields to a single string and then perform the search
      const searchableStr = [
        item.sku,
        item.material_name,
        item.brand,
        item.stocks,
        item.category,
        item.price,
        new Date(item.last_stocks_added).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Singapore",
        }),
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

        if (sort.key === "last_in") {
          aValue = new Date(a.last_stocks_added).getTime();
          bValue = new Date(b.last_stocks_added).getTime();
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
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

  const handleSortChange = (column: string, direction: "asc" | "desc") => {
    applySorts([{ key: column, direction }]);
  };

  const resetFiltersAndSort = () => {
    setSearchTerm("");
    setSorts([]);
  };

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns((prevVisibleColumns) =>
      isVisible
        ? [...prevVisibleColumns, column]
        : prevVisibleColumns.filter((col) => col !== column)
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="h-full">
      <HeaderText>Materials</HeaderText>
      <div className="my-4 flex sm:flex-row flex-col sm:gap-0 gap-2 justify-between">
        <div className="flex items-center gap-3">
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
            applySorts={applySorts}
            sortCount={sorts.length}
            currentSort={sorts}
            isMaterialsTable
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
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger
              className="relative overflow-hidden flex justify-center group/modal-btn px-4 py-1 h-fit w-fit text-sm border border-primaryRed hover:border-hoveredRed text-primaryRed hover:text-hoveredRed items-center rounded-lg gap-1 bg-none hover:bg-none text-nowrap"
              onClick={() => setOpenModal(true)}
            >
              <span className="group-hover/modal-btn:translate-x-40 flex items-center gap-1 text-center transition duration-500">
                Add Material
              </span>
              <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-black z-20">
                <Plus size={18} />
              </div>
            </DialogTrigger>
            <DialogContent className="h-fit">
              <DialogTitle className="font-bold">Add New Materials</DialogTitle>
              {/* <Separator className="my-2" /> */}
              <DialogDescription className="hidden"></DialogDescription>
              <MaterialForm onClose={() => setOpenModal(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <ColumnVisibilityDropdown
          viewColumns={viewColumns}
          visibleColumns={visibleColumns}
          handleToggleColumn={handleToggleColumn}
        />
      </div>
      <MaterialsTable
        data={paginatedData}
        visibleColumns={visibleColumns}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredData.length}
        handlePageChange={handlePageChange}
        handleItemsPerPageChange={handleItemsPerPageChange}
        handleSortChange={handleSortChange}
        handleColumnVisibilityChange={handleColumnVisibilityChange}
        currentSort={sorts}
      />
    </div>
  );
}
