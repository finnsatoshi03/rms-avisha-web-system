import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActiveOnboardings,
  getUserOnboardingStatuses,
  updateOnboardingStatus,
  FeatureOnboarding,
} from "../../services/apiOnboarding";
import { useUser } from "../auth/useUser";

export function useFeatureOnboarding(featureKey: string) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [onboardingData, setOnboardingData] = useState<FeatureOnboarding | null>(null);
  // Prevents the useEffect from re-showing the modal after replay
  const isReplayingRef = useRef(false);

  const { data: onboardings } = useQuery({
    queryKey: ["feature-onboardings"],
    queryFn: getActiveOnboardings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statuses, isLoading: statusesLoading } = useQuery({
    queryKey: ["user-onboarding-statuses"],
    queryFn: getUserOnboardingStatuses,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    // Wait for BOTH queries to finish before deciding
    if (!onboardings || !user || statusesLoading) return;

    const feature = onboardings.find((o) => o.feature_key === featureKey);
    if (!feature) return;

    if (feature.target_roles && feature.target_roles.length > 0) {
      if (!feature.target_roles.includes(user.role)) return;
    }

    setOnboardingData(feature);

    // Don't show modal if we're in a replay
    if (isReplayingRef.current) return;

    const userStatus = statuses?.find((s) => s.feature_key === featureKey);

    // Only show if truly pending or no record exists
    if (!userStatus || userStatus.status === "pending") {
      setShowAnnouncement(true);
    } else {
      // Explicitly hide if already completed/skipped
      setShowAnnouncement(false);
    }
  }, [onboardings, statuses, statusesLoading, featureKey, user]);

  const startTour = useCallback(() => {
    setShowAnnouncement(false);
    setShowTour(true);
  }, []);

  const completeTour = useCallback(async () => {
    setShowTour(false);
    isReplayingRef.current = false;
    await updateOnboardingStatus(featureKey, "completed");
    queryClient.invalidateQueries({ queryKey: ["user-onboarding-statuses"] });
  }, [featureKey, queryClient]);

  const replayTour = useCallback(() => {
    // Skip modal, go straight to tour
    isReplayingRef.current = true;
    setShowAnnouncement(false);
    setShowTour(true);
  }, []);

  return {
    showAnnouncement,
    showTour,
    onboardingData,
    startTour,
    completeTour,
    replayTour,
  };
}
