import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Trash } from "lucide-react";
import { TechnicianWithJobOrders } from "../../lib/types";
import { formatTimeAgo } from "../../lib/helpers";
import { useNavigate } from "react-router-dom";

interface TechnicianCardProps {
  technician: TechnicianWithJobOrders;
  onRemove: () => void;
}

export default function TechnicianCard({
  technician,
  onRemove,
}: TechnicianCardProps) {
  const navigate = useNavigate();

  const handleViewMore = () => {
    const technicianName = technician.fullname?.replace(/\s+/g, "");
    navigate(`/technicians/${technicianName}`, {
      state: { technician },
    });
  };

  // Calculate the last repair date
  const lastRepairDate = technician.joborders.reduce((latestDate, jobOrder) => {
    const jobDate = new Date(jobOrder.created_at);
    return jobDate > latestDate ? jobDate : latestDate;
  }, new Date(0));

  // Calculate the total revenue
  const totalRevenue = technician.joborders.reduce((sum, jobOrder) => {
    if (jobOrder.status === "Completed" || jobOrder.status === "completed") {
      return sum + (jobOrder.grand_total || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="px-4 py-3.5 border border-gray-400 rounded-xl">
      <div className="flex justify-between">
        <Avatar>
          <AvatarImage
            src={`${technician.avatar}`}
            alt={`@${technician.fullname?.replace(/\s+/g, "")}`}
          />
          <AvatarFallback>{technician.fullname?.[0]}</AvatarFallback>
        </Avatar>
        <Button
          className="flex gap-1 items-center px-3 h-fit text-xs"
          variant={"outline"}
          onClick={onRemove}
        >
          Remove <Trash size={12} />
        </Button>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold">
          Technician{" "}
          <span className="text-xs opacity-60 font-normal ml-1">
            {lastRepairDate.getTime() === 0
              ? "No repairs yet"
              : formatTimeAgo(lastRepairDate)}
          </span>
        </p>
        <p className="text-lg font-bold my-0.5">{technician.fullname}</p>
        <div className="flex gap-2 items-center">
          <p className="px-2 py-1 text-xs rounded-lg bg-gray-200">Full-Time</p>
        </div>
      </div>
      <Separator className="mt-6 mb-1 bg-gray-400" />
      <div className="flex items-center mt-2 justify-between">
        <div>
          <p className="font-bold leading-4">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "PHP",
            }).format(totalRevenue)}
          </p>
          <p className="text-xs opacity-70">{technician.role}</p>
        </div>
        <Button className="h-fit text-sm" onClick={handleViewMore}>
          View More
        </Button>
      </div>
    </div>
  );
}
