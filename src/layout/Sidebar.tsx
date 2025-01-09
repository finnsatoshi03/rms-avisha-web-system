import { NavLink } from "react-router-dom";
import {
  Archive,
  ChevronDown,
  EllipsisVertical,
  Handshake,
  Home,
  Printer,
  ReceiptText,
  Settings,
  UserRoundCog,
  UsersRound,
  WalletMinimal,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import Logout from "../components/auth/logout";
import { cn } from "../lib/utils";
import { useUser } from "../components/auth/useUser";
import { useState } from "react";

export default function Sidebar({
  className,
  isUser,
  onClose, // New prop to handle sidebar close
}: {
  className?: string;
  isUser?: boolean;
  onClose?: () => void;
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(true);

  return (
    <nav
      className={cn(
        "flex flex-col justify-between min-h-screen overflow-y-auto w-[250px] lg:w-full bg-white lg:shadow-none shadow-lg",
        className
      )}
    >
      <img src="/RMS-Logo.png" alt="RMS Logo" className="w-3/4" />
      <ul className="flex flex-col justify-between h-[calc(100%-20%-2rem)] w-full">
        <div className="flex flex-col space-y-1">
          <li>
            <button
              onClick={() => setIsHomeOpen(!isHomeOpen)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors opacity-50"
            >
              <div className="flex items-center gap-4">
                <Home size={20} />
                Home
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isHomeOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isHomeOpen && (
              <div className="ml-5 pl-3 border-l-2 border-slate-200 mt-1 space-y-1">
                <NavLink
                  to="dashboard/job-order"
                  className="flex items-center gap-4 px-3 !py-1.5 rounded-lg"
                  onClick={onClose}
                >
                  Job Order
                </NavLink>
                <NavLink
                  to="dashboard/rental"
                  className="flex items-center gap-4 px-3 !py-1.5 rounded-lg"
                  onClick={onClose}
                >
                  Rental
                </NavLink>
              </div>
            )}
          </li>
          {!isUser ? (
            <>
              <li>
                <NavLink
                  to="job-orders"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <Printer size={20} />
                  Job Orders
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="rental"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <Handshake size={20} />
                  Rental
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="billing-statement"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <ReceiptText size={20} />
                  Billing Statement
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="materials"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <Archive size={20} />
                  Materials
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="expenses"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <WalletMinimal size={20} />
                  Expenses
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="clients"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <UsersRound size={20} />
                  Clients
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="technicians"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <Wrench size={20} />
                  Technicians
                </NavLink>
              </li>
            </>
          ) : (
            <li>
              <NavLink
                to="job-orders"
                className="flex items-center gap-4"
                onClick={onClose}
              >
                <Printer size={20} />
                Job Orders
              </NavLink>
            </li>
          )}
        </div>
        <div className={`${!isUser && "pt-4 border-t"}`}>
          {!isUser && (
            <li>
              <NavLink
                to="settings"
                className="flex items-center gap-4"
                onClick={onClose}
              >
                <Settings size={20} />
                Settings
              </NavLink>
            </li>
          )}
          <li className="mt-4">
            <Popover>
              <div className="flex justify-between px-3 py-4 rounded-md bg-slate-200">
                <div className="flex gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={user?.user_metadata.avatar || "/RMS-icon.png"}
                    />
                    <AvatarFallback>RMS</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-bold text-sm leading-3">
                      {user
                        ? user?.user_metadata.fullname
                          ? user?.user_metadata.fullname
                          : user?.email
                        : "H3cker"}
                    </p>
                    <p className="opacity-60 text-xs font-semibold">
                      {user
                        ? user?.user_metadata.role
                          ? user?.user_metadata.role
                          : user?.role
                        : "H3cker"}
                    </p>
                  </div>
                </div>
                <PopoverTrigger onClick={() => setOpen(true)} asChild>
                  <EllipsisVertical size={14} className="cursor-pointer" />
                </PopoverTrigger>
              </div>
              {open && (
                <PopoverContent
                  className="p-3 max-w-[200px] flex flex-col gap-1"
                  side="right"
                  align="end"
                  usePortal
                >
                  <NavLink
                    to="account"
                    className="flex gap-2"
                    onClick={() => {
                      setOpen(false);
                      onClose?.();
                    }}
                  >
                    <UserRoundCog size={20} />
                    Account
                  </NavLink>
                  <Logout />
                </PopoverContent>
              )}
            </Popover>
          </li>
        </div>
      </ul>
    </nav>
  );
}
