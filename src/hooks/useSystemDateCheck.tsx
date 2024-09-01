import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// This function fetches the current time from an online API
async function fetchServerTime(): Promise<Date | null> {
  try {
    const response = await fetch("https://worldtimeapi.org/api/ip");
    const data = await response.json();
    return new Date(data.utc_datetime);
  } catch (error) {
    console.error("Failed to fetch server time", error);
    return null;
  }
}

export function useSystemDateCheck(thresholdInMinutes = 5) {
  const navigate = useNavigate();
  const [isDateCorrect, setIsDateCorrect] = useState(true);

  useEffect(() => {
    async function checkSystemDate() {
      const systemTime = new Date();
      const serverTime = await fetchServerTime();

      console.log("System Time: ", systemTime);
      console.log("Server Time: ", serverTime);

      if (serverTime) {
        const timeDifference = Math.abs(
          (systemTime.getTime() - serverTime.getTime()) / 1000 / 60
        ); // difference in minutes

        if (timeDifference > thresholdInMinutes) {
          setIsDateCorrect(false);
          navigate("/date-error"); // Redirect to an error page or perform another action
        }
      } else {
        console.error("Unable to verify system time against server time.");
      }
    }

    checkSystemDate();
  }, [navigate, thresholdInMinutes]);

  return isDateCorrect;
}
