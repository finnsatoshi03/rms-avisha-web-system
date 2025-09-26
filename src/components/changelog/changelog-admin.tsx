/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  getAllChangelogs,
  createChangelog,
  updateChangelog,
  deleteChangelog,
  toggleChangelogStatus,
  CreateChangelogData,
  UpdateChangelogData,
} from "../../services/apiChangelog";

export default function ChangelogAdmin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<any>(null);
  const [formData, setFormData] = useState<CreateChangelogData>({
    title: "",
    description: "",
    version: "",
    release_date: new Date().toISOString().split("T")[0],
    features: [],
    roles: [],
  });

  const queryClient = useQueryClient();

  // Fetch all changelogs
  const { data: changelogs, isLoading } = useQuery({
    queryKey: ["changelogs", "all"],
    queryFn: getAllChangelogs,
  });

  // Create changelog mutation
  const createMutation = useMutation({
    mutationFn: createChangelog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create changelog");
      console.error(error);
    },
  });

  // Update changelog mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateChangelogData }) =>
      updateChangelog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog updated successfully");
      setEditingChangelog(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update changelog");
      console.error(error);
    },
  });

  // Delete changelog mutation
  const deleteMutation = useMutation({
    mutationFn: deleteChangelog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete changelog");
      console.error(error);
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      toggleChangelogStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog status updated");
    },
    onError: (error) => {
      toast.error("Failed to update changelog status");
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      version: "",
      release_date: new Date().toISOString().split("T")[0],
      features: [],
      roles: [],
    });
  };

  const handleEdit = (changelog: any) => {
    setEditingChangelog(changelog);
    setFormData({
      title: changelog.title,
      description: changelog.description,
      version: changelog.version,
      release_date: changelog.release_date,
      features: changelog.features,
      roles: changelog.roles,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChangelog) {
      updateMutation.mutate({
        id: editingChangelog.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this changelog?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: number, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive: !isActive });
  };

  const availableRoles = ["admin", "technician", "manager", "user"];

  if (isLoading) {
    return <div>Loading changelogs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Changelog Management</h2>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingChangelog(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Changelog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingChangelog ? "Edit Changelog" : "Create New Changelog"}
              </DialogTitle>
              <DialogDescription>
                {editingChangelog
                  ? "Update the changelog information"
                  : "Add a new changelog entry for users"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Changelog title"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Version</label>
                  <Input
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    placeholder="v1.0.0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what's new"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Release Date</label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) =>
                    setFormData({ ...formData, release_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Features</label>
                <Textarea
                  value={formData.features.join("\n")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  placeholder="Enter each feature on a new line"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Roles</label>
                <div className="flex gap-4">
                  {availableRoles.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={formData.roles.includes(role)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              roles: [...formData.roles, role],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              roles: formData.roles.filter((r) => r !== role),
                            });
                          }
                        }}
                      />
                      <label htmlFor={role} className="text-sm">
                        {role}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingChangelog ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Release Date</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changelogs?.map((changelog) => (
            <TableRow key={changelog.id}>
              <TableCell className="font-medium">{changelog.title}</TableCell>
              <TableCell>
                <Badge variant="secondary">{changelog.version}</Badge>
              </TableCell>
              <TableCell>
                {new Date(changelog.release_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {changelog.roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={changelog.is_active ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() =>
                    handleToggleStatus(changelog.id, changelog.is_active)
                  }
                >
                  {changelog.is_active ? (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(changelog)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(changelog.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
