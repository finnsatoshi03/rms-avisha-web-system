/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { getStatusClass } from "../../lib/helpers";

interface DashboardTabsProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
  statusCounts: Record<string, number>;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  currentTab,
  setCurrentTab,
  children,
  statusCounts,
}) => {
  return (
    <Tabs
      defaultValue="overview"
      className="w-full h-[calc(100%-1rem-0.5rem-2rem)] mt-4 mb-2"
      onValueChange={setCurrentTab}
    >
      <div className="flex gap-6">
        <TabsList className="grid w-fit grid-cols-3 gap-2">
          <TabsTrigger value="overview" className="font-bold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="report" className="font-bold">
            Sales Report
          </TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold">
            Analytics
          </TabsTrigger>
        </TabsList>
        {currentTab === "overview" && (
          <div className="flex gap-2 self-end opacity-100">
            {Object.entries(statusCounts)
              .filter(([_, count]) => count > 0)
              .map(([status, count]) => (
                <div key={status} className="flex gap-1 items-center">
                  <span className="text-xs font-bold">{status}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full w-fit flex items-center font-bold ${getStatusClass(
                      status
                    )}`}
                  >
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
      {children}
    </Tabs>
  );
};

export default DashboardTabs;
