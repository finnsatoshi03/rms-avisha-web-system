import { ReactNode } from "react";
import { useUser } from "../auth/useUser";
import Loader from "../ui/loader";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";

interface BillingGuardProps {
  children: ReactNode;
}

/**
 * Wraps the billing module.
 * - Dev/Admin/Manager: see real billing when feature is enabled
 * - Technicians: no access (sidebar already hides the link)
 * - If feature flag is disabled, shows a simple "not available" message
 */
export default function BillingGuard({ children }: BillingGuardProps) {
  const { isDev, isAdmin, isManager, isTechnician } = useUser();
  const { enabled, loading } = useFeatureFlag("feature_billing_enabled");

  // Technicians should never see billing
  if (isTechnician) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          You don't have access to the billing module.
        </p>
      </div>
    );
  }

  // Dev always sees billing regardless of flag
  if (isDev) return <>{children}</>;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Feature enabled — show billing for admin/manager
  if (enabled && (isAdmin || isManager)) return <>{children}</>;

  // Feature disabled
  return (
    <div className="h-full w-full flex items-center justify-center">
      <p className="text-sm text-muted-foreground">
        The billing module is not yet activated. Contact your system administrator.
      </p>
    </div>
  );
}
