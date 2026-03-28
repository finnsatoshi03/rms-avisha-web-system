import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createRentalAsset,
  updateRentalAsset,
  deleteRentalAsset,
} from "../../services/apiRentalAssets";
import { CreateRentalAssetData } from "../../lib/types";

export function useCreateRentalAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRentalAssetData) => createRentalAsset(data),
    onSuccess: () => {
      toast.success("Printer added successfully");
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateRentalAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateRentalAssetData>;
    }) => updateRentalAsset(id, data),
    onSuccess: () => {
      toast.success("Printer updated successfully");
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRentalAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteRentalAsset(id),
    onSuccess: () => {
      toast.success("Printer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["rental_assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
