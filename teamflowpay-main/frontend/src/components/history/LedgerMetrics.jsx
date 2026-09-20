import React from "react";

export default function LedgerMetrics({
  totalEntries = 0,
  grossOutflow = 0,
  grossInflow = 0,
  gasConsumed = "0.0000",
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-base p-4 bg-[#101216] border border-[#20242c]">
        <p className="text-xs text-zinc-500 mb-1 font-medium font-sans">Total Payments</p>
        <p className="text-xl font-bold font-mono text-white">{totalEntries}</p>
      </div>
      <div className="card-base p-4 bg-[#101216] border border-[#20242c]">
        <p className="text-xs text-zinc-500 mb-1 font-medium font-sans">Total Sent</p>
        <p className="text-xl font-bold font-mono text-white">
          {grossOutflow.toFixed(2)} POL
        </p>
      </div>
      <div className="card-base p-4 bg-[#101216] border border-[#20242c]">
        <p className="text-xs text-zinc-500 mb-1 font-medium font-sans">Total Received</p>
        <p className="text-xl font-bold font-mono text-white">
          {grossInflow.toFixed(2)} POL
        </p>
      </div>
      <div className="card-base p-4 bg-[#101216] border border-[#20242c]">
        <p className="text-xs text-zinc-500 mb-1 font-medium font-sans">Network Fees</p>
        <p className="text-xl font-bold font-mono text-white">{gasConsumed} POL</p>
      </div>
    </div>
  );
}
