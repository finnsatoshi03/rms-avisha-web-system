import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface BranchWarningProps {
  message: string;
  className?: string;
}

export const BranchWarning: React.FC<BranchWarningProps> = ({
  message,
  className = "",
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full ${className}`}
          >
            <AlertTriangle size={12} strokeWidth={1.5} />
            <span>Branch Required</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
