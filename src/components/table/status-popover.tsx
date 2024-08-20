import {
  ArrowUpCircle,
  CheckCircle2,
  CircleDashed,
  CircleDotDashed,
  LucideIcon,
  XCircle,
} from "lucide-react";
import { getStatusClass } from "../../lib/helpers";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import { JobOrderData } from "../../lib/types";

export type Status = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const statuses: Status[] = [
  { value: "pending", label: "Pending", icon: CircleDashed },
  { value: "for approval", label: "For Approval", icon: CircleDashed },
  { value: "repairing", label: "Repairing", icon: CircleDotDashed },
  { value: "waiting parts", label: "Waiting Parts", icon: CircleDotDashed },
  { value: "ready for pickup", label: "Ready for Pickup", icon: ArrowUpCircle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "canceled", label: "Canceled", icon: XCircle },
];

export const StatusPopover = ({
  order,
  handleStatusChange,
  openPopover,
  setOpenPopover,
}: {
  order: JobOrderData;
  handleStatusChange: (order_no: string, status: Status) => void;
  openPopover: string | null;
  setOpenPopover: (order_no: string | null) => void;
}) => (
  <Popover
    open={openPopover === order.order_no}
    onOpenChange={(isOpen) => setOpenPopover(isOpen ? order.order_no : null)}
  >
    <PopoverTrigger asChild>
      <p
        className={`cursor-pointer px-2 py-0.5 rounded-full w-fit flex items-center font-bold ${getStatusClass(
          order.status
        )}`}
        onClick={(e) => e.stopPropagation()}
      >
        {order.status}
      </p>
    </PopoverTrigger>
    <PopoverContent className="p-0" side="right" align="start">
      <Command>
        <CommandInput placeholder="Change status..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {statuses.map((status) => (
              <span key={status.value} onClick={(e) => e.stopPropagation()}>
                <CommandItem
                  value={status.value}
                  onSelect={() => handleStatusChange(order.order_no, status)}
                  className={
                    status.value === order.status.toLowerCase()
                      ? "opacity-100 font-semibold"
                      : "opacity-70"
                  }
                >
                  <status.icon
                    className={cn(
                      "mr-2 h-4 w-4",
                      status.value === order.status.toLowerCase()
                        ? "opacity-100 text-primaryRed"
                        : "opacity-40"
                    )}
                  />
                  <span>{status.label}</span>
                </CommandItem>
              </span>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
);
