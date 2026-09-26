import React from "react";
import {
  Send,
  Zap,
  ShieldCheck,
  Key,
  Globe,
  FileCheck2,
} from "lucide-react";

export default function FeaturesGrid() {
  const capabilities = [
    {
      icon: Send,
      title: "Instant Transfers",
      desc: "Send crypto to any Polygon address in seconds with near-zero network fees. Perfect for payroll, vendor payments, or everyday transfers.",
    },
    {
      icon: Zap,
      title: "Fast Confirmations",
      desc: "Transactions confirm on Polygon in under 3 seconds. No waiting for banking clearance, weekend delays, or cross-border lags.",
    },
    {
      icon: ShieldCheck,
      title: "Balance Protection",
      desc: "BlockPay automatically verifies your available funds before sending, preventing failed transactions and overdraft fees.",
    },
    {
      icon: Key,
      title: "You Own Your Funds",
      desc: "Non-custodial by design. You hold your own wallet keys and control your assets directly. We never hold your funds.",
    },
    {
      icon: Globe,
      title: "Live Currency Rates",
      desc: "Instant conversion between POL, USD, EUR, and INR so you always know the exact fiat value of every payment.",
    },
    {
      icon: FileCheck2,
      title: "Transaction History",
      desc: "Every transfer is recorded in the BlockPay ledger; on-chain links appear only after a verified Polygon receipt.",
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 border-b border-[#1f232b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2 font-medium">
            Features
          </h2>
          <h3 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Everything You Need for Fast Payments
          </h3>
          <p className="font-sans text-zinc-400 mt-3 text-sm leading-relaxed">
            Simple, reliable crypto payments built on Polygon with instant confirmations and low fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="card-base p-6 sm:p-7 border border-[#20242c] bg-[#101216] hover:border-[#2f3542] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#161920] border border-[#262b36] text-white flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-zinc-200" />
                </div>
                <h4 className="font-display text-base font-bold text-white mb-2">
                  {cap.title}
                </h4>
                <p className="font-sans text-xs text-zinc-400 leading-relaxed font-normal">
                  {cap.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


