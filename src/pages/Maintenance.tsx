import Lottie from "lottie-react";
import maintenanceAnimation from "../assets/maintenance.json";

export default function Maintenance() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-48 h-48">
        <Lottie animationData={maintenanceAnimation} loop={true} />
      </div>
      <h1 className="text-3xl font-bold mb-4">We'll Be Back Soon!</h1>
      <p className="opacity-60">
        This page is currently undergoing maintenance. Please check back later.
      </p>
    </div>
  );
}
