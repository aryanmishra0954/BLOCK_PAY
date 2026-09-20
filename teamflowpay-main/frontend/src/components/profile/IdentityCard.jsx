import React from "react";
import { User, ShieldCheck } from "lucide-react";

export default function IdentityCard({ user }) {
  return (
    <div className="card-base p-6 sm:p-7 shadow-sm text-xs space-y-5 bg-[#101216] border border-[#20242c]">
      <div className="flex items-center gap-2 font-semibold text-sm text-white font-display">
        <User className="w-4 h-4 text-zinc-400" />
        <span>Account Details</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
            Full Name
          </label>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0c0d10] border border-[#20242c] text-white font-medium">
            {user?.full_name || "BlockPay User"}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
            Email Address
          </label>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0c0d10] border border-[#20242c] text-white font-mono">
            {user?.email || "user@BlockPay.io"}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-400 mb-1 font-sans">
          Account Security
        </label>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c0d10] border border-[#20242c] text-zinc-300 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active & Verified Session</span>
        </div>
      </div>
    </div>
  );
}
