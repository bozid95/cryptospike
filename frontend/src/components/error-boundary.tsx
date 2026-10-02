import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangleIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "Uncaught runtime error caught by GlobalErrorBoundary:",
      error,
      errorInfo,
    );
  }

  private handleResetStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full border rounded-xl p-6 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangleIcon className="size-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Aplikasi Mengalami Kendala Tampilan
                </h2>
                <p className="text-xs text-muted-foreground">
                  Terjadi runtime error pada state komponen browser.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/60 border font-mono text-xs text-destructive overflow-x-auto max-h-32">
              {this.state.error?.message || "Unknown client error"}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="flex-1 gap-1.5 text-xs"
              >
                <RefreshCwIcon className="size-3.5" />
                Refresh Halaman
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={this.handleResetStorage}
                className="flex-1 gap-1.5 text-xs"
              >
                <Trash2Icon className="size-3.5" />
                Reset Cache & Muat Ulang
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
