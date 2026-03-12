import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChangelogsForRole } from "../services/apiChangelog";

export const useChangelog = (userRole: string) => {
  const globalSeenChangelogVersionKey = "seen_changelog_version";
  const roleSeenChangelogVersionKey = `seen_changelog_version_${userRole}`;
  const [hasNewChangelogs, setHasNewChangelogs] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Fetch changelogs for the user's role
  const { data: changelogs, isLoading } = useQuery({
    queryKey: ["changelogs", userRole],
    queryFn: () => getChangelogsForRole(userRole),
    enabled: !!userRole,
  });

  const currentChangelogVersion = useMemo(() => {
    if (!changelogs || changelogs.length === 0) {
      return null;
    }

    return changelogs[0].version;
  }, [changelogs]);

  const markCurrentAsRead = useCallback(() => {
    if (!userRole || !currentChangelogVersion) return;

    localStorage.setItem(roleSeenChangelogVersionKey, currentChangelogVersion);
    localStorage.setItem(globalSeenChangelogVersionKey, currentChangelogVersion);
    setHasNewChangelogs(false);
  }, [
    userRole,
    currentChangelogVersion,
    roleSeenChangelogVersionKey,
    globalSeenChangelogVersionKey,
  ]);

  useEffect(() => {
    if (!userRole || isLoading) return;

    if (!currentChangelogVersion) {
      setHasNewChangelogs(false);
      return;
    }

    const seenChangelogVersion =
      localStorage.getItem(roleSeenChangelogVersionKey) ||
      localStorage.getItem(globalSeenChangelogVersionKey);
    const hasNew = seenChangelogVersion !== currentChangelogVersion;
    setHasNewChangelogs(hasNew);

    // Auto-open dialog if there are new changelogs and dialog is not already open
    if (hasNew && !isChangelogOpen) {
      // Small delay to make the auto-open feel more natural
      const timer = setTimeout(() => {
        setIsChangelogOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    userRole,
    currentChangelogVersion,
    isLoading,
    isChangelogOpen,
    roleSeenChangelogVersionKey,
    globalSeenChangelogVersionKey,
  ]);

  const openChangelog = () => {
    setIsChangelogOpen(true);
    markCurrentAsRead();
  };

  const closeChangelog = () => {
    setIsChangelogOpen(false);
  };

  return {
    hasNewChangelogs,
    isChangelogOpen,
    openChangelog,
    closeChangelog,
    currentChangelogVersion,
    markCurrentAsRead,
  };
};
