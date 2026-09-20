import React from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Coins, Send, QrCode, Terminal, TrendingUp, TrendingDown } from "lucide-react";
import { usePrices } from "../../context/PriceContext";

export default function BalanceCard({
  user,
  walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  balance = 10000,
  isRefreshing = false,
  onRefresh,
  onClaimFaucet,
}) {
  const { convertPolToFiat, polPriceUSD, pol24hChange } = usePrices();
  const numBalance = typeof balance === "number" && !isNaN(balance) ? balance : parseFloat(balance) || 0;

  const usdValue = convertPolToFiat(numBalance, "USD").toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const inrValue = convertPolToFiat(numBalance, "INR").toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="relative rounded-2xl border border-[#20242c] bg-[#101216] p-6 sm:p-8 shadow-sm overflow-hidden">
      {/* Top Identity & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1b1f26]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#161920] border border-[#262b36] flex items-center justify-center text-zinc-300 font-mono text-xs font-semibold">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold text-white tracking-tight">
                Welcome back, {user?.full_name?.split(" ")[0] || "Trader"}
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-xs sm:max-w-md">
              {walletAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-[#242833] bg-[#14171d] hover:bg-[#1c2028] text-zinc-400 hover:text-white transition"
            title="Refresh Balance"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onClaimFaucet}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-400 transition flex items-center gap-1.5"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>+10,000 Test POL</span>
          </button>
        </div>
      </div>

      {/* Balance Figures Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-6">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1 font-sans">
            Total Available Balance
          </p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-white">
              {numBalance.toLocaleString(undefined, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}
            </h2>
            <span className="text-xl font-semibold text-zinc-400 font-mono">POL</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#16181f] text-zinc-400 border border-[#242833] font-mono">
              Polygon Amoy
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <p className="text-xs text-zinc-300 font-mono">
              ≈ ${usdValue} USD • ₹{inrValue} INR
            </p>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-purple-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              1 POL = ${polPriceUSD ? polPriceUSD.toFixed(3) : "0.580"}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/send"
            className="btn-primary px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Money</span>
          </Link>
          <Link
            to="/receive"
            className="btn-secondary px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2"
          >
            <QrCode className="w-3.5 h-3.5 text-zinc-400" />
            <span>Receive QR</span>
          </Link>
          <a
            href="#ai-command"
            className="btn-secondary px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Command</span>
          </a>
        </div>
      </div>
    </div>
  );
}
