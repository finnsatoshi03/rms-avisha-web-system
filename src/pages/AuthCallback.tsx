import { useEffect } from "react";
import { type EmailOtpType } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Loader from "../components/ui/loader";
import { getCurrentUser } from "../services/apiAuth";
import { supabase } from "../services/supabase";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "recovery",
  "email",
  "email_change",
];

function getOtpType(value: string | null): EmailOtpType | null {
  if (!value) {
    return null;
  }

  return OTP_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    async function finalizeAuth() {
      try {
        const url = new URL(window.location.href);
        const queryParams = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const flow = queryParams.get("flow") || hashParams.get("flow");

        const code = queryParams.get("code") || hashParams.get("code");
        const tokenType = getOtpType(
          queryParams.get("type") || hashParams.get("type")
        );
        const isRecoveryFlow =
          flow === "recovery" || tokenType === "recovery";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const tokenHash =
            queryParams.get("token_hash") || hashParams.get("token_hash");

          if (tokenHash && tokenType) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: tokenType,
            });

            if (error) throw error;
          }
        }

        const user = await getCurrentUser();
        if (!isActive) return;

        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        if (isRecoveryFlow) {
          navigate("/auth/reset-password", { replace: true });
          return;
        }

        navigate(
          user.role === "technician"
            ? "/technician-dashboard"
            : "/dashboard/job-order",
          { replace: true }
        );
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error ? error.message : "Failed to complete invite.";
        toast.error(message);
        navigate("/login", { replace: true });
      }
    }

    finalizeAuth();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
      <div className="text-center flex flex-col items-center justify-center">
        <Loader />
        <p className="mt-4 text-sm text-slate-600">Completing account setup...</p>
      </div>
    </div>
  );
}
