import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState } from "react";
import { useLogin } from "./useLogin";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.username || !values.password) return;

    login(
      { email: values.username, password: values.password },
      {
        onSettled: () => form.reset(),
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your company username"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    disabled={isLoading}
                    {...field}
                  />
                  {showPassword ? (
                    <EyeOff
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowPassword(false)}
                    />
                  ) : (
                    <Eye
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowPassword(true)}
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-6">
          <Button
            type="submit"
            className="w-full bg-primaryRed hover:bg-hoveredRed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In..
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
