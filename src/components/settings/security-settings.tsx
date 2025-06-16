import { Shield, Info } from "lucide-react";
import UpdateUserPassForm from "../auth/update-user-pass-form";

export const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-100 p-2">
          <Shield className="size-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Security Settings</h2>
          <p className="text-muted-foreground text-sm">
            Manage your password and account security
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-4">Change Password</h3>
          <div className="p-6 rounded-xl bg-white shadow-sm border">
            <UpdateUserPassForm />
          </div>
        </div>

        {/* Security Tips */}
        <div className="p-6 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Info className="size-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-2">Security Tips</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Use a strong password with at least 8 characters</li>
                <li>
                  • Include uppercase, lowercase, numbers, and special
                  characters
                </li>
                <li>• Don't reuse passwords from other accounts</li>
                <li>• Update your password regularly for better security</li>
                <li>• Never share your password with anyone</li>
                <li>• Log out from shared or public computers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
