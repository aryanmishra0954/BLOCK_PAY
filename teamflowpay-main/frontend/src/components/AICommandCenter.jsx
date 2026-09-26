import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  Download,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
  Coins,
  Clock,
  ChevronRight,
} from "lucide-react";

export default function AICommandCenter({ onCommandExecuted }) {
  const { walletAddress, sendTransaction } = useWallet();
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [receipt, setReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

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
        res.pendingConfirmation = true;
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

  const handleConfirmPayment = async () => {
    if (!receipt?.command || isConfirmingPayment) return;
    const params = receipt.command.parameters || receipt.command.data || {};
    setIsConfirmingPayment(true);
    setErrorMsg(null);
    try {
      const txResult = await sendTransaction({
        to: params.recipient,
        amount: params.amount,
        currency: params.currency || "POL",
        note: params.description || `Payment: ${receipt.prompt || "AI payment"}`,
      });
      setReceipt((current) => ({ ...current, executedTx: txResult, pendingConfirmation: false }));
      if (onCommandExecuted) onCommandExecuted(txResult);
    } catch (err) {
      setErrorMsg(err.message || "Payment was rejected by the ledger.");
    } finally {
      setIsConfirmingPayment(false);
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
                <span>Review Command</span>
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
          <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[#1b1f26]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono text-xs uppercase font-bold text-zinc-300 tracking-wider">
                AI COMMAND DISPATCH • {receipt.action?.replace("_", " ")?.toUpperCase() || "COMPLETED"}
              </span>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {receipt.action === "export_report" && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-bold font-display">
                      Financial Ledger Report Generated
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {receipt.data?.records || 0} transactions • {receipt.data?.format?.toUpperCase() || "CSV"} export
                    </p>
                  </div>
                </div>

                <a
                  href={receipt.data?.download_url || "#"}
                  download
                  className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV Report</span>
                </a>
              </div>
            </div>
          )}

          {receipt.action === "create_payment" && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Payment Status</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {receipt.executedTx ? "✓ Ledger Confirmed" : "Awaiting your confirmation"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-[#1a1e27]">
                  <span className="text-xs text-zinc-400">Amount Sent:</span>
                  <span className="font-mono text-base font-bold text-white">
                    {receipt.command?.parameters?.amount || receipt.data?.amount} {receipt.command?.parameters?.currency || "POL"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#1a1e27] text-xs">
                  <span className="text-zinc-400">Recipient:</span>
                  <span className="font-mono text-zinc-200">
                    {receipt.command?.parameters?.vendor || receipt.data?.vendor}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#1a1e27] text-xs">
                  <span className="text-zinc-400">Destination Address:</span>
                  <span className="font-mono text-[11px] text-emerald-400 truncate max-w-[220px]">
                    {receipt.data?.recipient}
                  </span>
                </div>
                {receipt.executedTx?.hash && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#1a1e27] text-xs">
                    <span className="text-zinc-400">Tx Hash:</span>
                    <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                      {receipt.executedTx.hash}
                    </span>
                  </div>
                )}
                {!receipt.executedTx && (
                  <div className="pt-3 border-t border-[#1a1e27] flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setReceipt(null)} className="btn-secondary py-2 px-3 rounded-lg text-xs">
                      Cancel
                    </button>
                    <button type="button" onClick={handleConfirmPayment} disabled={isConfirmingPayment} className="btn-primary py-2 px-3 rounded-lg text-xs disabled:opacity-50">
                      {isConfirmingPayment ? "Checking balance..." : "Confirm & Send"}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Link
                  to="/history"
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  <span>View in Transaction History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {receipt.action === "check_balance_reminders" && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-white font-medium">
                    {receipt.data?.message}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1a1e27]">
                  <div>
                    <p className="text-[10px] uppercase font-mono text-zinc-500">Available Balance</p>
                    <p className="font-mono text-sm font-bold text-white mt-0.5">
                      {(receipt.data?.current_balance || 0).toLocaleString()} POL
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono text-zinc-500">Scheduled Outflows</p>
                    <p className="font-mono text-sm font-bold text-zinc-300 mt-0.5">
                      {receipt.data?.total_pending_payments || 0} Invoices ({receipt.data?.total_pending_amount || 0} POL)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {receipt.action === "add_client" && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-bold font-display">
                      {receipt.data?.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-xs">
                      {receipt.data?.address}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/send?to=${receipt.data?.address}&name=${encodeURIComponent(receipt.data?.name || "")}`}
                  className="btn-primary py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Money</span>
                </Link>
              </div>
            </div>
          )}

          {receipt.action === "show_pending_payments" && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-xl bg-[#0c0d10] border border-[#20242c] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Total Pending Obligations</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {receipt.data?.total_amount || 0} POL ({receipt.data?.count || 0} Items)
                  </span>
                </div>
                {Array.isArray(receipt.data?.payments) && receipt.data.payments.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-[#1a1e27]">
                    {receipt.data.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div>
                          <p className="font-semibold text-white">{p.vendor}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{p.due_date ? `Due: ${p.due_date}` : "Pending"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white">{p.amount} {p.currency || "POL"}</span>
                          <Link
                            to={`/send?to=${p.recipient || ""}&amount=${p.amount}&currency=${p.currency || "POL"}&name=${encodeURIComponent(p.vendor)}`}
                            className="btn-secondary py-1 px-2.5 rounded-lg text-[11px]"
                          >
                            Pay
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 pt-2 border-t border-[#1a1e27]">No overdue or pending invoices.</p>
                )}
              </div>
            </div>
          )}

          {!["export_report", "create_payment", "check_balance_reminders", "add_client", "show_pending_payments"].includes(receipt.action) && (
            <div className="p-3.5 bg-[#0c0d10] rounded-xl border border-[#20242c] text-xs text-emerald-400 font-mono">
              <p className="text-zinc-300">{receipt.data?.message || "Command executed successfully"}</p>
            </div>
          )}
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
