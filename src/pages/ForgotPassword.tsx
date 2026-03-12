import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { z } from "zod";

import { requestPasswordReset } from "../services/apiAuth";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email."),
});

export default function ForgotPassword() {
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const { mutate: sendResetLink, isPending } = useMutation({
    mutationFn: ({ email }: { email: string }) => requestPasswordReset({ email }),
    onSuccess: () => {
      toast.success("If the email exists, a password reset link has been sent.");
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reset link.");
    },
  });

  const onSubmit = (values: z.infer<typeof forgotPasswordSchema>) => {
    sendResetLink({ email: values.email });
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-slate-100 px-4">
      <div className="w-full max-w-[470px] p-8 bg-white rounded-xl">
        <img src="/RMS-Logo.png" className="w-32 mb-6" alt="RMS Logo" />
        <h2 className="xl:text-xl text-lg font-bold">Forgot your password?</h2>
        <p className="text-sm opacity-70 mb-6">
          Enter your email and we will send a secure reset link.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your account email"
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
                  Sending...
                </>
              ) : (
                "Send Reset Link"
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
