import React, { useState } from "react";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function PaymentSimulator() {
  const { isAuthenticated } = useAuth();
  const [instruction, setInstruction] = useState(
    "Send 50 POL to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e for office supplies"
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState(
    JSON.stringify(
      {
        status: "ready_to_send",
        network: "Polygon Amoy",
        payment: {
          recipient: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          amount: 50.0,
          currency: "POL",
          estimated_fee: "0.0021 POL (~$0.0009)",
          balance_check: "passed",
        },
        action: "Transfer prepared for your approval",
      },
      null,
      2
    )
  );
  const [latencyText, setLatencyText] = useState("Status: Ready • 28ms");

  const presetScenarios = [
    {
      label: "Pay Vendor 50 POL",
      prompt: "Send 50 POL to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e for office supplies",
    },
    {
      label: "Check Balance & Safety",
      prompt: "Check my available POL balance and upcoming scheduled payments",
    },
    {
      label: "Find Recent Transfers",
      prompt: "Show my last 5 confirmed transactions on Polygon",
    },
  ];

  const handleSimulate = async () => {
    if (!instruction.trim() || isSimulating) return;
    setIsSimulating(true);
    setLatencyText("Processing request...");
    const start = performance.now();

    try {
      if (!isAuthenticated) {
        setLatencyText("Demo simulation • no account required");
        setSimOutput(JSON.stringify({
          status: "simulation_only",
          message: "Sign in to run authenticated balance and ledger commands.",
          prompt: instruction,
          side_effects: "none",
        }, null, 2));
        return;
      }
      const res = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: instruction }),
      });
      const data = await res.json();
      const ms = Math.round(performance.now() - start);
      setLatencyText(`Completed in ${ms}ms • HTTP ${res.status}`);
      setSimOutput(JSON.stringify(data, null, 2));
    } catch {
      const ms = Math.round(performance.now() - start);
      setLatencyText(`Simulated response • ${ms}ms`);
      setSimOutput(
        JSON.stringify(
          {
            prompt: instruction,
            status: "ready_to_send",
            network: "Polygon Amoy Testnet",
            payment: {
              amount: 50.0,
              currency: "POL",
              estimated_fee: "< 0.001 POL",
              balance_check: "verified",
            },
            next_step: "Confirm transfer with 1 click",
          },
          null,
          2
        )
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <section id="simulator" className="py-20 sm:py-28 border-b border-[#1f232b] bg-[#0c0d10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2 font-medium">Interactive Demo</h2>
          <h3 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Try Sending a Payment with AI
          </h3>
          <p className="font-sans text-zinc-400 mt-2.5 text-sm leading-relaxed">
            Type payments in plain English. BlockPay interprets your request, checks your balance, and prepares the transfer instantly.
          </p>
        </div>

        <div className="max-w-3xl mx-auto card-base p-6 sm:p-7 shadow-lg border border-[#222630]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#1f232b] gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-xs text-zinc-300 font-medium">POLYGON AMOY TESTNET</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
              <span>CHAIN ID: 80002</span>
              <span>•</span>
              <span>LIVE TESTNET</span>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[11px] font-sans font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Try an Example:
            </p>
            <div className="flex flex-wrap gap-2">
              {presetScenarios.map((sc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInstruction(sc.prompt)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition font-medium font-sans ${
                    instruction === sc.prompt
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-[#252934] bg-[#14171d] text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-sans font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Your Command in Plain English
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSimulate()}
                className="input-base flex-1 text-xs font-mono py-2.5 px-3.5"
                placeholder="E.g. Send 50 POL to 0x742d..."
              />
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating || !instruction.trim()}
                className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Command</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="font-sans">Prepared Transaction</span>
              </span>
              <span>{latencyText}</span>
            </div>
            <pre className="p-4 rounded-lg bg-[#07080a] border border-[#1c1f26] font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
              {simOutput}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
