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
      title: "Testnet Transfers",
      desc: "Send test POL to an EVM address on Polygon Amoy. Verify the destination carefully before approving in your wallet.",
    },
    {
      icon: Zap,
      title: "Fast Confirmations",
      desc: "Confirmation time depends on the network. BlockPay verifies receipts and requires two block confirmations before displaying success.",
    },
    {
      icon: ShieldCheck,
      title: "Balance Protection",
      desc: "BlockPay checks the network balance and estimates gas before requesting wallet approval. Network execution can still fail.",
    },
    {
      icon: Key,
      title: "You Own Your Funds",
      desc: "Non-custodial by design. You hold your own wallet keys and control your assets directly. We never hold your funds.",
    },
    {
      icon: Globe,
      title: "Test Tokens Only",
      desc: "Payments use Amoy test POL, which has no monetary value. This prototype does not exchange fiat currencies.",
    },
    {
      icon: FileCheck2,
      title: "Transaction History",
      desc: "BlockPay records submitted transfers and verifies network status. Import outside transfers by hash; explorer links allow independent checking.",
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
            Wallet-approved test payments with independently checked network status.
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


