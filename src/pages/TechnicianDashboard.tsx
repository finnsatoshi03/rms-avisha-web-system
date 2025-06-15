import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import TechnicianDashboard from "../components/dashboard/technician-page";
import { getTechnicians } from "../services/apiTechnicians";
import { useUser } from "../components/auth/useUser";
import Loader from "../components/ui/loader";
import HeaderText from "../components/ui/headerText";

export default function TechnicianDashboardPage() {
  const { user } = useUser();

  const { data: technicians, isLoading: isTechniciansLoading } = useQuery({
    queryKey: ["technicians", { fetchAll: true }],
    queryFn: () => getTechnicians({ fetchAll: true }),
  });

  const matchedTechnicianData = useMemo(() => {
    if (!technicians || !user) return null;

    return technicians.find((tech) => tech.id === user.id);
  }, [technicians, user]);

  if (isTechniciansLoading || !matchedTechnicianData) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-full">
      <HeaderText>Dashboard</HeaderText>
      <div className="mt-4 w-full pb-8">
        <TechnicianDashboard technician={matchedTechnicianData} />
      </div>
    </div>
  );
}
