import React from "react";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <div className="h-screen w-full flex relative flex-col items-center justify-center">
      <Link to="/" className="absolute top-4 left-4 w-fit">
        Go back to Home
      </Link>
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
    </div>
  );
};

export default NotFound;
