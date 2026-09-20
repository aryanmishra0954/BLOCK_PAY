import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { BlockPayAPI } from "../services/api";

import BalanceCard from "../components/dashboard/BalanceCard";
import MetricsRow from "../components/dashboard/MetricsRow";
import AICommandCenter from "../components/AICommandCenter";
import RecentActivityCard from "../components/dashboard/RecentActivityCard";
import LiquiditySafeguardCard from "../components/dashboard/LiquiditySafeguardCard";
import QuickNavCard from "../components/dashboard/QuickNavCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const { balance, walletAddress, refreshBalance, claimTestFunds } = useWallet();

  const [transactions, setTransactions] = useState([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadTransactions = async () => {
    try {
      setIsLoadingTx(true);
      const res = await BlockPayAPI.transactions.getAll(10);
      if (res && res.transactions) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.warn("Ledger transaction loading notice:", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [balance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    await loadTransactions();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClaimFaucet = async () => {
    try {
      const added = await claimTestFunds(10000);
      const amountClaimed = added?.amount || 10000;
      setToastMessage(`+${Number(amountClaimed).toLocaleString()} Test POL credited to your wallet!`);
      await loadTransactions();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Derived metrics
  const outflowTxs = transactions.filter((t) => t.type === "sent");
  const pendingTxs = transactions.filter((t) => t.status === "pending");
  const totalOutflowAmount = outflowTxs.reduce(
    (sum, t) => sum + (parseFloat(t.amount) || 0),
    0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-[#101216]/95 backdrop-blur-md text-emerald-300 font-mono text-xs shadow-2xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Balance Hero Card */}
      <BalanceCard
        user={user}
        walletAddress={walletAddress}
        balance={balance}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onClaimFaucet={handleClaimFaucet}
      />

      {/* Metrics Row */}
      <MetricsRow
        outflowCount={outflowTxs.length}
        totalOutflowAmount={totalOutflowAmount}
        pendingCount={pendingTxs.length}
      />

      {/* AI Command Center Section */}
      <div id="ai-command">
        <AICommandCenter onCommandExecuted={() => loadTransactions()} />
      </div>

      {/* Split View: Recent Activity + Liquidity Safeguard */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity Table (2 Cols) */}
        <div className="lg:col-span-2">
          <RecentActivityCard
            transactions={transactions}
            isLoading={isLoadingTx}
          />
        </div>

        {/* Sidebar: Liquidity Safeguard & Quick Navigation (1 Col) */}
        <div className="space-y-6">
          <LiquiditySafeguardCard pendingTransactions={pendingTxs} />
          <QuickNavCard />
        </div>
      </div>
    </div>
  );
}
