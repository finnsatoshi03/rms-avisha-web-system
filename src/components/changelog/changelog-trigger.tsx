"use client";

import { Bell, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useChangelog } from "../../hooks/useChangelog";
import { useUser } from "../auth/useUser";
import ChangelogDialog from "./changelog-dialog";

export default function ChangelogTrigger() {
  const { user, isAdmin, isTaytay, isPasig, isUser } = useUser();

  // Determine user role based on your actual role system
  const getUserRole = () => {
    if (isAdmin) return "admin";
    if (isTaytay || isPasig) return "manager";
    if (isUser) return "technician";
    return "user";
  };

  const userRole = getUserRole();
  const {
    hasNewChangelogs,
    isChangelogOpen,
    openChangelog,
    closeChangelog,
    currentChangelogVersion,
    markCurrentAsRead,
  } = useChangelog(userRole);

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openChangelog}
        className="relative h-8 w-8 p-0"
        aria-label="View changelog"
      >
        {hasNewChangelogs ? (
          <Sparkles className="h-4 w-4 text-yellow-500" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {hasNewChangelogs && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
          >
            !
          </Badge>
        )}
      </Button>

      <ChangelogDialog
        open={isChangelogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeChangelog();
          }
        }}
        userRole={userRole}
        currentChangelogVersion={currentChangelogVersion}
        onMarkAsRead={markCurrentAsRead}
      />
    </>
  );
}
