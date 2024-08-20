import { NavLink } from "react-router-dom";
import {
  Archive,
  EllipsisVertical,
  Home,
  Printer,
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

  return (
    <nav
      className={cn(
        "flex flex-col justify-between min-h-screen w-[25%] lg:w-full bg-white xl:shadow-none md:shadow-lg",
        className
      )}
    >
      <img src="./RMS-Logo.png" alt="RMS Logo" />
      <ul className="flex flex-col justify-between h-[calc(100%-20%-2rem)] w-full">
        <div className="flex flex-col space-y-1">
          {!isUser ? (
            <>
              <li>
                <NavLink
                  to="dashboard"
                  className="flex items-center gap-4"
                  onClick={onClose}
                >
                  <Home size={20} />
                  Home
                </NavLink>
              </li>
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
