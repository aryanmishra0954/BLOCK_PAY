import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0b0d] text-zinc-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#101216] border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-white">Something went wrong</h2>
                <p className="text-xs text-zinc-400">A rendering exception was caught</p>
              </div>
            </div>

            <div className="p-3 bg-[#08090b] rounded-lg border border-zinc-800 font-mono text-[11px] text-rose-300 break-words max-h-40 overflow-y-auto">
              {this.state.error?.message || "Unknown rendering exception"}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="py-2 px-3 rounded-lg bg-[#181b22] hover:bg-[#20242d] border border-zinc-700 text-zinc-300 text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reset to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
