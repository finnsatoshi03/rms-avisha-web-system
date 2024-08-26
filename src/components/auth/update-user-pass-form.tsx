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
import { useUpdatedUser } from "./useUpdatedUser";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface FormData {
  confirm_password: string;
  new_password: string;
}

const formSchema = z.object({
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
  const { updateUser, isLoading } = useUpdatedUser();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: formResolver,
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // console.log(values);
    // if (!values.fullname) return;
    updateUser(
      { fullname: "", avatar: "", password: values.new_password },
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
