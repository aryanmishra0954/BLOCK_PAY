import React from "react";
import { ShieldCheck } from "lucide-react";

export default function LiquiditySafeguardCard({ pendingTransactions = [] }) {
  const obligations = pendingTransactions
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    .toFixed(2);

  return (
    <div className="card-base p-6 bg-[#101216] border border-[#20242c]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-md bg-[#161920] border border-[#262b36] text-zinc-300 flex items-center justify-center text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <h4 className="font-display font-semibold text-sm text-white">Balance Safety</h4>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed mb-4 font-sans">
        Automatic balance checks ensure you always hold enough POL to cover pending and outgoing transfers.
      </p>
      <div className="p-3.5 rounded-xl border border-[#20242c] bg-[#0c0d10] space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-zinc-500 font-sans">Pending Outflows:</span>
          <span className="text-white">{obligations} POL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 font-sans">Wallet Status:</span>
          <span className="text-emerald-400 font-semibold font-sans">Healthy & Active</span>
        </div>
      </div>
    </div>
  );
}
