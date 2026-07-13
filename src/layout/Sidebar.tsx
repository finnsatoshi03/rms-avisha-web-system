import { NavLink } from "react-router-dom";
import {
  Archive,
  Building2,
  Calendar,
  ChevronRight,
  EllipsisVertical,
  Home,
  Package,
  Printer,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  WalletMinimal,
  Wrench,
  Handshake,
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
import { Skeleton } from "../components/ui/skeleton";
import { SidebarSkeleton } from "../components/ui/page-skeleton";
import SoaOnboardingChecklist from "../components/billing/soa-onboarding-checklist";
import { useState } from "react";
import { SettingsDialog } from "../components/settings/settings-dialog";
import { useDevConsole } from "../components/dev-console/dev-console-context";

interface SidebarProps {
  className?: string;
  isUser?: boolean;
  onClose?: () => void;
}

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

      <div className="grid grid-cols-7 gap-1 mb-1 p-1 bg-sidebar-accent/60 rounded-md">
        {dayNames.map((dayName, index) => (
          <div key={`day-${index}`} className="flex justify-center">
            <span className="text-[10px] font-medium text-sidebar-foreground/60">
              {dayName}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const isToday = date.toDateString() === today.toDateString();

          return (
            <div
              key={index}
              className="flex items-center justify-center p-0.5 text-xs"
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isToday
                    ? "bg-primaryRed font-bold text-white"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
                )}
              >
                {date.getDate()}
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
  const { user, isDev, isAdmin, isLoading } = useUser();
  const { openConsole } = useDevConsole();
  const [open, setOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(false);
  const [isOperationsJobOrdersOpen, setIsOperationsJobOrdersOpen] =
    useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isJobOrdersOpen, setIsJobOrdersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNavClick = () => {
    onClose?.();
  };

  // Main nav items keep the neutral active state; the red pill is reserved
  // for accordion sub-items (see the inline NavLink classes below).
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "w-full",
      isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
    );

  return (
    <Sidebar className={cn("border-r", className)}>
      <SidebarHeader className="p-4">
        <img src="/RMS-Logo.png" alt="RMS Logo" className="w-3/4 h-auto" />
      </SidebarHeader>

      {/* Priority billing tutorial — pinned above navigation until finished */}
      {!isUser && !isLoading && <SoaOnboardingChecklist />}

      <SidebarContent>
        {isLoading && !user ? (
          <SidebarSkeleton />
        ) : !isUser ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>OPERATIONS</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Collapsible open={isHomeOpen} onOpenChange={setIsHomeOpen}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="w-full justify-between"
                          tooltip="Dashboard"
                        >
                          <div className="flex items-center gap-2">
                            <Home size={20} />
                            <span>Dashboard</span>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`transition-transform ${
                              isHomeOpen ? "rotate-90" : ""
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
                                      "bg-brand-soft text-brand-deep font-medium"
                                  )
                                }
                              >
                                Job Orders
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
                                      "bg-brand-soft text-brand-deep font-medium"
                                  )
                                }
                              >
                                Rentals
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Collapsible
                      open={isOperationsJobOrdersOpen}
                      onOpenChange={setIsOperationsJobOrdersOpen}
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
                          <ChevronRight
                            size={16}
                            className={`transition-transform ${
                              isOperationsJobOrdersOpen ? "rotate-90" : ""
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
                                      "bg-brand-soft text-brand-deep font-medium"
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
                                      "bg-brand-soft text-brand-deep font-medium"
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
                    <SidebarMenuButton asChild tooltip="Rentals">
                      <NavLink
                        to="rentals"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <Handshake size={20} />
                        <span>Rentals</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>FINANCE</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Billing">
                      <NavLink
                        to="billing"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <ReceiptText size={20} />
                        <span>Billing</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Expenses">
                      <NavLink
                        to="expenses"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <WalletMinimal size={20} />
                        <span>Expenses</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>MANAGEMENT</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Clients">
                      <NavLink
                        to="clients"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <UsersRound size={20} />
                        <span>Clients</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Collapsible
                      open={isInventoryOpen}
                      onOpenChange={setIsInventoryOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="w-full justify-between"
                          tooltip="Inventory"
                        >
                          <div className="flex items-center gap-2">
                            <Package size={20} />
                            <span>Inventory</span>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`transition-transform ${
                              isInventoryOpen ? "rotate-90" : ""
                            }`}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to="materials"
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                  cn(
                                    "w-full",
                                    isActive &&
                                      "bg-brand-soft text-brand-deep font-medium"
                                  )
                                }
                              >
                                Materials
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to="rental-assets"
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                  cn(
                                    "w-full",
                                    isActive &&
                                      "bg-brand-soft text-brand-deep font-medium"
                                  )
                                }
                              >
                                Rental Printers
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Technicians">
                      <NavLink
                        to="technicians"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <Wrench size={20} />
                        <span>Technicians</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Branch Management">
                        <NavLink
                          to="branches"
                          onClick={handleNavClick}
                          className={navItemClass}
                        >
                          <Building2 size={20} />
                          <span>Branch Management</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>SYSTEM</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Archive">
                      <NavLink
                        to="archive"
                        onClick={handleNavClick}
                        className={navItemClass}
                      >
                        <Archive size={20} />
                        <span>Archive</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isDev && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Dev Console"
                        onClick={() => {
                          openConsole();
                          handleNavClick();
                        }}
                      >
                        <ShieldCheck size={20} />
                        <span>Dev Console</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
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
          </>
        ) : (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <NavLink
                    to="technician-dashboard"
                    onClick={handleNavClick}
                    className={navItemClass}
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
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${
                          isJobOrdersOpen ? "rotate-90" : ""
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
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <WeekCalendar />

        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading && !user ? (
              <div className="flex items-center gap-2 p-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : (
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
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab="account"
      />
    </Sidebar>
  );
}
