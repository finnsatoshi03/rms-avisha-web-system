import { User } from "lucide-react";
import UpdateUserDataForm from "../auth/update-user-data-form";

export const AccountSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <User className="size-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Account Settings</h2>
          <p className="text-muted-foreground text-sm">
            Manage your personal information and profile
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-4">Personal Information</h3>
          <div className="p-6 rounded-xl bg-white shadow-sm border">
            <UpdateUserDataForm />
          </div>
        </div>
      </div>
    </div>
  );
};
