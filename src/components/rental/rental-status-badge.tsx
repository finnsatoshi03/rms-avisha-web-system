import { getStatusClass } from "../../lib/helpers";
import { RentalStatus } from "../../lib/types";

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  return (
    <p
      className={`cursor-default px-2 py-0.5 rounded-full w-fit flex items-center font-bold text-xs ${getStatusClass(
        status
      )}`}
      onClick={(e) => e.stopPropagation()}
    >
      {status}
    </p>
  );
}
