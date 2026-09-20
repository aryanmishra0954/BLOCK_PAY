import React from "react";
import { ShieldCheck } from "lucide-react";

export default function SendSummaryCard({
  walletAddress = "",
  recipient = "",
  polEquivalent = 0,
}) {
  return (
    <div className="space-y-4">
      <div className="card-base p-5 text-xs space-y-3 bg-[#101216] border border-[#20242c]">
        <h3 className="font-display font-semibold text-white flex items-center justify-between">
          <span>Payment Summary</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </h3>
        <div className="space-y-2 font-mono">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
              From Your Wallet
            </p>
            <p className="text-zinc-300 truncate">{walletAddress}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
              Recipient Address
            </p>
            <p className="text-zinc-300 truncate">
              {recipient || "Awaiting address"}
            </p>
          </div>
          <div className="border-t border-[#1f232b] pt-2 flex justify-between font-sans">
            <span className="text-zinc-400">Amount:</span>
            <span className="font-bold text-white font-mono">
              {polEquivalent.toFixed(4)} POL
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-[#20242c] bg-[#0c0d10] text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-zinc-300 font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Fast & Secure</span>
        </div>
        <p className="text-zinc-400 leading-relaxed text-[11px] font-sans">
          Payments on Polygon Amoy confirm in seconds and are permanently recorded in your history.
        </p>
      </div>
    </div>
  );
}
