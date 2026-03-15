import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "./ui/command";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Search,
  Archive,
  Building2,
  Handshake,
  Home,
  Printer,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  WalletMinimal,
  Wrench,
} from "lucide-react";
import { useUser } from "./auth/useUser";
import Logout from "./auth/logout";
import { Separator } from "./ui/separator";
import { SettingsDialog } from "./settings/settings-dialog";
import ChangelogTrigger from "./changelog/changelog-trigger";
import ChangelogAdmin from "./changelog/changelog-admin";
import { useDevConsole } from "./dev-console/dev-console-context";

// Navigation items configuration
const navigationItems = [
  {
    group: "Dashboard",
    items: [
      {
        icon: Printer,
        title: "Job Order Dashboard",
        path: "/dashboard/job-order",
        keywords: ["job order dashboard", "job", "dashboard"],
      },
      {
        icon: Handshake,
        title: "Rental Dashboard",
        path: "/dashboard/rental",
        keywords: ["rental dashboard", "rental", "dashboard"],
      },
    ],
  },
  {
    group: "Main",
    items: [
      {
        icon: Printer,
        title: "Job Orders",
        path: "/job-orders",
        keywords: ["job orders", "jobs", "orders", "work"],
      },
      {
        icon: Handshake,
        title: "Rental",
        path: "/rental",
        keywords: ["rental", "rent", "lease"],
      },
      {
        icon: ReceiptText,
        title: "Billing Statement",
        path: "/billing-statement",
        keywords: ["billing", "statement", "invoice", "bill"],
      },
      {
        icon: Archive,
        title: "Materials",
        path: "/materials",
        keywords: ["materials", "inventory", "stock", "supplies"],
      },
      {
        icon: WalletMinimal,
        title: "Expenses",
        path: "/expenses",
        keywords: ["expenses", "costs", "spending", "finance"],
      },
      {
        icon: UsersRound,
        title: "Clients",
        path: "/clients",
        keywords: ["clients", "customers", "users"],
      },
      {
        icon: Wrench,
        title: "Technicians",
        path: "/technicians",
        keywords: ["technicians", "staff", "workers", "employees"],
      },
      {
        icon: Building2,
        title: "Branch Management",
        path: "/branches",
        keywords: ["branch", "branches", "prefix", "pdf header", "pdf footer"],
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        icon: Settings,
        title: "Settings",
        path: "settings-dialog",
        keywords: ["settings", "configuration", "preferences"],
      },
      {
        icon: UserRoundCog,
        title: "Account",
        path: "account-dialog",
        keywords: ["account", "profile", "user"],
      },
      {
        icon: Archive,
        title: "Changelog Admin",
        path: "changelog-admin-dialog",
        keywords: ["changelog", "admin", "updates", "version", "release"],
      },
      {
        icon: ShieldCheck,
        title: "Dev Console",
        path: "dev-console-dialog",
        keywords: ["developer console", "manage admins", "manage managers"],
      },
    ],
  },
];

const NavigationSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changelogAdminOpen, setChangelogAdminOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    "account" | "security" | "appearance"
  >("account");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { openConsole } = useDevConsole();
  const { user, isUser, isAdmin, isDev } = useUser();

  // Handle Ctrl+K shortcut and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Filter navigation items based on user role
  const filteredNavigationItems = React.useMemo(() => {
    if (isUser) {
      // For technicians, only show relevant items
      return [
        {
          group: "Main",
          items: [
            {
              icon: Home,
              title: "Dashboard",
              path: "/technician-dashboard",
              keywords: ["dashboard", "home", "overview"],
            },
            {
              icon: Printer,
              title: "Job Orders",
              path: "/job-orders",
              keywords: ["job orders", "jobs", "orders", "work"],
            },
          ],
        },
      ];
    }

    // For dev users, show all items including dev panel
    if (isDev) {
      return navigationItems;
    }

    // For admin users, show all except dev panel
    if (isAdmin) {
      return navigationItems.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.path !== "dev-console-dialog"),
      }));
    }

    // For other users, filter out changelog admin and dev panel
    return navigationItems.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.path !== "changelog-admin-dialog" &&
          item.path !== "dev-console-dialog" &&
          item.path !== "/branches"
      ),
    }));
  }, [isUser, isAdmin, isDev]);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!search) return filteredNavigationItems;

    return filteredNavigationItems
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.keywords.some((keyword) =>
              keyword.toLowerCase().includes(search.toLowerCase())
            )
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search, filteredNavigationItems]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearch("");

    if (path === "settings-dialog") {
      setSettingsTab("security");
      setSettingsOpen(true);
    } else if (path === "account-dialog") {
      setSettingsTab("account");
      setSettingsOpen(true);
    } else if (path === "changelog-admin-dialog") {
      setChangelogAdminOpen(true);
    } else if (path === "dev-console-dialog") {
      openConsole();
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative h-9 w-full max-w-sm justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search navigation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.45rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          Ctrl+K
        </kbd>
      </Button>

      <ChangelogTrigger />

      {/* User Profile */}
      <Popover open={profileOpen} onOpenChange={setProfileOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full"
            onClick={() => setProfileOpen(true)}
          >
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage
                src={user?.user_metadata.avatar || "/RMS-icon.png"}
                alt={user?.user_metadata.fullname || "User"}
              />
              <AvatarFallback className="rounded-full">RMS</AvatarFallback>
            </Avatar>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-56 rounded-lg p-2"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <div className="grid gap-2">
            <div className="flex items-center gap-2 p-2 text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={user?.user_metadata.avatar || "/RMS-icon.png"}
                  alt={user?.user_metadata.fullname || "User"}
                />
                <AvatarFallback className="rounded-lg">RMS</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user ? user?.user_metadata.fullname || user?.email : "User"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user ? user?.user_metadata.role || user?.role : "User"}
                </span>
              </div>
            </div>
            <div className="h-px bg-border" />
            <button
              onClick={() => {
                setProfileOpen(false);
                setSettingsTab("account");
                setSettingsOpen(true);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground w-full text-left"
            >
              <UserRoundCog size={16} />
              Account
            </button>
            <Separator />
            <Logout />
          </div>
        </PopoverContent>
      </Popover>

      {/* Search Dialog */}
      <CommandDialog
        open={open}
        onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (!newOpen) {
            setSearch("");
          }
        }}
      >
        <CommandInput
          placeholder="Search navigation..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {filteredItems.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.path}
                    value={`${item.title} ${item.keywords.join(" ")}`}
                    onSelect={() => handleSelect(item.path)}
                    className="flex items-center gap-2 px-2 py-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          {!search && (
            <CommandGroup heading="Shortcuts">
              <CommandItem
                className="flex items-center gap-2 px-2 py-3"
                disabled
              >
                <Search className="h-4 w-4" />
                <span>Press</span>
                <CommandShortcut>⌘K</CommandShortcut>
                <span>to search</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />

      {/* Changelog Admin Dialog */}
      <Dialog open={changelogAdminOpen} onOpenChange={setChangelogAdminOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Changelog Management</DialogTitle>
            <DialogDescription>
              Manage system changelogs and updates for different user roles.
            </DialogDescription>
          </DialogHeader>
          <ChangelogAdmin />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NavigationSearch;
