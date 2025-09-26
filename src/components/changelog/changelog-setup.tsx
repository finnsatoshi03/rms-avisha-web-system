"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { insertInitialChangelogData } from "../../services/apiChangelog";
import { toast } from "react-hot-toast";

export default function ChangelogSetup() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      await insertInitialChangelogData();
      toast.success("Changelog data initialized successfully!");
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to initialize changelog data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Changelog Setup</h3>
      <p className="text-gray-600 mb-4">
        Click the button below to initialize the changelog system with sample
        data. This only needs to be done once.
      </p>
      <Button
        onClick={handleSetup}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? "Setting up..." : "Initialize Changelog Data"}
      </Button>
    </div>
  );
}
