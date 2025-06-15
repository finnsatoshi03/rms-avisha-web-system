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

interface SidebarProps {
  className?: string;
  isUser?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({
  className,
  isUser,
  onClose,
}: SidebarProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(true);

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
                        className="w-full justify-between opacity-50"
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
                  <SidebarMenuButton asChild tooltip="Job Orders">
                    <NavLink
                      to="job-orders"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Printer size={20} />
                      <span>Job Orders</span>
                    </NavLink>
                  </SidebarMenuButton>
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
                  <SidebarMenuButton asChild tooltip="Job Orders">
                    <NavLink
                      to="job-orders"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Printer size={20} />
                      <span>Job Orders</span>
                    </NavLink>
                  </SidebarMenuButton>
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
                  <SidebarMenuButton asChild tooltip="Settings">
                    <NavLink
                      to="settings"
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Settings size={20} />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
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
                className="w-[--radix-popover-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <div className="grid gap-2">
                  <NavLink
                    to="account"
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setOpen(false);
                      handleNavClick();
                    }}
                  >
                    <UserRoundCog size={16} />
                    Account
                  </NavLink>
                  <Logout />
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
