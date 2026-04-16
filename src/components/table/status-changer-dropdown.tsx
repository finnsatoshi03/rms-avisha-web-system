import { Fragment } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { jobOrderStatusGroups, Status } from "./status-popover";
import { RefreshCcw } from "lucide-react";

export const StatusChanger = ({
  onChangeStatus,
}: {
  onChangeStatus: (status: Status) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="rounded-full bg-slate-700 gap-1">
        <RefreshCcw size={18} strokeWidth={1.5} />
        <span className="hidden sm:block">Change Status</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-56 p-1 bg-slate-700 border-none text-white">
      {jobOrderStatusGroups.map((group, groupIndex) => (
        <Fragment key={group.label}>
          <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {group.label}
          </DropdownMenuLabel>
          {group.items.map((status) => {
            const Icon = status.icon;
            return (
              <DropdownMenuItem
                key={status.value}
                className="cursor-pointer gap-2 text-sm text-white focus:bg-slate-600 focus:text-white"
                onClick={() => onChangeStatus(status)}
              >
                <Icon size={16} strokeWidth={1.7} />
                {status.label}
              </DropdownMenuItem>
            );
          })}
          {groupIndex < jobOrderStatusGroups.length - 1 && (
            <DropdownMenuSeparator className="my-1 bg-slate-600" />
          )}
        </Fragment>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
