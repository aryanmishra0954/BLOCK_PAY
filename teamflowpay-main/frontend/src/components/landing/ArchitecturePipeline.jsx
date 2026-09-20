import React from "react";
import { Terminal, Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function ArchitecturePipeline({ onGetStarted, isAuthenticated }) {
  const steps = [
    {
      num: "01",
      icon: Terminal,
      title: "Type What You Need",
      desc: "Enter who you want to pay and how much in plain English, or use standard address forms.",
    },
    {
      num: "02",
      icon: Sparkles,
      title: "AI Formats Details",
      desc: "The assistant identifies the recipient, currency conversion rates, and the tiny network fee.",
    },
    {
      num: "03",
      icon: ShieldCheck,
      title: "Balance Check",
      desc: "BlockPay ensures you have sufficient funds before broadcasting to prevent failed transfers.",
    },
    {
      num: "04",
      icon: CheckCircle2,
      title: "Instant Confirmation",
      desc: "Your payment confirms on Polygon Amoy in seconds and is recorded in your history.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-b border-[#1f232b] bg-[#0c0d10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2 font-medium">
            How It Works
          </h2>
          <h3 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Four Simple Steps to Pay Anyone
          </h3>
          <p className="font-sans text-zinc-400 mt-3 text-sm leading-relaxed">
            From natural language instruction to on-chain confirmation in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className="card-base p-6 border border-[#20242c] bg-[#101216] relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    STEP {st.num}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#161920] border border-[#262b36] flex items-center justify-center text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="font-display text-base font-bold text-white mb-2">
                  {st.title}
                </h4>
                <p className="font-sans text-xs text-zinc-400 leading-relaxed font-normal">
                  {st.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="mt-16 p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-[#12151b] via-[#151921] to-[#12151b] border border-[#242935] text-center max-w-4xl mx-auto">
          <h4 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to start sending payments?
          </h4>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto mb-6">
            Get started with 10,000 free Test POL tokens. Test payments, generate invoices, and track transactions with zero real money risk.
          </p>
          <button
            onClick={onGetStarted}
            className="btn-primary px-7 py-3 rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-md"
          >
            <span>{isAuthenticated ? "Open Dashboard" : "Create Free Account"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
