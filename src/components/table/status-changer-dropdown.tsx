import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { statuses, Status } from "./status-popover";
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
        Change Status
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="p-2 bg-slate-700 border-none text-white text-sm flex flex-col">
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <Button
            key={status.value}
            className="justify-start gap-2"
            variant="ghost"
            onClick={() => onChangeStatus(status)}
          >
            <Icon size={18} strokeWidth={1.5} /> {status.label}
          </Button>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
);
