import { Globe, Clock, Languages } from "lucide-react";
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
import { cn } from "../../lib/utils";

export const LanguageSettings = () => {
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸", selected: true },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "tl", name: "Filipino", flag: "🇵🇭" },
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
          Language and region settings will be available in a future update.
          Preview the upcoming features below!
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <Globe className="size-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Language & Region</h2>
          <p className="text-muted-foreground text-sm">
            Configure your language and regional preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Language Selection */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-5" />
              Display Language
            </CardTitle>
            <CardDescription>
              Choose your preferred language for the interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className={cn(
                    "relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md",
                    lang.selected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50",
                    "pointer-events-none" // Disabled interaction
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <Label className="font-medium">{lang.name}</Label>
                      <p className="text-muted-foreground text-xs">
                        {lang.code.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {lang.selected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary rounded-full p-1">
                        <div className="size-2 rounded-full bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Region Settings */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              Region & Format
            </CardTitle>
            <CardDescription>
              Set your region for date, time, and number formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Region</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="🇵🇭 Philippines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PH">🇵🇭 Philippines</SelectItem>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Date Format</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="MM/DD/YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Time Format</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="12-hour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Currency</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="₱ Philippine Peso (PHP)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="php">₱ Philippine Peso (PHP)</SelectItem>
                  <SelectItem value="usd">$ US Dollar (USD)</SelectItem>
                  <SelectItem value="eur">€ Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Format Preview */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Format Preview</CardTitle>
            <CardDescription>
              See how your selected formats will appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">
                  Date
                </Label>
                <p className="font-mono bg-muted/50 rounded px-2 py-1">
                  12/25/2024
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">
                  Time
                </Label>
                <p className="font-mono bg-muted/50 rounded px-2 py-1">
                  2:30 PM
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">
                  Currency
                </Label>
                <p className="font-mono bg-muted/50 rounded px-2 py-1">
                  ₱1,234.56
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">
                  Number
                </Label>
                <p className="font-mono bg-muted/50 rounded px-2 py-1">
                  1,234.56
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled>
            Reset to Default
          </Button>
          <Button disabled className="bg-primaryRed hover:bg-hoveredRed">
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
