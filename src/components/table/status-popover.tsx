import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  CircleDashed,
  CircleDotDashed,
  LucideIcon,
  XCircle,
  Wallet,
  Receipt,
  Truck,
  PlayCircle,
  RotateCcw,
  Wrench,
  Power,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { JobOrderData } from "../../lib/types";

export type Status = {
  value: string;
  label: string;
  icon: LucideIcon;
};

// ── Job Order statuses ──
export const statuses: Status[] = [
  { value: "pending", label: "Pending", icon: CircleDashed },
  { value: "for approval", label: "For Approval", icon: CircleDashed },
  { value: "repairing", label: "Repairing", icon: CircleDotDashed },
  { value: "waiting parts", label: "Waiting Parts", icon: CircleDotDashed },
  { value: "ready for pickup", label: "Ready for Pickup", icon: ArrowUpCircle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "canceled", label: "Canceled", icon: XCircle },
  { value: "pull out", label: "Pull Out", icon: ArrowDownCircle },
  { value: "for collection", label: "For Collection", icon: Wallet },
  { value: "for billing", label: "For Billing", icon: Receipt },
];

// ── Rental statuses ──
export const rentalStatuses: Status[] = [
  { value: "created", label: "Created", icon: CircleDashed },
  { value: "released", label: "Released", icon: Truck },
  { value: "ongoing", label: "Ongoing", icon: PlayCircle },
  { value: "returned", label: "Returned", icon: RotateCcw },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

// ── Rental asset statuses ──
export const rentalAssetStatuses: Status[] = [
  { value: "available", label: "Available", icon: CheckCircle2 },
  { value: "rented", label: "Rented", icon: Truck },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "retired", label: "Retired", icon: Power },
];

// ── Original JO-specific popover (unchanged API) ──
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
        )} cursor-not-allowed pointer-events-none`}
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

// ── Generic status badge — uses the same Popover wrapper as JO ──
export function StatusBadge({
  status,
  statusList,
  tooltip,
}: {
  status: string;
  statusList?: Status[];
  tooltip?: string;
}) {
  const matched = (statusList || []).find(
    (s) => s.value === status.toLowerCase()
  );

  const badge = (
    <p
      className={`cursor-pointer px-2 py-0.5 rounded-full w-fit flex items-center font-bold ${getStatusClass(
        status
      )} cursor-not-allowed pointer-events-none`}
      onClick={(e) => e.stopPropagation()}
    >
      {matched?.label || status}
    </p>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {tooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          badge
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0" side="right" align="start">
        <Command>
          <CommandInput placeholder="Change status..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {(statusList || []).map((s) => (
                <span key={s.value} onClick={(e) => e.stopPropagation()}>
                  <CommandItem
                    value={s.value}
                    className={
                      s.value === status.toLowerCase()
                        ? "opacity-100 font-semibold"
                        : "opacity-70"
                    }
                  >
                    <s.icon
                      className={cn(
                        "mr-2 h-4 w-4",
                        s.value === status.toLowerCase()
                          ? "opacity-100 text-primaryRed"
                          : "opacity-40"
                      )}
                    />
                    <span>{s.label}</span>
                  </CommandItem>
                </span>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
