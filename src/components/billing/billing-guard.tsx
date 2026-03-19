import { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../auth/useUser";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import Loader from "../ui/loader";
import BillingLockedExperience from "./billing-locked-experience";

interface BillingGuardProps {
  children: ReactNode;
}

/**
 * Wraps the billing module. If the feature flag is disabled and the user
 * is not a dev, renders the demo walkthrough / lock screen instead.
 * Dev role always sees the real billing module regardless of flag state.
 *
 * Dev can preview the demo by navigating to /billing?demo=true
 */
export default function BillingGuard({ children }: BillingGuardProps) {
  const { isDev } = useUser();
  const { enabled, loading } = useFeatureFlag("feature_billing_enabled");
  const [searchParams] = useSearchParams();
  const forceDemo = searchParams.get("demo") === "true";

  // Dev can force demo mode via ?demo=true for preview/testing
  if (isDev && !forceDemo) return <>{children}</>;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Feature enabled and not forcing demo — show real billing
  if (enabled && !forceDemo) return <>{children}</>;

  // Feature disabled (or forced demo) — show demo / lock screen
  return <BillingLockedExperience />;
}
