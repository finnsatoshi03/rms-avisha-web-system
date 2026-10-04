import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "../ui/button";
import { useUser } from "../auth/useUser";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { supabase } from "../../services/supabase";
import { getUserOnboardingStatuses } from "../../services/apiOnboarding";
import { getServerNowISO } from "../../lib/server-time";

// Bump the key to make everyone watch a new version of the video.
const FEATURE_KEY = "billing_intro_video_v1";
const VIDEO_URL = supabase.storage
  .from("training-videos")
  .getPublicUrl("billing-explainer.mp4").data.publicUrl;

async function markWatched(userId: string) {
  const { error } = await supabase.from("user_onboarding_status").upsert(
    {
      user_id: userId,
      feature_key: FEATURE_KEY,
      status: "completed",
      completed_at: getServerNowISO(),
    },
    { onConflict: "user_id,feature_key" }
  );
  if (error) throw error;
}

/**
 * Mandatory, one-time billing intro for everyone who can use billing.
 * Shows on every app load until the video has been watched to the end.
 * No close button, no Escape, no outside click, no seeking.
 */
export default function BillingIntroGate() {
  const { user, isDev, isAdmin, isManager } = useUser();
  const { enabled: billingEnabled } = useFeatureFlag("feature_billing_enabled");
  const canUseBilling = isDev || (billingEnabled && (isAdmin || isManager));

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["user-onboarding-statuses"],
    queryFn: getUserOnboardingStatuses,
    staleTime: 60 * 1000,
    enabled: canUseBilling,
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(0);
  const [step, setStep] = useState<"intro" | "video">("intro");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const watched = statuses?.some(
    (s) => s.feature_key === FEATURE_KEY && s.status === "completed"
  );
  if (!user || !canUseBilling || isLoading || watched || dismissed) return null;

  const startVideo = () => {
    setStep("video");
    // Same click as the user gesture, so playback with sound is allowed.
    requestAnimationFrame(() => void videoRef.current?.play());
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    // Block skipping ahead (keyboard, media keys, devtools).
    if (video.currentTime > maxWatchedRef.current + 1) {
      video.currentTime = maxWatchedRef.current;
      return;
    }
    maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime);
    if (video.duration) setProgress(video.currentTime / video.duration);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await markWatched(user.id);
      await queryClient.invalidateQueries({ queryKey: ["user-onboarding-statuses"] });
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save your progress. You'll see this again next time.");
    }
    setSaving(false);
    setDismissed(true);
    navigate("/billing");
  };

  // Video unreachable: let them through this session only (not marked
  // watched), so a storage outage never locks people out of the app.
  const continueWithoutVideo = () => {
    setDismissed(true);
    navigate("/billing");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-intro-title"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden">
        {step === "intro" ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <ReceiptText className="text-primaryRed" size={28} />
            </div>
            <h2 id="billing-intro-title" className="text-2xl font-bold">
              Billing is now simpler
            </h2>
            <p className="text-gray-600 max-w-lg mx-auto">
              We redesigned Billing to work just like Job Orders: find the
              client, see what they owe, and use three buttons (Add charges,
              Record payment, Send statement).
            </p>
            <p className="text-sm text-gray-500">
              Please watch this short video before you continue.
            </p>
            <button
              className="px-6 py-2.5 bg-primaryRed hover:bg-hoveredRed text-white rounded-lg inline-flex items-center gap-2"
              onClick={startVideo}
            >
              <Play size={18} />
              Watch the video
            </button>
          </div>
        ) : (
          <div>
            <div className="relative bg-black">
              <video
                ref={videoRef}
                src={VIDEO_URL}
                className="w-full aspect-video"
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                onContextMenu={(e) => e.preventDefault()}
                onClick={togglePlay}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onRateChange={(e) => (e.currentTarget.playbackRate = 1)}
                onEnded={() => {
                  setEnded(true);
                  setProgress(1);
                }}
                onError={() => setLoadFailed(true)}
              />
              {!playing && !ended && !loadFailed && (
                <button
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={togglePlay}
                  aria-label="Play video"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90">
                    <Play size={28} className="ml-1" />
                  </span>
                </button>
              )}
            </div>
            <div className="h-1 bg-gray-200">
              <div
                className="h-full bg-primaryRed transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-gray-500">
                {loadFailed
                  ? "The video couldn't load. Check your connection."
                  : ended
                    ? "All done! You're ready to use Billing."
                    : "Watch until the end to continue."}
              </p>
              {loadFailed ? (
                <Button variant="outline" onClick={continueWithoutVideo}>
                  Continue for now
                </Button>
              ) : (
                <Button
                  onClick={finish}
                  disabled={!ended || saving}
                  className="bg-primaryRed hover:bg-hoveredRed"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Go to Billing
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
