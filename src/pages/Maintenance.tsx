import { Wrench } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Wrench className="h-10 w-10 animate-[wiggle_1.2s_ease-in-out_infinite] text-muted-foreground" />
      </div>
      <style>{`@keyframes wiggle { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }`}</style>
      <h1 className="text-3xl font-bold mb-4">We'll Be Back Soon!</h1>
      <p className="opacity-60">
        This page is currently undergoing maintenance. Please check back later.
      </p>
    </div>
  );
}
