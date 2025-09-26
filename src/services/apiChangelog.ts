import { supabase } from "./supabase";

export interface ChangelogItem {
  id: number;
  title: string;
  description: string;
  version: string;
  release_date: string;
  features: string[];
  roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChangelogData {
  title: string;
  description: string;
  version: string;
  release_date: string;
  features: string[];
  roles: string[];
}

export interface UpdateChangelogData extends Partial<CreateChangelogData> {
  is_active?: boolean;
}

// Get all active changelogs for a specific role
export async function getChangelogsForRole(
  userRole: string
): Promise<ChangelogItem[]> {
  try {
    const { data, error } = await supabase
      .from("changelogs")
      .select("*")
      .eq("is_active", true)
      .order("release_date", { ascending: false });

    if (error) {
      console.error("Error fetching changelogs:", error);
      throw new Error("Failed to fetch changelogs");
    }

    // Filter by role on the client side since Supabase JSONB contains is tricky
    const filteredData = (data || []).filter(
      (changelog) =>
        changelog.roles.includes(userRole) || changelog.roles.includes("all")
    );

    return filteredData;
  } catch (error) {
    console.error("Error in getChangelogsForRole:", error);
    // Return empty array if there's an error
    return [];
  }
}

// Get all changelogs (admin only)
export async function getAllChangelogs(): Promise<ChangelogItem[]> {
  const { data, error } = await supabase
    .from("changelogs")
    .select("*")
    .order("release_date", { ascending: false });

  if (error) {
    console.error("Error fetching all changelogs:", error);
    throw new Error("Failed to fetch changelogs");
  }

  return data || [];
}

// Create a new changelog (admin only)
export async function createChangelog(
  changelogData: CreateChangelogData
): Promise<ChangelogItem> {
  const { data, error } = await supabase
    .from("changelogs")
    .insert([changelogData])
    .select()
    .single();

  if (error) {
    console.error("Error creating changelog:", error);
    throw new Error("Failed to create changelog");
  }

  return data;
}

// Update a changelog (admin only)
export async function updateChangelog(
  id: number,
  changelogData: UpdateChangelogData
): Promise<ChangelogItem> {
  const { data, error } = await supabase
    .from("changelogs")
    .update({ ...changelogData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating changelog:", error);
    throw new Error("Failed to update changelog");
  }

  return data;
}

// Delete a changelog (admin only)
export async function deleteChangelog(id: number): Promise<void> {
  const { error } = await supabase.from("changelogs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting changelog:", error);
    throw new Error("Failed to delete changelog");
  }
}

// Toggle changelog active status (admin only)
export async function toggleChangelogStatus(
  id: number,
  isActive: boolean
): Promise<ChangelogItem> {
  const { data, error } = await supabase
    .from("changelogs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error toggling changelog status:", error);
    throw new Error("Failed to toggle changelog status");
  }

  return data;
}

// Insert initial changelog data (run this once to populate the table)
export async function insertInitialChangelogData(): Promise<void> {
  const initialChangelogs = [
    {
      title: "Edit Button for Job Orders",
      description:
        "Added an edit button to job order forms when in read-only mode for better user experience. Users can now easily switch between viewing and editing job orders.",
      version: "v1.2.0",
      release_date: "2024-01-15",
      features: [
        "Edit button appears when viewing job orders in read-only mode",
        "Visual indicators show when in edit mode",
        "Cancel button to exit edit mode without saving",
        "Form fields become editable when edit mode is activated",
      ],
      roles: ["admin", "technician", "manager"],
      is_active: true,
    },
    {
      title: "Warning Filter for Job Orders",
      description:
        "Added a new warning filter to quickly identify job orders that need attention. This helps prioritize pending orders that have been waiting too long.",
      version: "v1.2.1",
      release_date: "2024-01-15",
      features: [
        "Warning filter button with red alert icon",
        "Shows job orders pending for more than 2 days",
        "Visual feedback when filter is active",
        "Easy removal from active filters section",
      ],
      roles: ["admin", "technician", "manager"],
      is_active: true,
    },
    {
      title: "Changelog System",
      description:
        "Implemented a new changelog system to keep users informed about updates and new features. This system respects user roles and remembers what you have seen.",
      version: "v1.2.2",
      release_date: "2024-01-15",
      features: [
        "Role-based changelog visibility",
        "Step-by-step changelog presentation",
        "Automatic tracking of viewed updates",
        "Clean and intuitive interface",
      ],
      roles: ["admin", "technician", "manager"],
      is_active: true,
    },
  ];

  try {
    const { error } = await supabase
      .from("changelogs")
      .insert(initialChangelogs);

    if (error) {
      console.error("Error inserting initial changelog data:", error);
      throw new Error("Failed to insert initial changelog data");
    }

    console.log("Initial changelog data inserted successfully");
  } catch (error) {
    console.error("Error in insertInitialChangelogData:", error);
    throw error;
  }
}
