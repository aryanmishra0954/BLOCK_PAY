import React from "react";
import { ArrowRight } from "lucide-react";

export default function HeroSection({ onGetStarted, isAuthenticated }) {
  return (
    <section className="pt-20 pb-20 sm:pt-28 sm:pb-28 border-b border-[#1f232b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#13161c] border border-[#232731] text-[11px] font-mono text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="uppercase tracking-wider">Polygon Amoy • Testnet Payments</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-white">
            Send and Receive Payments on a Blockchain Testnet.
          </h1>

          <p className="font-sans text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto mb-10">
            Connect your wallet, prepare payments, and verify transfers on Polygon Amoy. Test tokens only; no real money.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto btn-primary px-7 py-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{isAuthenticated ? "Open Dashboard" : "Get Started"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="#simulator"
              className="w-full sm:w-auto btn-secondary px-6 py-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
            >
              <span>Try Interactive Demo</span>
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-[#1f232b] text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">Amoy</p>
              <p className="text-xs text-zinc-400 font-sans mt-1">Test Network</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">Variable</p>
              <p className="text-xs text-zinc-400 font-sans mt-1">Wallet Network Fee</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">Wallet</p>
              <p className="text-xs text-zinc-400 font-sans mt-1">You Approve Payments</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">History</p>
              <p className="text-xs text-zinc-400 font-sans mt-1">Verified Network Receipts</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

