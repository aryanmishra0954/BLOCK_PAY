import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Copy, Check, ShieldCheck, Globe } from "lucide-react";

export default function TxSuccessModal({
  successData,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  if (!successData) return null;

  const isOnChain = Boolean(successData.isOnChain);

  const handleCopyHash = () => {
    if (successData.hash) {
      navigator.clipboard.writeText(successData.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#101216] border border-[#20242c] rounded-2xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Top Glow */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isOnChain ? "from-purple-500 via-emerald-500 to-purple-500" : "from-emerald-500 to-emerald-400"
          }`}
        />

        <div
          className={`w-14 h-14 rounded-2xl ${
            isOnChain
              ? "bg-purple-500/15 border border-purple-500/30 text-purple-400"
              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
          } flex items-center justify-center mx-auto mb-4`}
        >
          {isOnChain ? <Globe className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
        </div>

        <h3 className="font-display text-xl font-bold text-white mb-1">
          {isOnChain ? "On-Chain Payment Broadcasted!" : "Payment Sent!"}
        </h3>

        <div className="flex items-center justify-center gap-2 mb-5">
          {isOnChain ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Verified On-Chain • Polygon Amoy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Instant Ledger Confirmed
            </span>
          )}
        </div>

        {/* Details Box */}
        <div className="bg-[#0c0d10] rounded-xl p-4 mb-6 border border-[#20242c] text-xs font-mono space-y-2.5 text-left">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-sans">Amount Sent:</span>
            <span className="font-bold text-white text-sm">
              {successData.amount} {successData.currency || "POL"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-sans">Recipient:</span>
            <span className="text-zinc-300 truncate max-w-[180px]">
              {successData.to}
            </span>
          </div>

          <div className="border-t border-[#1c2028] pt-2.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-500 font-sans">Transaction Hash:</span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-zinc-300 break-all text-[11px] font-mono bg-zinc-950 p-2 rounded border border-zinc-800/80">
              {successData.hash}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 font-sans">
          <a
            href={`https://amoy.polygonscan.com/tx/${successData.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-tight transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
          >
            <span>View on Polygonscan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-primary flex-1 py-2 rounded-xl text-xs font-semibold"
            >
              Send Another
            </button>
            <Link
              to="/history"
              onClick={onClose}
              className="btn-secondary flex-1 py-2 rounded-xl text-xs font-medium"
            >
              View History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
