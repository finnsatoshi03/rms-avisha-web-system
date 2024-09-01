import { Button } from "../components/ui/button";

export default function DateError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* <div className="text-center"> */}
      <p className="text-sm text-gray-700 mb-4">Oops! Something went wrong.</p>
      <h1 className="text-4xl font-black text-primaryRed mb-4">Date Error</h1>

      <p className="text-xs text-gray-500">
        Please check your system's date and time format and try again.
      </p>
      <Button
        variant={"link"}
        onClick={() => window.location.reload()}
        className="text-xs"
      >
        Reload Page
      </Button>
      {/* </div> */}
    </div>
  );
}
