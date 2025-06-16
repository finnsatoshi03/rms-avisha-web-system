import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Shield, Palette, User, Bell, Globe, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { AccountSettings } from "./account-settings";
import { SecuritySettings } from "./security-settings";
import { AppearanceSettings } from "./appearance-settings";
import { NotificationsSettings } from "./notifications-settings";
import { LanguageSettings } from "./language-settings";
import { HelpSettings } from "./help-settings";

type SettingsTab =
  | "account"
  | "security"
  | "appearance"
  | "notifications"
  | "language"
  | "help";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: SettingsTab;
}

const settingsNavigation = [
  {
    id: "account" as SettingsTab,
    label: "Account",
    icon: User,
    description: "Personal information and account settings",
  },
  {
    id: "security" as SettingsTab,
    label: "Security",
    icon: Shield,
    description: "Password and security settings",
  },
  {
    id: "appearance" as SettingsTab,
    label: "Appearance",
    icon: Palette,
    description: "Theme and display preferences",
    comingSoon: true,
  },
  {
    id: "notifications" as SettingsTab,
    label: "Notifications",
    icon: Bell,
    description: "Email and push notifications",
    comingSoon: true,
  },
  {
    id: "language" as SettingsTab,
    label: "Language",
    icon: Globe,
    description: "Language and region",
    comingSoon: true,
  },
  {
    id: "help" as SettingsTab,
    label: "Help & Support",
    icon: HelpCircle,
    description: "Get help and contact support",
    comingSoon: true,
  },
];

export const SettingsDialog = ({
  open,
  onOpenChange,
  defaultTab = "account",
}: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettings />;
      case "security":
        return <SecuritySettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "notifications":
        return <NotificationsSettings />;
      case "language":
        return <LanguageSettings />;
      case "help":
        return <HelpSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl min-w-[800px] gap-0 p-0 h-[600px] flex flex-col">
        <DialogHeader className="border-b px-6 py-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <div className="bg-muted/30 w-64 border-r p-4 flex-shrink-0">
            <nav className="space-y-1">
              {settingsNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isComingSoon = item.comingSoon;

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start p-3 text-left relative",
                      isActive && "bg-border dark:bg-border",
                      isComingSoon && "opacity-75"
                    )}
                    onClick={() => handleTabChange(item.id)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {item.label}
                          {isComingSoon && (
                            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                              Soon
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs text-wrap">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
