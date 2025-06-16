import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { useUpdatePassword } from "./useUpdatePassword";
import { useUser } from "./useUser";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface FormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const formSchema = z.object({
  current_password: z
    .string()
    .min(1, { message: "Current password is required." }),
  new_password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  confirm_password: z.string(),
});

const formResolver = (data: FormData) => {
  try {
    formSchema.parse(data);

    if (data.new_password !== data.confirm_password) {
      return {
        errors: {
          confirm_password: {
            type: "manual",
            message: "Passwords must match.",
          },
        },
        values: data,
      };
    }

    return { values: data, errors: {} };
  } catch (error) {
    const zodError = error as z.ZodError;
    return { values: {}, errors: zodError.formErrors.fieldErrors };
  }
};

export default function UpdateUserPassForm() {
  const { user } = useUser();
  const { updatePassword, isLoading } = useUpdatePassword();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: formResolver,
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user?.id) return;

    updatePassword(
      {
        currentPassword: values.current_password,
        newPassword: values.new_password,
        userId: user.id,
      },
      {
        onSuccess: () => {
          form.reset();
        },
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="current_password"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Enter your current password"
                    type={showCurrentPassword ? "text" : "password"}
                    {...field}
                    disabled={isLoading}
                  />
                  {showCurrentPassword ? (
                    <EyeOff
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowCurrentPassword(false)}
                    />
                  ) : (
                    <Eye
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowCurrentPassword(true)}
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Enter your desired password"
                    type={showPassword ? "text" : "password"}
                    {...field}
                    disabled={isLoading}
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
        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Confirm your password"
                    type={showConfirmPassword ? "text" : "password"}
                    {...field}
                    disabled={isLoading}
                  />
                  {showConfirmPassword ? (
                    <EyeOff
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowConfirmPassword(false)}
                    />
                  ) : (
                    <Eye
                      className="absolute right-2 top-2 cursor-pointer"
                      onClick={() => setShowConfirmPassword(true)}
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="mt-6 flex w-full justify-end gap-4">
          <Button
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              form.reset();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" className="bg-primaryRed hover:bg-hoveredRed">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password..
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
