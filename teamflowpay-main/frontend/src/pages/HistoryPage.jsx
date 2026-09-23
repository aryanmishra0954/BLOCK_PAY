import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BlockPayAPI } from "../services/api";
import { ArrowLeft, RefreshCw, FileSpreadsheet } from "lucide-react";

import LedgerMetrics from "../components/history/LedgerMetrics";
import LedgerFilters from "../components/history/LedgerFilters";
import LedgerTable from "../components/history/LedgerTable";

export default function HistoryPage() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadLedger = async () => {
    try {
      setIsLoading(true);
      const res = await BlockPayAPI.transactions.getAll(150);
      if (res && res.transactions) {
        setAllTransactions(res.transactions);
      }
    } catch (err) {
      console.warn("Ledger loading notice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLedger();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleResetFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setTimeFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const filtered = allTransactions.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;

    if (timeFilter !== "all") {
      const txTime = new Date(tx.created_at || tx.date || Date.now()).getTime();
      const now = Date.now();
      const diffDays = (now - txTime) / (1000 * 60 * 60 * 24);
      if (timeFilter === "today" && diffDays > 1) return false;
      if (timeFilter === "week" && diffDays > 7) return false;
      if (timeFilter === "month" && diffDays > 30) return false;
      if (timeFilter === "year" && diffDays > 365) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const addr = (tx.counterparty_address || tx.address || "").toLowerCase();
      const hash = (tx.tx_hash || tx.hash || "").toLowerCase();
      if (!addr.includes(q) && !hash.includes(q)) return false;
    }

    return true;
  });

  const totalEntries = allTransactions.length;
  const grossOutflow = allTransactions
    .filter((t) => t.type === "sent")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const grossInflow = allTransactions
    .filter((t) => t.type === "received")
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const gasConsumed = (
    allTransactions.filter((t) => t.type === "sent").length * 0.0021
  ).toFixed(4);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageTransactions = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    let csv = "Date,Type,Counterparty,Amount,Currency,Status,TxHash\n";
    filtered.forEach((tx) => {
      const dateStr = new Date(tx.created_at || tx.date || Date.now()).toLocaleString();
      const addr = tx.counterparty_address || tx.address || "";
      const hash = tx.tx_hash || tx.hash || "";
      csv += `"${dateStr}","${tx.type}","${addr}","${tx.amount}","${tx.currency || "POL"}","${tx.status}","${hash}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BlockPay-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-9 h-9 rounded-xl border border-[#20242c] bg-[#101216] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#161920] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">
              Transaction History
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Complete record of payments sent and received on Polygon Amoy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-sans">
          <button
            onClick={handleExportCSV}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh History</span>
          </button>
        </div>
      </div>

      <LedgerMetrics
        totalEntries={totalEntries}
        grossOutflow={grossOutflow}
        grossInflow={grossInflow}
        gasConsumed={gasConsumed}
      />

      <LedgerFilters
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onReset={handleResetFilters}
      />

      <LedgerTable
        transactions={pageTransactions}
        filteredCount={filtered.length}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
