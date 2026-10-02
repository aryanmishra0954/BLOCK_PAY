import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { ArrowLeft } from "lucide-react";

import QrDisplayCard from "../components/receive/QrDisplayCard";
import PaymentRequestBuilder from "../components/receive/PaymentRequestBuilder";

export default function ReceivePage() {
  const { walletAddress, connectWallet, isConnecting } = useWallet();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="w-9 h-9 rounded-xl border border-[#20242c] bg-[#101216] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#161920] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white">
            Receive Payments
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Share your wallet address or create a payment link
          </p>
        </div>
      </div>

      {!walletAddress ? (
        <div className="card-base p-8 text-center bg-[#101216] border border-[#20242c] space-y-4">
          <p className="text-sm text-zinc-300 font-sans">Connect and verify your wallet to receive Polygon Amoy test POL.</p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold"
          >
            {isConnecting ? "Connecting..." : "Connect Web3 Wallet"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QrDisplayCard walletAddress={walletAddress} />
          <PaymentRequestBuilder walletAddress={walletAddress} />
        </div>
      )}
    </div>
  );
}
