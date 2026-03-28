import { useQuery } from "@tanstack/react-query";
import { getRentalsFiltered } from "../../services/apiRentals";

export function useRentals({
  page = 1,
  limit = 10,
  searchTerm = "",
  branchId = null,
  technicianId = undefined,
  statusFilters = [],
  startDate = undefined,
  endDate = undefined,
  showOverdueOnly = false,
}: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  branchId?: number | null;
  technicianId?: string | undefined;
  statusFilters?: string[];
  startDate?: string;
  endDate?: string;
  showOverdueOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: [
      "rentals",
      page,
      limit,
      searchTerm,
      branchId,
      technicianId,
      statusFilters,
      startDate,
      endDate,
      showOverdueOnly,
    ],
    queryFn: () =>
      getRentalsFiltered({
        page,
        limit,
        searchTerm,
        branchId,
        technicianId,
        statusFilters,
        startDate,
        endDate,
        showOverdueOnly,
      }),
  });
}
