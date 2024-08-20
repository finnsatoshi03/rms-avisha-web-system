import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
// import Header from "../components/header";
import { useUser } from "../components/auth/useUser";

export default function AppLayout() {
  const { isUser } = useUser();

  return (
    <div className="grid h-screen grid-cols-[0.15fr_1fr] w-screen gap-8 ">
      <Sidebar className="p-8 h-screen row-span-2" isUser={isUser} />
      {/* <div className="pt-8 px-8">
        <Header />
      </div> */}
      <main className="pt-8 pb-8 px-8 h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
