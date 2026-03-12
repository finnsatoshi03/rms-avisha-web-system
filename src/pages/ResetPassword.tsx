import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import Loader from "../components/ui/loader";
import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { setInitialPassword } from "../services/apiAuth";
import { supabase } from "../services/supabase";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error || !data.session) {
        toast.error("Reset link is invalid or expired.");
        navigate("/login", { replace: true });
        return;
      }

      setIsCheckingSession(false);
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const { mutate: resetPassword, isPending } = useMutation({
    mutationFn: (password: string) => setInitialPassword({ password }),
    onSuccess: (user) => {
      if (user) {
        queryClient.setQueryData(["user"], user);
        navigate(
          user.role === "technician"
            ? "/technician-dashboard"
            : "/dashboard/job-order",
          { replace: true }
        );
        toast.success("Password reset successful.");
        return;
      }

      navigate("/login", { replace: true });
      toast.success("Password reset successful. Please sign in.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password.");
    },
  });

  const onSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    resetPassword(values.password);
  };

  if (isCheckingSession) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-sm text-slate-600">Checking reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-slate-100 px-4">
      <div className="w-full max-w-[470px] p-8 bg-white rounded-xl">
        <img src="/RMS-Logo.png" className="w-32 mb-6" alt="RMS Logo" />
        <h2 className="xl:text-xl text-lg font-bold">Set a new password</h2>
        <p className="text-sm opacity-70 mb-6">
          Enter a new password for your account.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primaryRed hover:bg-hoveredRed"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center mt-4">
          <Link to="/login" className="text-sm !p-0 hover:!bg-transparent hover:!text-inherit hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
