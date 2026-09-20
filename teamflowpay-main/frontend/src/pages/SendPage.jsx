import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { ArrowLeft } from "lucide-react";

import SendForm from "../components/send/SendForm";
import SendSummaryCard from "../components/send/SendSummaryCard";
import TxSuccessModal from "../components/send/TxSuccessModal";

export default function SendPage() {
  const {
    balance,
    walletAddress,
    claimTestFunds,
    sendTransaction,
    sendOnChainTransaction,
  } = useWallet();
  const [successData, setSuccessData] = useState(null);
  const [activeRecipient, setActiveRecipient] = useState("");
  const [activePolEquivalent, setActivePolEquivalent] = useState(0);

  const handleSendTransaction = async (txData) => {
    let txResult;
    if (txData.mode === "on_chain") {
      txResult = await sendOnChainTransaction(txData);
    } else {
      // Add small synthetic confirmation wait
      await new Promise((r) => setTimeout(r, 600));
      txResult = await sendTransaction(txData);
    }
    setSuccessData(txResult);
    return txResult;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="w-9 h-9 rounded-xl border border-[#20242c] bg-[#101216] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#161920] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white">
            Send Payment
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Fast, secure transfer on Polygon Amoy testnet
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form (2 Cols) */}
        <div className="lg:col-span-2">
          <SendForm
            balance={balance}
            onSubmitTransaction={handleSendTransaction}
            onClaimFaucet={claimTestFunds}
            onRecipientChange={setActiveRecipient}
            onPolEquivalentChange={setActivePolEquivalent}
          />
        </div>

        {/* Sidebar Info (1 Col) */}
        <div>
          <SendSummaryCard
            walletAddress={walletAddress}
            recipient={activeRecipient}
            polEquivalent={activePolEquivalent}
          />
        </div>
      </div>

      {/* Success Modal */}
      <TxSuccessModal
        successData={successData}
        onClose={() => setSuccessData(null)}
      />
    </div>
  );
}
