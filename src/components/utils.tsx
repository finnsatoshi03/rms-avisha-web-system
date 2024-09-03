import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  PackageCheck,
  TruckIcon,
  WrenchIcon,
  XCircleIcon,
  ArrowDownCircleIcon,
} from "lucide-react";

export const getStatusIconAndClass = (status: string) => {
  switch (status) {
    case "Pending":
      return {
        icon: (
          <ClockIcon size={14} fill="#5e4703" className="text-background" />
        ),
      };
    case "For Approval":
      return {
        icon: (
          <AlertCircleIcon
            size={14}
            fill="#5c3c00"
            className="text-background"
          />
        ),
      };
    case "Repairing":
      return {
        icon: (
          <WrenchIcon size={14} fill="#002144" className="text-background" />
        ),
      };
    case "Waiting Parts":
      return {
        icon: (
          <PackageCheck size={14} fill="#490149" className="text-background" />
        ),
      };
    case "Ready for Pickup":
      return {
        icon: (
          <TruckIcon size={14} fill="#1c411d" className="text-background" />
        ),
      };
    case "Completed":
      return {
        icon: (
          <CheckCircleIcon
            size={14}
            fill="#414040"
            className="text-background"
          />
        ),
      };
    case "Pull Out":
      return {
        icon: (
          <ArrowDownCircleIcon
            size={14}
            fill="#b23c17"
            className="text-background"
          />
        ),
      };
    default:
      return {
        icon: (
          <XCircleIcon size={14} fill="#41120f" className="text-background" />
        ),
      };
  }
};
