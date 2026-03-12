import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import { setInitialPassword } from "../../services/apiAuth";
import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

const setupPasswordSchema = z
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

export default function InitialPasswordSetup({
  fullname,
  email,
}: {
  fullname?: string | null;
  email?: string | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof setupPasswordSchema>>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate: completeSetup, isPending } = useMutation({
    mutationFn: (password: string) => setInitialPassword({ password }),
    onSuccess: (user) => {
      if (user) {
        queryClient.setQueryData(["user"], user);
      } else {
        queryClient.invalidateQueries({ queryKey: ["user"] });
      }
      toast.success("Password updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update password.");
    },
  });

  const onSubmit = (values: z.infer<typeof setupPasswordSchema>) => {
    completeSetup(values.password);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-sm">
        <img src="/RMS-Logo.png" className="w-28 mb-5" alt="RMS Logo" />
        <h1 className="text-xl font-semibold">Set Your New Password</h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          {fullname ? `${fullname}, ` : ""}
          this is a first-time login setup for {email || "your account"}.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
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
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
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
              disabled={isPending}
              className="w-full bg-primaryRed hover:bg-hoveredRed"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Password"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
