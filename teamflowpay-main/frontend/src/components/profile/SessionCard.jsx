import React from "react";
import { ShieldCheck, LogOut } from "lucide-react";

export default function SessionCard({ onLogout }) {
  return (
    <div className="card-base p-6 sm:p-7 shadow-sm text-xs space-y-4 bg-[#101216] border border-[#20242c]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display font-semibold text-sm text-white">Session Security</h4>
          <p className="text-zinc-400 mt-0.5 font-sans">
            Authenticated via non-custodial session token stored in memory & SQLite backend.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-semibold text-xs flex items-center gap-1.5 transition font-sans"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="p-3.5 rounded-xl border border-[#20242c] bg-[#0c0d10] text-[11px] text-zinc-500 font-sans flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>
          Signing out invalidates your active session and clears client authentication tokens.
        </span>
      </div>
    </div>
  );
}
