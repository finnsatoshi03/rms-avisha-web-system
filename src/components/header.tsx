import { useState } from "react";
import { NavLink } from "react-router-dom";
import Logout from "./auth/logout";
import { useUser } from "./auth/useUser";
import { Search } from "./search";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UserRoundCog } from "lucide-react";
import { cn } from "../lib/utils";

export default function Header({ className }: { className?: string }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const placeholders = [
    "Search job order by ID",
    "Find client by name",
    "Search sales by date",
    "Look up job order status",
    "Search client by ID",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };

  return (
    <div className={cn("w-full flex justify-between items-center", className)}>
      <div>
        <Search
          placeholders={placeholders}
          onChange={handleChange}
          onSubmit={onSubmit}
        />
      </div>
      <Popover>
        <PopoverTrigger onClick={() => setOpen(true)}>
          <div className="flex gap-2">
            <Avatar>
              <AvatarImage
                src={user?.user_metadata.avatar || "/RMS-icon.png"}
              />
              <AvatarFallback>RMS</AvatarFallback>
            </Avatar>
            <div className="leading-3 text-left">
              <p className="font-bold">
                {user
                  ? user?.user_metadata.fullname
                    ? user?.user_metadata.fullname
                    : user?.email
                  : "H3cker"}
              </p>
              <p className="opacity-60 text-sm font-semibold">
                {user
                  ? user?.user_metadata.role
                    ? user?.user_metadata.role
                    : user?.role
                  : "H3cker"}
              </p>
            </div>
          </div>
        </PopoverTrigger>
        {open && (
          <PopoverContent className="p-3 max-w-[200px] flex flex-col gap-1">
            <NavLink
              to="account"
              className="flex gap-2"
              onClick={() => setOpen(false)}
            >
              <UserRoundCog size={20} />
              Account
            </NavLink>
            <Logout />
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
