import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";

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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUser } from "./useUser";
import { useUpdatedUser } from "./useUpdatedUser";
import { Loader2, Camera, Upload, X, User } from "lucide-react";
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

export default function UpdateUserDataForm() {
  const { user } = useUser();
  const { updateUser, isLoading } = useUpdatedUser();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const email = user?.email;
  const currentFullname = user?.user_metadata?.fullname;
  const currentAvatar = user?.user_metadata?.avatar;

  // Debug logging
  console.log("UpdateUserDataForm - user:", user);
  console.log("UpdateUserDataForm - email:", email);
  console.log("UpdateUserDataForm - currentFullname:", currentFullname);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email || "",
      fullname: currentFullname || "",
      avatar: undefined,
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (email) {
      form.setValue("email", email);
    }
    if (currentFullname) {
      form.setValue("fullname", currentFullname);
    }
  }, [email, currentFullname, form]);

  const handleFileChange = (file: File) => {
    form.setValue("avatar", file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleFileChange(file);
      }
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    form.setValue("avatar", undefined);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // console.log(values);
    if (!values.fullname) return;
    updateUser(
      { fullname: values.fullname, avatar: values.avatar, password: "" },
      {
        onSuccess: () => {
          form.reset();
          setPreviewUrl(null);
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
          render={() => (
            <FormItem className="mb-6">
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Avatar Preview */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-gray-200">
                      <AvatarImage
                        src={previewUrl || currentAvatar}
                        alt="Profile preview"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100">
                        <User className="h-8 w-8 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {previewUrl
                          ? "New profile picture"
                          : "Current profile picture"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, or WEBP. Max size of 5MB.
                      </p>
                    </div>
                    {previewUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearPreview}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div
                    className={`relative rounded-lg border-2 border-dashed transition-colors ${
                      dragActive
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    } p-6`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        {dragActive ? (
                          <Upload className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Camera className="h-6 w-6 text-gray-600" />
                        )}
                      </div>
                      <div className="mt-4 flex justify-center text-sm leading-6 text-gray-600">
                        <label
                          htmlFor="avatar-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="avatar-upload"
                            type="file"
                            className="sr-only"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            disabled={isLoading}
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                const file = e.target.files[0];
                                handleFileChange(file);
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-600">
                        PNG, JPG, WEBP up to 5MB
                      </p>
                    </div>
                  </div>
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
              setPreviewUrl(null);
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
