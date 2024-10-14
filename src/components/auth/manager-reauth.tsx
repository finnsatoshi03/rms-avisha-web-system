import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "./useLogin";
import { useUser } from "./useUser";
import toast from "react-hot-toast";
import { Button } from "../ui/button";

export default function ManagerReAuth() {
  const [password, setPassword] = useState("");
  const { login, isLoading } = useLogin();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user && user.email) {
      login(
        { email: user.email, password },
        {
          onSuccess: () => {
            localStorage.setItem("managerReAuthenticated", "true");
            navigate("/dashboard");
          },
        }
      );
    } else {
      toast.error("User or user email is undefined");
    }
  };

  return (
    <div className="flex items-center justify-center h-[calc(100%-1rem)] bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded">
        <h3 className="text-2xl font-bold text-center">
          Manager Re-Authentication
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-red-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Authenticate"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
