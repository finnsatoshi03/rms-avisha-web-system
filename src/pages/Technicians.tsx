import { useEffect, useState } from "react";
import SignupForm from "../components/auth/signup-form";
import HeaderText from "../components/ui/headerText";
import { Input } from "../components/ui/input";
import { Plus, Search } from "lucide-react";
import { Dialog } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteTechnician, getTechnicians } from "../services/apiTechnicians";
import Loader from "../components/ui/loader";
import { TechnicianWithJobOrders } from "../lib/types";
import TechnicianCard from "../components/technicians/technician-card";
import toast from "react-hot-toast";
import { ConfirmDialog } from "../components/table/alert-dialog";
import { useUser } from "../components/auth/useUser";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

export default function Technicians() {
  const queryClient = useQueryClient();

  const { isAdmin, isManager, branchId: currentUserBranchId } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ["technicians", { fetchAll: false }],
    queryFn: () => getTechnicians({ fetchAll: false }),
  });

  const { mutate: mutateDeleteTech, isPending: isDeleting } = useMutation({
    mutationFn: (ids: string[]) => deleteTechnician(ids),
    onSuccess: () => {
      toast.success("Technician deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [technicians, setTechnicians] = useState<TechnicianWithJobOrders[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<
    string | null
  >(null);
  const [adminTechnicians, setAdminTechnicians] = useState<
    TechnicianWithJobOrders[]
  >([]);
  const [managerTechnicians, setManagerTechnicians] = useState<
    TechnicianWithJobOrders[]
  >([]);

  const handleRemoveTechnician = (id: string) => {
    setSelectedTechnicianId(id);
    setConfirmDialogOpen(true);
  };

  const confirmDeleteTechnician = () => {
    if (selectedTechnicianId) {
      mutateDeleteTech([selectedTechnicianId]);
      setSelectedTechnicianId(null);
    }
    setConfirmDialogOpen(false);
  };

  useEffect(() => {
    if (data) {
      let scopedUsers = data;

      if (isManager && !isAdmin) {
        scopedUsers = data.filter(
          (staff) =>
            staff.branch_id === currentUserBranchId || staff.branch_id === null
        );
      }

      const admins = scopedUsers.filter((staff) => staff.role === "admin");
      const managers = scopedUsers.filter((staff) => staff.role === "manager");
      const techniciansOnly = scopedUsers.filter(
        (staff) => staff.role === "technician"
      );

      setAdminTechnicians(admins);
      setManagerTechnicians(managers);
      setTechnicians(techniciansOnly);
    }
  }, [data, isAdmin, isManager, currentUserBranchId]);

  const filteredAdmins = adminTechnicians.filter(
    (tech) =>
      tech.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredManagers = managerTechnicians.filter(
    (tech) =>
      tech.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTechnicians = technicians.filter(
    (tech) =>
      tech.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading)
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <>
      <div>
        <HeaderText>Technicians</HeaderText>
        <div className="my-4 flex justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-gray-400 h-fit py-1 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all ease-in-out duration-500 relative focus-within:w-[300px]"
                placeholder="Search..."
              />
              <Search className="absolute left-3 top-2 opacity-60" size={14} />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-1.5 text-sm bg-primaryRed hover:bg-hoveredRed text-white flex items-center rounded-lg gap-1">
                  <Plus size={18} />
                  Add
                </button>
              </DialogTrigger>
              <DialogContent className="min-w-[50vw] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">
                    Create New Technician
                  </DialogTitle>
                  <Separator className="my-2" />
                  <SignupForm />
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="technicians" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="technicians">Technicians</TabsTrigger>
            <TabsTrigger value="managers">Managers</TabsTrigger>
            <TabsTrigger value="admin">CEO</TabsTrigger>
          </TabsList>

          <TabsContent value="admin">
            {filteredAdmins.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 mb-4">CEOs</h3>
                <div className="grid xl:grid-cols-4 lg:grid-cols-2 grid-cols-1 gap-4">
                  {filteredAdmins.map((technician) => (
                    <TechnicianCard
                      key={technician.id}
                      technician={technician}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No CEOs found</p>
            )}
          </TabsContent>

          <TabsContent value="managers">
            {filteredManagers.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Managers
                </h3>
                <div className="grid xl:grid-cols-4 lg:grid-cols-2 grid-cols-1 gap-4">
                  {filteredManagers.map((technician) => (
                    <TechnicianCard
                      key={technician.id}
                      technician={technician}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No managers found
              </p>
            )}
          </TabsContent>

          <TabsContent value="technicians">
            {filteredTechnicians.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Technicians
                </h3>
                <div className="grid xl:grid-cols-4 lg:grid-cols-2 grid-cols-1 gap-4">
                  {filteredTechnicians.map((technician) => (
                    <TechnicianCard
                      key={technician.id}
                      technician={technician}
                      onRemove={() => handleRemoveTechnician(technician.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No technicians found
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmDeleteTechnician}
        message="Are you sure you want to delete this technician?"
        isPending={isDeleting}
      />
    </>
  );
}
