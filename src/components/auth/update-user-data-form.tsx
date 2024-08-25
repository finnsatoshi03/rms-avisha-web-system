/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useUser } from "./useUser";
import { useUpdatedUser } from "./useUpdatedUser";
import { Loader2 } from "lucide-react";
// import { TechnicianWithJobOrders } from "../../lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  email: z.string().email().optional(),
  fullname: z
    .string()
    .min(2, { message: "Fullname must be at least 2 characters." }),
  avatar: z
    .any()
    .optional()
    .nullable()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `Max image size is 5MB.`
    ),
});

export default function UpdateUserDataForm(technician?: any) {
  const { user } = useUser();
  const { updateUser, isLoading } = useUpdatedUser();
  const technicianData = technician ? technician.technician : null;

  const email = technician ? technicianData?.email : user?.email;
  const currentFullname = technician
    ? technicianData?.fullname
    : user?.user_metadata?.fullname;
  //   const avatar = user?.user_metadata?.avatar;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email,
      fullname: currentFullname,
      avatar: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // console.log(values);
    if (!values.fullname) return;
    updateUser(
      { fullname: values.fullname, avatar: values.avatar, password: "" },
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
          name="email"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} disabled={true} />
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
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  {...{
                    ...field,
                    value: undefined,
                  }}
                  disabled={isLoading}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      const file = e.target.files[0];
                      //   console.log("Selected file:", file);
                      form.setValue("avatar", file);
                    }
                  }}
                />
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
                Updating..
              </>
            ) : (
              "Update Account"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
