/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <Button onClick={this.handleRefresh}>Refresh Page</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
