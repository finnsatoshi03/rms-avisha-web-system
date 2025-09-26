import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChangelogsForRole } from "../services/apiChangelog";

export const useChangelog = (userRole: string) => {
  const [hasNewChangelogs, setHasNewChangelogs] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Fetch changelogs for the user's role
  const { data: changelogs, isLoading } = useQuery({
    queryKey: ["changelogs", userRole],
    queryFn: () => getChangelogsForRole(userRole),
    enabled: !!userRole,
  });

  useEffect(() => {
    if (!userRole || !changelogs || isLoading) return;

    // Get viewed changelogs for this user role
    const viewedChangelogsKey = `changelog_viewed_${userRole}`;
    const viewedChangelogs = JSON.parse(
      localStorage.getItem(viewedChangelogsKey) || "[]"
    );

    // Check if there are any unviewed changelogs
    const unviewedChangelogs = changelogs.filter(
      (changelog) => !viewedChangelogs.includes(changelog.id.toString())
    );

    const hasNew = unviewedChangelogs.length > 0;
    setHasNewChangelogs(hasNew);

    // Auto-open dialog if there are new changelogs and dialog is not already open
    if (hasNew && !isChangelogOpen) {
      // Small delay to make the auto-open feel more natural
      const timer = setTimeout(() => {
        setIsChangelogOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [userRole, changelogs, isLoading, isChangelogOpen]);

  const openChangelog = () => {
    setIsChangelogOpen(true);
  };

  const closeChangelog = () => {
    setIsChangelogOpen(false);
  };

  return {
    hasNewChangelogs,
    isChangelogOpen,
    openChangelog,
    closeChangelog,
  };
};
