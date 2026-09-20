import React from "react";
import { ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw, Send } from "lucide-react";

export default function LedgerTable({
  transactions = [],
  filteredCount = 0,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Just now";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Confirmed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-500/20 bg-amber-500/10 text-amber-400 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-[#262b36] bg-[#161920] text-zinc-300 font-sans">
            Confirmed
          </span>
        );
    }
  };

  return (
    <div className="card-base overflow-hidden bg-[#101216] border border-[#20242c]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0c0d10] text-zinc-400 uppercase text-[10px] font-semibold tracking-wider border-b border-[#1b1f26] font-sans">
            <tr>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Recipient / Sender</th>
              <th className="px-5 py-3.5">Amount</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Timestamp</th>
              <th className="px-5 py-3.5 text-right">Polygonscan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b1f26]">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-zinc-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  <span>Loading transactions...</span>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-zinc-500">
                  <div className="w-10 h-10 rounded-full bg-[#161920] border border-[#262b36] text-zinc-400 flex items-center justify-center mx-auto mb-2">
                    <Send className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-zinc-400 font-medium font-sans">
                    No transactions match your criteria
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => {
                const isSent = tx.type === "sent";
                const addr = tx.counterparty_address || tx.address || "0x...";
                const short =
                  addr.length > 14
                    ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
                    : addr;
                const hash = tx.tx_hash || tx.hash;

                return (
                  <tr key={tx.id || idx} className="hover:bg-[#14171d]/60 transition">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSent
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isSent ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="font-semibold text-white capitalize font-sans">
                          {tx.type}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-mono text-zinc-300">
                      <span title={addr}>{short}</span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-white">
                      {isSent ? "-" : "+"}
                      {parseFloat(tx.amount || 0).toFixed(4)}{" "}
                      <span className="text-zinc-400 font-normal">
                        {tx.currency || "POL"}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {renderStatusBadge(tx.status)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                      {formatDateTime(tx.created_at || tx.date)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right font-mono">
                      {hash ? (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>
                            {hash.slice(0, 6)}...{hash.slice(-4)}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">Internal DB</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 bg-[#0c0d10] border-t border-[#1b1f26] flex items-center justify-between text-xs text-zinc-400 font-sans">
          <span>
            Page <span className="text-white font-mono">{currentPage}</span> of{" "}
            <span className="text-white font-mono">{totalPages}</span> ({filteredCount} records)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-[#14171d] border border-[#242833] text-zinc-300 hover:text-white disabled:opacity-40 transition"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-[#14171d] border border-[#242833] text-zinc-300 hover:text-white disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
