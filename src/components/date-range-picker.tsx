import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  isSameDay,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "./../lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface DatePickerWithRangeProps {
  className?: string;
  value?: DateRange | undefined;
  onChange?: (range: DateRange | undefined) => void;
  isAnalytics?: boolean;
  isExpenses?: boolean;
  defaultFromDate?: Date;
  defaultToDate?: Date;
}

export function DatePickerWithRange({
  className,
  value,
  onChange,
  isAnalytics,
  isExpenses,
  defaultFromDate,
  defaultToDate,
}: DatePickerWithRangeProps) {
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (onChange) {
      onChange(range);
    }
  };

  const handlePresetClick = (preset: string) => {
    let newRange: DateRange | undefined;

    switch (preset) {
      case "all-time":
        newRange = {
          from: defaultFromDate,
          to: defaultToDate,
        };
        break;
      case "last-month":
        newRange = {
          from: startOfMonth(subDays(new Date(), 30)),
          to: endOfMonth(subDays(new Date(), 30)),
        };
        break;
      case "this-month":
        newRange = {
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date()),
        };
        break;
      case "last-quarter":
        newRange = {
          from: startOfQuarter(subDays(new Date(), 90)),
          to: endOfQuarter(subDays(new Date(), 90)),
        };
        break;
      case "year-to-date":
        newRange = {
          from: startOfYear(new Date()),
          to: new Date(),
        };
        break;
      default:
        newRange = undefined;
    }

    handleDateRangeChange(newRange);
  };

  const isActivePreset = (preset: string): boolean => {
    if (!value) return false;
    switch (preset) {
      case "all-time":
        return (
          isSameDay(value.from!, defaultFromDate!) &&
          isSameDay(value.to!, defaultToDate!)
        );
      case "last-month":
        return (
          isSameDay(value.from!, startOfMonth(subDays(new Date(), 30))) &&
          isSameDay(value.to!, endOfMonth(subDays(new Date(), 30)))
        );
      case "this-month":
        return (
          isSameDay(value.from!, startOfMonth(new Date())) &&
          isSameDay(value.to!, endOfMonth(new Date()))
        );
      case "last-quarter":
        return (
          isSameDay(value.from!, startOfQuarter(subDays(new Date(), 90))) &&
          isSameDay(value.to!, endOfQuarter(subDays(new Date(), 90)))
        );
      case "year-to-date":
        return (
          isSameDay(value.from!, startOfYear(new Date())) &&
          isSameDay(value.to!, new Date())
        );
      default:
        return false;
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a custom range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" asChild>
          <div className="flex gap-2">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from || subDays(new Date(), 30)}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
            {(isAnalytics || isExpenses) && (
              <div className="py-3 px-4 flex flex-col gap-1">
                <Button
                  variant={isActivePreset("all-time") ? "default" : "outline"}
                  onClick={() => handlePresetClick("all-time")}
                >
                  All Time
                </Button>
                <Button
                  variant={isActivePreset("last-month") ? "default" : "outline"}
                  onClick={() => handlePresetClick("last-month")}
                >
                  Last Month
                </Button>
                <Button
                  variant={isActivePreset("this-month") ? "default" : "outline"}
                  onClick={() => handlePresetClick("this-month")}
                >
                  This Month
                </Button>
                <Button
                  variant={
                    isActivePreset("last-quarter") ? "default" : "outline"
                  }
                  onClick={() => handlePresetClick("last-quarter")}
                >
                  Last Quarter
                </Button>
                <Button
                  variant={
                    isActivePreset("year-to-date") ? "default" : "outline"
                  }
                  onClick={() => handlePresetClick("year-to-date")}
                >
                  Year to Date
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
