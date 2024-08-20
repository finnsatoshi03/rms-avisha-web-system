import { Loader2, LogOut } from "lucide-react";
import { useLogout } from "./useLogout";

export default function Logout() {
  const { logout, isLoading } = useLogout();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    logout();
  };

  return (
    <a>
      <button
        className="cursor-pointer flex items-center gap-2"
        disabled={isLoading}
        onClick={handleClick}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogOut size={20} />
        )}
        Logout
      </button>
    </a>
  );
}
