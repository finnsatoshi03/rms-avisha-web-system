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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { useState } from "react";
import { useSignup } from "./useSignup";

interface FormData {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
  branch: string;
}

const formSchema = z.object({
  fullname: z.string().min(2, "Fullname must be at least 2 characters."),
  email: z.string().email("Invalid type of email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
  branch: z.string().min(1, "Branch is required."),
});

const formResolver = (data: FormData) => {
  try {
    formSchema.parse(data);

    if (data.password !== data.confirmPassword) {
      return {
        errors: {
          confirmPassword: {
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

export default function SignupForm() {
  const { signup, isLoading } = useSignup();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: formResolver,
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
      branch: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.email || !values.password) return;

    signup(
      {
        fullname: values.fullname,
        email: values.email,
        password: values.password,
        role: `technician - ${values.branch} branch`,
      },
      { onSettled: () => form.reset() }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="branch"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Branch</FormLabel>
              <FormControl>
                <Select
                  {...field}
                  disabled={isLoading}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taytay">Taytay</SelectItem>
                    <SelectItem value="pasig">Pasig</SelectItem>
                    <SelectItem value="general">All Branch</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullname"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Fullname</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your full name"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your work email"
                  {...field}
                  disabled={isLoading}
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
            <FormItem className="mb-4">
              <FormLabel>Password</FormLabel>
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
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
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
          <Button variant="secondary">Cancel</Button>
          <Button type="submit" className="bg-primaryRed hover:bg-hoveredRed">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating..
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
