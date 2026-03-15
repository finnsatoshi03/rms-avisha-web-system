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
import { useEffect, useState } from "react";
import { useSignup } from "./useSignup";
import { useUser } from "./useUser";
import { useQuery } from "@tanstack/react-query";
import { getBranches } from "../../services/apiBranches";

interface FormData {
  fullname: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  branch: string;
}

const formSchema = z.object({
  fullname: z.string().min(2, "Fullname must be at least 2 characters."),
  email: z.string().email("Invalid type of email address."),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length >= 8,
      "Password must be at least 8 characters."
    ),
  confirmPassword: z.string().optional(),
  branch: z.string().min(1, "Branch is required."),
});

const formResolver = (data: FormData) => {
  try {
    formSchema.parse(data);

    if (data.password && data.password !== data.confirmPassword) {
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

    if (!data.password && data.confirmPassword) {
      return {
        errors: {
          password: {
            type: "manual",
            message: "Enter a password before confirming.",
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
  const { isManager, branchId: currentUserBranchId } = useUser();
  const { data: branches } = useQuery({
    queryKey: ["branches", "signup-form"],
    queryFn: getBranches,
  });
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

  useEffect(() => {
    if (isManager && currentUserBranchId) {
      form.setValue("branch", String(currentUserBranchId));
    }
  }, [form, isManager, currentUserBranchId]);

  const selectableBranches = (branches || []).filter((branch) => {
    if (!isManager) return true;
    return currentUserBranchId !== null && branch.id === currentUserBranchId;
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.email) return;

    const branchId =
      values.branch === "all" ? null : Number.parseInt(values.branch, 10);

    signup(
      {
        fullname: values.fullname,
        email: values.email,
        password: values.password?.trim() ? values.password : undefined,
        role: "technician",
        branchId,
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
                  disabled={
                    isLoading || (isManager && currentUserBranchId !== null)
                  }
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                    {!isManager && <SelectItem value="all">All Branches</SelectItem>}
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
                    placeholder="Optional: set temporary password"
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
                    placeholder="Confirm temporary password"
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
