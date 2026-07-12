import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  Archive,
  Building2,
  Handshake,
  Home,
  MonitorSmartphone,
  Package,
  Plus,
  Printer,
  ReceiptText,
  UsersRound,
  WalletMinimal,
  Wrench,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { useUser } from "./auth/useUser";

type PaletteEntry = {
  label: string;
  to: string;
  icon: React.ReactNode;
  keywords?: string[];
};

/**
 * Global command palette (Ctrl+K / Cmd+K): jump to any page or start a new
 * job order without touching the mouse.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isUser, isAdmin } = useUser();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const pages: PaletteEntry[] = isUser
    ? [
        { label: "Dashboard", to: "/technician-dashboard", icon: <Home size={16} /> },
        { label: "Job Orders", to: "/job-orders", icon: <Printer size={16} /> },
        { label: "Quotations", to: "/quotations", icon: <ReceiptText size={16} /> },
      ]
    : [
        { label: "Dashboard", to: "/dashboard/job-order", icon: <Home size={16} /> },
        { label: "Job Orders", to: "/job-orders", icon: <Printer size={16} /> },
        { label: "Quotations", to: "/quotations", icon: <ReceiptText size={16} /> },
        { label: "Rentals", to: "/rentals", icon: <Handshake size={16} /> },
        { label: "Rental Dashboard", to: "/dashboard/rental", icon: <MonitorSmartphone size={16} /> },
        { label: "Billing", to: "/billing", icon: <ReceiptText size={16} /> },
        { label: "Expenses", to: "/expenses", icon: <WalletMinimal size={16} /> },
        { label: "Clients", to: "/clients", icon: <UsersRound size={16} /> },
        { label: "Materials", to: "/materials", icon: <Package size={16} />, keywords: ["inventory", "stocks"] },
        { label: "Rental Printers", to: "/rental-assets", icon: <Package size={16} /> },
        { label: "Technicians", to: "/technicians", icon: <Wrench size={16} /> },
        { label: "Archive", to: "/archive", icon: <Archive size={16} /> },
        ...(isAdmin
          ? [{ label: "Branch Management", to: "/branches", icon: <Building2 size={16} /> } as PaletteEntry]
          : []),
      ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command label="Command palette">
          <Command.Input
            autoFocus
            placeholder="Type a page or action…"
            className="w-full border-b bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results.
            </Command.Empty>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Command.Item
                keywords={["create", "add"]}
                onSelect={() => go("/job-orders?new=1")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Plus size={16} />
                New Job Order
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {pages.map((page) => (
                <Command.Item
                  key={page.to}
                  keywords={page.keywords}
                  onSelect={() => go(page.to)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {page.icon}
                  {page.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            <kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate ·{" "}
            <kbd className="rounded border bg-muted px-1">Enter</kbd> open ·{" "}
            <kbd className="rounded border bg-muted px-1">Esc</kbd> close
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
