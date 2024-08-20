// @ts-nocheck // for build only remove on development
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import SortButton from "../components/sort-button";
import HeaderText from "../components/ui/headerText";
import ColumnVisibilityDropdown from "../components/column-visibility-drop-down";
import { Button } from "../components/ui/button";
import Loader from "../components/ui/loader";

import { Client, JobOrderData, Sort } from "../lib/types";
import { getClientsWithJobOrders } from "../services/apiClients";
import ClientsTable from "../components/clients/table";
import { formatTimeAgo } from "../lib/helpers";
import { Input } from "../components/ui/input";
import { useUser } from "../components/auth/useUser";

const viewColumns = [
  {
    key: "total_spent",
    title: "Total Spent",
  },
  {
    key: "last_order",
    title: "Last Order",
  },
  {
    key: "contact_no",
    title: "Contact No.",
  },
  {
    key: "email",
    title: "Email",
  },
];

const totalSpent = (client: Client) => {
  const orders = client.joborders;
  if (!orders) return 0;
  return Object.values(orders).reduce(
    (acc, order) => acc + (order?.grand_total || 0),
    0
  );
};

const lastOrder = (client: Client) => {
  const orders = client.joborders;
  if (!orders) return null;
  const orderDates = Object.values(orders).map(
    (order) => new Date(order?.created_at)
  );
  const lastOrderDate = orderDates.length
    ? new Date(Math.max(...orderDates.map((date) => date.getTime())))
    : null;
  return lastOrderDate ? formatTimeAgo(lastOrderDate) : null;
};

export default function Clients() {
  const { isTaytay, isPasig } = useUser();

  const { data: c, isLoading } = useQuery({
    queryKey: ["client"],
    queryFn: getClientsWithJobOrders,
  });
  const clients = useMemo(() => {
    if (!c) return [];

    return c
      .map((client: Client) => {
        if (!client.joborders) return null;

        const jobOrders = Array.isArray(client.joborders)
          ? client.joborders
          : Object.values(client.joborders);

        const filteredJobOrders = jobOrders.filter((joborder: JobOrderData) => {
          if (isTaytay) {
            return joborder?.branches?.location === "Taytay";
          } else if (isPasig) {
            return joborder?.branches?.location === "Pasig";
          } else {
            return true;
          }
        });

        return filteredJobOrders.length > 0
          ? { ...client, joborders: filteredJobOrders }
          : null;
      })
      .filter((client) => client !== null);
  }, [c, isTaytay, isPasig]);

  const [sorts, setSorts] = useState<Sort[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<Client[]>(clients || []);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewColumns.map((col) => col.key)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedData, setPaginatedData] = useState<Client[]>([]);

  useEffect(() => {
    if (clients) {
      setFilteredData(filterAndSortData(clients));
    }
  }, [clients, searchTerm, sorts]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedData(filteredData?.slice(startIndex, endIndex) || []);
  }, [filteredData, currentPage, itemsPerPage]);

  const applySorts = (newSorts: Sort[]) => {
    setSorts(newSorts);
  };

  const filterAndSortData = (data: Client[] | undefined) => {
    if (!data) return [];

    const getItemValue = (item: Client, key: string): any => {
      if (key === "total_spent") {
        return totalSpent(item);
      }
      if (key === "last_order") {
        return lastOrder(item);
      }
      if (key === "contact_no") {
        return item.contact_number || "";
      }

      if (key === "orders") {
        return Object.values(item.joborders ?? {}).length;
      }

      const keys = key.split(".");
      let value: any = item;
      for (const k of keys) {
        value = value ? value[k] : "";
      }
      return value ?? "";
    };

    const convertToSeconds = (timeAgo: string): number => {
      const units = {
        sec: 1,
        min: 60,
        hr: 3600,
        day: 86400,
        month: 2592000,
        yr: 31104000,
        decade: 311040000,
      };
      const [value, unit] = timeAgo.split(" ");
      const number = parseInt(value, 10);
      return (
        number * (units[unit.replace(/s$/, "") as keyof typeof units] || 0)
      );
    };

    const searchFilteredData = data.filter((item: Client) => {
      return (
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        ["total_spent", "orders", "last_order"].some((key) =>
          String(getItemValue(item, key))
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    });

    const sortedData = [...searchFilteredData];
    sorts.forEach((sort) => {
      sortedData.sort((a, b) => {
        const aValue = getItemValue(a, sort.key);
        const bValue = getItemValue(b, sort.key);

        if (sort.key === "last_order") {
          return sort.direction === "asc"
            ? convertToSeconds(aValue) - convertToSeconds(bValue)
            : convertToSeconds(bValue) - convertToSeconds(aValue);
        }

        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          return sort.direction === "asc"
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }

        return sort.direction === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    });

    return sortedData;
  };

  // const resetFilters = () => {
  //   setSearchTerm("");
  // };

  const resetFiltersAndSort = () => {
    setSorts([]);
    setSearchTerm("");
  };
  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const handleSortChange = (column: string, direction: "asc" | "desc") => {
    applySorts([{ key: column, direction }]);
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
      <HeaderText>Clients</HeaderText>
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
            isClientsTable
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
        </div>
        <ColumnVisibilityDropdown
          viewColumns={viewColumns}
          visibleColumns={visibleColumns}
          handleToggleColumn={handleToggleColumn}
        />
      </div>
      <ClientsTable
        data={paginatedData || []}
        // resetFilters={resetFilters}
        visibleColumns={visibleColumns}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredData?.length ?? 0}
        handlePageChange={handlePageChange}
        handleItemsPerPageChange={handleItemsPerPageChange}
        handleSortChange={handleSortChange}
        handleColumnVisibilityChange={handleColumnVisibilityChange}
        currentSort={sorts}
        totalSpent={totalSpent}
        lastOrder={lastOrder}
      />
    </div>
  );
}
