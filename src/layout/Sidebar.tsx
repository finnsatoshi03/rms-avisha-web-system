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
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import Logout from "../components/auth/logout";
import { cn } from "../lib/utils";
import { useUser } from "../components/auth/useUser";
import { useState } from "react";
import { SettingsDialog } from "../components/settings/settings-dialog";

interface SidebarProps {
  className?: string;
  isUser?: boolean;
  onClose?: () => void;
}

// Week Calendar Component
const WeekCalendar = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);

  const weekDays = [];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push(date);
  }

  const monthName = today.toLocaleDateString("en-US", { month: "short" });
  const year = today.getFullYear();

  return (
    <div className="p-3 border border-sidebar-border rounded-lg bg-sidebar-accent/30">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-sidebar-foreground/70" />
        <span className="text-xs font-medium text-sidebar-foreground/70">
          {monthName} {year}
        </span>
      </div>

      {/* Weekday Labels Row */}
      <div className="grid grid-cols-7 gap-1 mb-1 p-1 bg-slate-100 rounded-md">
        {dayNames.map((dayName, index) => (
          <div key={`day-${index}`} className="flex justify-center">
            <span className="text-[10px] font-medium text-slate-600">
              {dayName}
            </span>
          </div>
        ))}
      </div>

      {/* Date Numbers Row */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const isToday = date.toDateString() === today.toDateString();
          const dayNumber = date.getDate();

          return (
            <div
              key={index}
              className="flex items-center justify-center p-1 rounded-md text-xs transition-colors hover:bg-sidebar-accent/20"
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday
                    ? "text-red-500 font-bold"
                    : "text-sidebar-foreground/70"
                )}
              >
                {dayNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function AppSidebar({
  className,
  isUser,
  onClose,
}: SidebarProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(true);
  const [isJobOrdersOpen, setIsJobOrdersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <Sidebar className={cn("border-r", className)}>
      <SidebarHeader className="p-4">
        <img src="/RMS-Logo.png" alt="RMS Logo" className="w-3/4 h-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {!isUser ? (
              <>
                <SidebarMenuItem>
                  <Collapsible open={isHomeOpen} onOpenChange={setIsHomeOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="w-full justify-between"
                        tooltip="Home"
                      >
                        <div className="flex items-center gap-2">
                          <Home size={20} />
                          <span>Home</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            isHomeOpen ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="dashboard/job-order"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              Job Order
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="dashboard/rental"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              Rental
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Collapsible
                    open={isJobOrdersOpen}
                    onOpenChange={setIsJobOrdersOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="w-full justify-between"
                        tooltip="Job Orders"
                      >
                        <div className="flex items-center gap-2">
                          <Printer size={20} />
                          <span>Job Orders</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            isJobOrdersOpen ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="job-orders"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              All Job Orders
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="quotations"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              Quotations
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Rental">
                    <NavLink
                      to="rental"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Handshake size={20} />
                      <span>Rental</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Billing Statement">
                    <NavLink
                      to="billing-statement"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <ReceiptText size={20} />
                      <span>Billing Statement</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Materials">
                    <NavLink
                      to="materials"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Archive size={20} />
                      <span>Materials</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Expenses">
                    <NavLink
                      to="expenses"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <WalletMinimal size={20} />
                      <span>Expenses</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Clients">
                    <NavLink
                      to="clients"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <UsersRound size={20} />
                      <span>Clients</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Technicians">
                    <NavLink
                      to="technicians"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Wrench size={20} />
                      <span>Technicians</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                    <NavLink
                      to="technician-dashboard"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Home size={20} />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Collapsible
                    open={isJobOrdersOpen}
                    onOpenChange={setIsJobOrdersOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="w-full justify-between"
                        tooltip="Job Orders"
                      >
                        <div className="flex items-center gap-2">
                          <Printer size={20} />
                          <span>Job Orders</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            isJobOrdersOpen ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="job-orders"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              All Job Orders
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="quotations"
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                cn(
                                  "w-full",
                                  isActive &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )
                              }
                            >
                              Quotations
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {!isUser && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Settings"
                    onClick={() => {
                      setSettingsOpen(true);
                      onClose?.();
                    }}
                  >
                    <Settings size={20} />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {/* Week Calendar */}
        <WeekCalendar />

        {/* User Profile */}
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.user_metadata.avatar || "/RMS-icon.png"}
                      alt={user?.user_metadata.fullname || "User"}
                    />
                    <AvatarFallback className="rounded-lg">RMS</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user
                        ? user?.user_metadata.fullname || user?.email
                        : "H3cker"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user ? user?.user_metadata.role || user?.role : "H3cker"}
                    </span>
                  </div>
                  <EllipsisVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-56 rounded-lg p-2"
                side="right"
                align="end"
                sideOffset={4}
              >
                <div className="grid gap-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setSettingsOpen(true);
                      onClose?.();
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground w-full text-left"
                  >
                    <UserRoundCog size={16} />
                    Account
                  </button>
                  <Logout />
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab="account"
      />
    </Sidebar>
  );
}
