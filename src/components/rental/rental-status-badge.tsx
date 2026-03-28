import { Badge } from "../ui/badge";
import { RentalStatus } from "../../lib/types";

const statusConfig: Record<
  RentalStatus,
  { label: string; variant: string; className: string }
> = {
  Created: {
    label: "Created",
    variant: "secondary",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
  Released: {
    label: "Released",
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
  Ongoing: {
    label: "Ongoing",
    variant: "secondary",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  Returned: {
    label: "Returned",
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  Completed: {
    label: "Completed",
    variant: "secondary",
    className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  Cancelled: {
    label: "Cancelled",
    variant: "secondary",
    className: "bg-red-100 text-red-700 border-red-300",
  },
};

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const config = statusConfig[status] || statusConfig.Created;

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
