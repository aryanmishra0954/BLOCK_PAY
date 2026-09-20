import React from "react";
import { TrendingUp, Clock, Fuel, ShieldCheck } from "lucide-react";

export default function MetricsRow({
  outflowCount = 0,
  totalOutflowAmount = 0,
  pendingCount = 0,
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-base p-4 sm:p-5 bg-[#101216] border border-[#20242c]">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium font-sans">
          <span>30-Day Outflow</span>
          <TrendingUp className="w-4 h-4 text-zinc-500" />
        </div>
        <p className="text-xl font-bold font-mono text-white">
          {outflowCount} Txn{outflowCount === 1 ? "" : "s"}
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono font-medium">
          {totalOutflowAmount > 0
            ? `${totalOutflowAmount.toFixed(2)} POL Outflow`
            : "No recent outflows"}
        </p>
      </div>

      <div className="card-base p-4 sm:p-5 bg-[#101216] border border-[#20242c]">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium font-sans">
          <span>Pending Invoices</span>
          <Clock className="w-4 h-4 text-zinc-500" />
        </div>
        <p className="text-xl font-bold font-mono text-white">
          {pendingCount} Due
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-sans font-medium">
          {pendingCount > 0 ? "Pending processing" : "All payments clear"}
        </p>
      </div>

      <div className="card-base p-4 sm:p-5 bg-[#101216] border border-[#20242c]">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium font-sans">
          <span>Polygon Gas Fee</span>
          <Fuel className="w-4 h-4 text-zinc-500" />
        </div>
        <p className="text-xl font-bold font-mono text-white">&lt; 25 Gwei</p>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-sans font-medium">Fast & Affordable</p>
      </div>

      <div className="card-base p-4 sm:p-5 bg-[#101216] border border-[#20242c]">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-medium font-sans">
          <span>AI Assistant</span>
          <ShieldCheck className="w-4 h-4 text-zinc-500" />
        </div>
        <p className="text-xl font-bold text-emerald-400 font-mono">Ready</p>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-sans font-medium">Online & Active</p>
      </div>
    </div>
  );
}
