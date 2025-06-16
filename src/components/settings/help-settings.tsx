import {
  HelpCircle,
  Clock,
  MessageCircle,
  Book,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";

export const HelpSettings = () => {
  const faqItems = [
    {
      question: "How do I create a new job order?",
      answer:
        "Navigate to the Job Orders section and click 'Create New Job Order'...",
    },
    {
      question: "How can I update my profile information?",
      answer: "Go to Settings > Account to update your personal information...",
    },
    {
      question: "How do I generate reports?",
      answer:
        "Visit the Dashboard and use the Reports section to generate various reports...",
    },
    {
      question: "What should I do if I forgot my password?",
      answer:
        "Use the 'Forgot Password' link on the login page to reset your password...",
    },
  ];

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
          Help & Support features will be available in a future update. Preview
          the upcoming features below!
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-indigo-100 p-2">
          <HelpCircle className="size-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Help & Support</h2>
          <p className="text-muted-foreground text-sm">
            Get help and contact support for assistance
          </p>
        </div>
      </div>

      {/* Contact Support */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            Contact Support
          </CardTitle>
          <CardDescription>
            Send a message to our support team for assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Submit Support Ticket</Label>
                <p className="text-muted-foreground text-xs">
                  Get help with technical issues or account problems
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Live Chat Support</Label>
                <p className="text-muted-foreground text-xs">
                  Chat with our support team in real-time
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Schedule a Call</Label>
                <p className="text-muted-foreground text-xs">
                  Book a phone consultation with our experts
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="size-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Find answers to common questions about the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/20">
                <h4 className="font-medium text-sm mb-2">{item.question}</h4>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="font-medium">View Complete FAQ</Label>
              <p className="text-muted-foreground text-xs">
                Browse our comprehensive help documentation
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Other ways to reach our support team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              <Mail className="size-5 text-blue-600" />
              <div>
                <Label className="font-medium text-sm">Email Support</Label>
                <p className="text-sm text-muted-foreground">
                  support@rmsavisha.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              <Phone className="size-5 text-green-600" />
              <div>
                <Label className="font-medium text-sm">Phone Support</Label>
                <p className="text-sm text-muted-foreground">
                  +63 (2) 123-4567
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
            <ExternalLink className="size-5 text-purple-600" />
            <div>
              <Label className="font-medium text-sm">Documentation</Label>
              <p className="text-sm text-muted-foreground">
                Visit our online help center and user guides
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Information that helps us assist you better
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">
                Version
              </Label>
              <p className="font-mono bg-muted/50 rounded px-2 py-1">v2.1.0</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">
                Browser
              </Label>
              <p className="font-mono bg-muted/50 rounded px-2 py-1">
                Chrome 120.0
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">
                User ID
              </Label>
              <p className="font-mono bg-muted/50 rounded px-2 py-1">
                usr_123456
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">
                Last Login
              </Label>
              <p className="font-mono bg-muted/50 rounded px-2 py-1">
                Dec 16, 2024
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
