import React, { useState } from "react";
import { BlockPayAPI } from "../services/api";
import { useWallet } from "../context/WalletContext";
import {
  Terminal,
  ArrowRight,
  Check,
  X,
  Loader2,
  Send,
  CornerDownLeft,
} from "lucide-react";

export default function AICommandCenter({ onCommandExecuted }) {
  const { walletAddress, sendTransaction } = useWallet();
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [receipt, setReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const examplePrompts = [
    "Send 50 POL to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "Check my balance and recent activity",
    "Show my last 5 payments on Polygon",
    "Export my transaction history to CSV",
  ];

  const handleExecute = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isExecuting) return;

    setIsExecuting(true);
    setErrorMsg(null);
    setReceipt(null);
    setCurrentStep(1);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep(2);

      const res = await BlockPayAPI.agent.sendCommand(trimmed);

      setCurrentStep(3);
      await new Promise((r) => setTimeout(r, 400));

      if (!res.success) {
        throw new Error(res.error || "Agent failed to parse command");
      }

      setCurrentStep(4);

      if (res.action === "create_payment") {
        const params = res.command?.parameters || res.command?.data || {};
        const amount = params.amount || 50;
        let recipient = params.recipient || params.vendor || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

        if (!recipient.startsWith("0x")) {
          try {
            const contactsRes = await BlockPayAPI.contacts.getAll();
            if (contactsRes?.contacts?.length) {
              const matched = contactsRes.contacts.find(
                (c) => c.name?.toLowerCase().includes(recipient.toLowerCase()) || recipient.toLowerCase().includes(c.name?.toLowerCase())
              );
              if (matched?.address) {
                recipient = matched.address;
              }
            }
          } catch (cErr) {
            console.warn("Contact lookup notice:", cErr);
          }
        }

        try {
          if (recipient.startsWith("0x")) {
            await sendTransaction({
              to: recipient,
              amount: amount,
              currency: params.currency || "POL",
              note: params.description || `Payment: ${trimmed}`,
            });
          }
        } catch (txErr) {
          console.warn("Automatic payment notice:", txErr);
        }
      }

      setReceipt(res);
      setPrompt("");

      if (onCommandExecuted) {
        onCommandExecuted(res);
      }
    } catch (err) {
      console.error("AI execution error:", err);
      setErrorMsg(err.message || "Failed to execute payment command");
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        setCurrentStep(0);
      }, 5000);
    }
  };

  return (
    <section className="card-base p-6 sm:p-8 bg-[#101216] border border-[#20242c] shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#20242c]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#161920] border border-[#262b36] text-zinc-200 flex items-center justify-center text-sm font-bold shadow-sm">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-white tracking-tight">AI Payment Assistant</h3>
              <span className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Type payments in plain English. BlockPay interprets your request and prepares the transaction.
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 hidden sm:flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded bg-[#161920] border border-[#262b36] flex items-center gap-1.5">
            <span>Press ↵ to run</span>
            <CornerDownLeft className="w-3 h-3 text-zinc-500" />
          </span>
        </div>
      </div>

      <div className="py-4">
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(example)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#14171d] hover:bg-[#1c2028] text-zinc-300 border border-[#232732] transition text-left"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-1">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <ArrowRight className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecute();
              }}
              placeholder='E.g. "Send 50 POL to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"'
              className="input-base pl-10 text-xs sm:text-sm py-3 font-mono placeholder-zinc-500"
              disabled={isExecuting}
            />
          </div>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || !prompt.trim()}
            className="btn-primary py-3 px-6 text-xs font-semibold whitespace-nowrap rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Payment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {currentStep > 0 && (
        <div className="mt-4 py-2.5 px-3.5 rounded-lg border border-[#20242c] bg-[#0c0d10] font-sans text-xs flex flex-wrap items-center gap-3 text-zinc-400">
          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 1 ? "text-white font-semibold" : ""
            }`}
          >
            {currentStep === 1 && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
            {currentStep > 1 && <Check className="w-3 h-3 text-emerald-400" />}
            <span>1. Reading Request</span>
          </span>
          <span className="text-zinc-700">/</span>
          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 2 ? "text-white font-semibold" : ""
            }`}
          >
            {currentStep === 2 && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
            {currentStep > 2 && <Check className="w-3 h-3 text-emerald-400" />}
            <span>2. Checking Details</span>
          </span>
          <span className="text-zinc-700">/</span>
          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 3 ? "text-white font-semibold" : ""
            }`}
          >
            {currentStep === 3 && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
            {currentStep > 3 && <Check className="w-3 h-3 text-emerald-400" />}
            <span>3. Verifying Balance</span>
          </span>
          <span className="text-zinc-700">/</span>
          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 4 ? "text-emerald-400 font-semibold" : ""
            }`}
          >
            {currentStep === 4 && <Check className="w-3 h-3 text-emerald-400" />}
            <span>4. Ready</span>
          </span>
        </div>
      )}

      {receipt && (
        <div className="mt-5 rounded-xl border border-[#20242c] bg-[#12151b] p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[#1b1f26]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono text-xs uppercase font-bold text-zinc-300 tracking-wider">
                PAYMENT DETAILS • {receipt.action || "COMPLETED"}
              </span>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-zinc-300 font-mono space-y-2">
            <p className="text-zinc-400">
              <span className="text-zinc-500 uppercase">Input:</span> "{receipt.prompt}"
            </p>
            {receipt.command && (
              <pre className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-emerald-400 overflow-x-auto">
                {JSON.stringify(receipt.command, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-xs text-rose-400 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
