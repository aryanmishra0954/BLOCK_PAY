import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { ArrowLeft } from "lucide-react";

import IdentityCard from "../components/profile/IdentityCard";
import WalletCard from "../components/profile/WalletCard";
import SessionCard from "../components/profile/SessionCard";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { balance, walletAddress, claimTestFunds } = useWallet();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="w-9 h-9 rounded-xl border border-[#20242c] bg-[#101216] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#161920] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white">
            Account & Wallet Settings
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Manage your account details and linked Polygon wallet
          </p>
        </div>
      </div>

      <IdentityCard user={user} />
      <WalletCard
        walletAddress={walletAddress}
        balance={balance}
        onClaimFaucet={claimTestFunds}
      />
      <SessionCard onLogout={handleLogout} />
    </div>
  );
}
