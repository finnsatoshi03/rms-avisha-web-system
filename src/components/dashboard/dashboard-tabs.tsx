/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

interface DashboardTabsProps {
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  setCurrentTab,
  children,
}) => {
  return (
    <Tabs
      defaultValue="overview"
      className="w-full h-[calc(100%-1rem-0.5rem-2rem)] mt-4 mb-2"
      onValueChange={setCurrentTab}
    >
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
      {children}
    </Tabs>
  );
};

export default DashboardTabs;
