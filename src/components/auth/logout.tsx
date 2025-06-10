import { Loader2, LogOut } from "lucide-react";
import { useLogout } from "./useLogout";

export default function Logout() {
  const { logout, isLoading } = useLogout();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    logout();
  };

  return (
    <button
      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <LogOut size={16} />
      )}
      Logout
    </button>
  );
}
