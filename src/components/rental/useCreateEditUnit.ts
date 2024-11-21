import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createUnit, updateStatus, updateUnit } from "../../services/apiUnits";

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      toast.success("Unit created successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      toast.error("Error creating unit");
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        unit_name: string;
        model: string;
        serial_number: string;
        status: "available" | "rented" | "maintenance" | "reserved";
        daily_rate: number;
        monthly_rate: number;
      };
    }) => updateUnit(id, data),
    onSuccess: () => {
      toast.success("Unit updated successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      toast.error("Error updating unit");
    },
  });
}

export function useUpdateStatusUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateStatus(id, status),
    onSuccess: () => {
      toast.success("Unit status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: () => {
      toast.error("Error updating unit status");
    },
  });
}
