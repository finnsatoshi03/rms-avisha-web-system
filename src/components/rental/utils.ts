import { differenceInDays } from "date-fns";

export const handleRateChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  field: { onChange: (value: number) => void }
) => {
  const value = e.target.value;
  if (/^\d*\.?\d{0,2}$/.test(value)) {
    field.onChange(Number(value));
  }
};

export const calculateRentalAmount = (
  startDate?: Date,
  endDate?: Date,
  rateAmount?: number,
  rentalType?: "DAILY" | "MONTHLY"
) => {
  if (!startDate || !endDate || !rateAmount || !rentalType) return 0;

  if (rentalType === "DAILY") {
    const days = differenceInDays(endDate, startDate) + 1;
    return Math.max(0, days) * rateAmount;
  } else if (rentalType === "MONTHLY") {
    // Calculate the number of complete or partial months
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1; // Add 1 to include both start and end month

    return Math.max(0, months) * rateAmount;
  }

  return 0;
};

export const statusColorMap = {
  available: "bg-green-100 text-green-800",
  rented: "bg-red-100 text-red-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  reserved: "bg-blue-100 text-blue-800",
};
