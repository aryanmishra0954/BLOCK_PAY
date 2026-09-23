import React, { useState, useRef, useEffect } from "react";
import { usePrices } from "../../context/PriceContext";
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown, Activity } from "lucide-react";

export default function PriceTicker() {
  const {
    polPriceUSD,
    polPriceINR,
    polPriceEUR,
    pol24hChange,
    prices,
    isRefreshing,
    refreshPrices,
  } = usePrices();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isPositive = (pol24hChange || 0) >= 0;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 transition text-xs group"
        title="Click to view live FX rates"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-mono font-semibold text-zinc-200">POL</span>
          <span className="font-mono text-zinc-300">
            ${polPriceUSD ? polPriceUSD.toFixed(3) : "0.580"}
          </span>
        </div>

        <div
          className={`flex items-center gap-0.5 font-mono text-[10px] font-medium px-1.5 py-0.2 rounded ${
            isPositive
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-rose-400 bg-rose-500/10"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          <span>{Math.abs(pol24hChange || 0).toFixed(1)}%</span>
        </div>

        <ChevronDown
          className={`w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-200">Live Crypto & FX</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refreshPrices();
              }}
              disabled={isRefreshing}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              title="Refresh live prices"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRefreshing ? "animate-spin text-purple-400" : ""}`}
              />
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">
              Polygon (POL)
            </div>
            <div className="flex items-center justify-between font-mono bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/80">
              <span className="text-zinc-400">USD</span>
              <span className="text-zinc-100 font-medium">${polPriceUSD.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between font-mono bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/80">
              <span className="text-zinc-400">INR</span>
              <span className="text-zinc-100 font-medium">₹{polPriceINR.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-mono bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/80">
              <span className="text-zinc-400">EUR</span>
              <span className="text-zinc-100 font-medium">€{polPriceEUR.toFixed(4)}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-1.5 text-xs">
            <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">
              Crypto Benchmarks
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-zinc-400">ETH / USD</span>
              <span className="text-zinc-200 font-medium">
                ${prices.ethereum?.usd?.toLocaleString() || "3,450"}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-zinc-400">BTC / USD</span>
              <span className="text-zinc-200 font-medium">
                ${prices.bitcoin?.usd?.toLocaleString() || "96,200"}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500 text-center">
            Updated via CoinGecko Live Feed
          </div>
        </div>
      )}
    </div>
  );
}
