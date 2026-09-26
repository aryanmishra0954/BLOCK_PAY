import React, { useState } from "react";
import { Wallet, Copy, Check, Coins } from "lucide-react";

export default function WalletCard({
  walletAddress = "",
  balance = 0,
  onClaimFaucet,
}) {
  const [copied, setCopied] = useState(false);
  const fallbackAddress = walletAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fallbackAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="card-base p-6 sm:p-7 shadow-sm text-xs space-y-5 bg-[#101216] border border-[#20242c]">
      <div className="flex items-center gap-2 font-semibold text-sm text-white font-display">
        <Wallet className="w-4 h-4 text-zinc-400" />
        <span>Your Wallet</span>
      </div>

      <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] space-y-4">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-sans">
            Active Polygon Address
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-white truncate">
              {fallbackAddress}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-zinc-400 hover:text-white p-1"
              title="Copy Address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-[#1c2028] pt-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
              Available Balance
            </p>
            <p className="font-mono text-sm font-bold text-white mt-0.5">
              {(typeof balance === "number" && !isNaN(balance) ? balance : parseFloat(balance) || 0).toFixed(4)} POL
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
              Network Chain
            </p>
            <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
              Polygon Amoy (80002)
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onClaimFaucet(10000)}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 transition font-sans"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Request test funds</span>
          </button>
        </div>
      </div>
    </div>
  );
}

