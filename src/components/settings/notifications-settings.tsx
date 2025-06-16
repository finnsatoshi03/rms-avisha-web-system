import { Bell, Mail, Smartphone, Clock, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export const NotificationsSettings = () => {
  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="text-amber-600 size-4" />
          <span className="text-amber-800 font-medium text-sm">
            Coming Soon
          </span>
        </div>
        <p className="text-amber-700 text-sm">
          Notification preferences will be available in a future update. Preview
          the upcoming features below!
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-green-100 p-2">
          <Bell className="size-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Notification Settings</h2>
          <p className="text-muted-foreground text-sm">
            Manage how and when you receive notifications
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure email notification preferences for important updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">New Job Orders</Label>
                  <p className="text-muted-foreground text-xs">
                    Get notified when new job orders are created
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Status Updates</Label>
                  <p className="text-muted-foreground text-xs">
                    Receive updates when job order status changes
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Payment Reminders</Label>
                  <p className="text-muted-foreground text-xs">
                    Get reminded about pending payments
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Weekly Reports</Label>
                  <p className="text-muted-foreground text-xs">
                    Receive weekly summary reports
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Configure browser and mobile push notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Browser Notifications</Label>
                  <p className="text-muted-foreground text-xs">
                    Show notifications in your browser
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Sound Alerts</Label>
                  <p className="text-muted-foreground text-xs">
                    Play sound when notifications arrive
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Urgent Alerts Only</Label>
                  <p className="text-muted-foreground text-xs">
                    Only show high-priority notifications
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Schedule */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              Notification Schedule
            </CardTitle>
            <CardDescription>
              Set when you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Start Time</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="9:00 AM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9am">9:00 AM</SelectItem>
                    <SelectItem value="10am">10:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">End Time</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="6:00 PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5pm">5:00 PM</SelectItem>
                    <SelectItem value="6pm">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Weekend Notifications</Label>
                <p className="text-muted-foreground text-xs">
                  Receive notifications on weekends
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled>
            Test Notification
          </Button>
          <Button disabled className="bg-primaryRed hover:bg-hoveredRed">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
