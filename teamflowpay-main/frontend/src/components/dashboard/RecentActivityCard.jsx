import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Send,
} from "lucide-react";

export default function RecentActivityCard({
  transactions = [],
  isLoading = false,
}) {
  return (
    <div className="card-base p-6 bg-[#101216] border border-[#20242c]">
      <div className="flex items-center justify-between pb-4 border-b border-[#1b1f26] mb-4">
        <div>
          <h3 className="font-display text-base font-bold text-white tracking-tight">Recent Activity</h3>
          <p className="text-xs text-zinc-400 font-sans">Recent payments on Polygon Amoy</p>
        </div>
        <Link
          to="/history"
          className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-xs text-zinc-500">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
          <span>Loading recent transactions...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-10 h-10 rounded-full bg-[#161920] border border-[#262b36] text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Send className="w-4 h-4" />
          </div>
          <p className="text-xs text-zinc-400 font-medium">No activity recorded yet</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
            Transactions and faucet claims will show up here in real-time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1b1f26]">
          {transactions.slice(0, 5).map((tx, idx) => {
            const isSent = tx.type === "sent";
            const addr = tx.counterparty_address || tx.address || "0x...";
            const short =
              addr.length > 14
                ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
                : addr;
            const hash = tx.tx_hash || tx.hash;

            return (
              <div
                key={tx.id || idx}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#14171d]/60 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSent
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isSent ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white capitalize font-sans">
                      {tx.type || "Transfer"}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-500">{short}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-white">
                    {isSent ? "-" : "+"}
                    {parseFloat(tx.amount || 0).toFixed(2)}{" "}
                    {tx.currency || "POL"}
                  </p>
                  {hash && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-0.5"
                    >
                      <span>Polygonscan</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
