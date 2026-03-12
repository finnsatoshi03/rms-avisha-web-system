"use client";

import { useState, useEffect } from "react";
import { ArrowRightIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import { getChangelogsForRole } from "../../services/apiChangelog";

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
  currentChangelogVersion: string | null;
  onMarkAsRead?: () => void;
}

export default function ChangelogDialog({
  open,
  onOpenChange,
  userRole,
  currentChangelogVersion,
  onMarkAsRead,
}: ChangelogDialogProps) {
  const [step, setStep] = useState(1);
  const globalSeenChangelogVersionKey = "seen_changelog_version";
  const roleSeenChangelogVersionKey = `seen_changelog_version_${userRole}`;

  // Fetch changelogs for the user's role
  const { data: changelogs, isLoading } = useQuery({
    queryKey: ["changelogs", userRole],
    queryFn: () => getChangelogsForRole(userRole),
    enabled: !!userRole && open,
  });

  // Filter changelogs based on user role (already filtered by API)
  const filteredChangelogs = changelogs || [];
  const totalSteps = filteredChangelogs.length;

  const handleContinue = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const markAsRead = () => {
    if (currentChangelogVersion) {
      localStorage.setItem(roleSeenChangelogVersionKey, currentChangelogVersion);
      localStorage.setItem(
        globalSeenChangelogVersionKey,
        currentChangelogVersion
      );
    }

    onMarkAsRead?.();
  };

  const handleSkip = () => {
    markAsRead();
    onOpenChange(false);
  };

  const handleFinish = () => {
    markAsRead();
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      markAsRead();
    }

    onOpenChange(nextOpen);
  };

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="gap-0 p-0 [&>button:last-child]:text-white"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Image skeleton */}
          <div className="p-2">
            <Skeleton className="w-full h-48 rounded-md" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-6 px-6 pt-3 pb-6">
            <DialogHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </DialogHeader>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex justify-center space-x-1.5 max-sm:order-1">
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className="size-1.5 rounded-full" />
              </div>
              <div className="flex items-center justify-end gap-2 list-none">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (filteredChangelogs.length === 0) {
    return null;
  }

  const currentChangelog = filteredChangelogs[step - 1];

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="gap-0 p-0 [&>button:last-child]:text-white max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Image placeholder */}
        <div className="p-2">
          <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center mx-auto mb-3">
                <img src={"/RMS-Logo.png"} className="w-auto h-16" />
              </div>
              <p className="text-sm text-gray-600">Changelog Preview</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pt-3 pb-6 flex-1 min-h-0 flex flex-col">
          <DialogHeader>
            <DialogTitle>{currentChangelog.title}</DialogTitle>
            <DialogDescription>
              {currentChangelog.description}
            </DialogDescription>
          </DialogHeader>

          {/* Features List */}
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-900">What's New:</h4>
            <ul className="space-y-2">
              {currentChangelog.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 list-none">
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Close
            </Button>
            {step < totalSteps ? (
              <Button
                className="group"
                type="button"
                onClick={handleContinue}
              >
                Next
                <ArrowRightIcon
                  className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            ) : (
              <Button type="button" onClick={handleFinish}>
                Got it
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
