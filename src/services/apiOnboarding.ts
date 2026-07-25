import { getServerNowISO } from "../lib/server-time";
import { supabase } from "./supabase";

export type FeatureOnboarding = {
  id: string;
  feature_key: string;
  title: string;
  description: string;
  bullet_points: string[];
  version: string | null;
  is_active: boolean;
  target_roles: string[] | null;
  created_at: string;
};

export type UserOnboardingStatus = {
  id: string;
  user_id: string;
  feature_key: string;
  status: "pending" | "completed" | "skipped";
  completed_at: string | null;
  created_at: string;
};

export async function getActiveOnboardings(): Promise<FeatureOnboarding[]> {
  const { data, error } = await supabase
    .from("feature_onboardings")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching onboardings:", error);
    return [];
  }

  return data || [];
}

export async function getUserOnboardingStatuses(): Promise<UserOnboardingStatus[]> {
  const { data, error } = await supabase
    .from("user_onboarding_status")
    .select("*");

  if (error) {
    console.error("Error fetching onboarding statuses:", error);
    return [];
  }

  return data || [];
}

export async function updateOnboardingStatus(
  featureKey: string,
  status: "completed" | "skipped"
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("user_onboarding_status")
    .upsert(
      {
        user_id: user.id,
        feature_key: featureKey,
        status,
        completed_at: status === "completed" ? getServerNowISO() : null,
      },
      { onConflict: "user_id,feature_key" }
    );

  if (error) {
    console.error("Error updating onboarding status:", error);
  }
}

export async function resetOnboardingStatus(featureKey: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("user_onboarding_status")
    .upsert(
      {
        user_id: user.id,
        feature_key: featureKey,
        status: "pending",
        completed_at: null,
      },
      { onConflict: "user_id,feature_key" }
    );

  if (error) {
    console.error("Error resetting onboarding status:", error);
  }
}
