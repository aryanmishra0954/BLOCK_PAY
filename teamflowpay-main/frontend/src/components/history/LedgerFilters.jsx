import React from "react";
import { Search, RotateCcw } from "lucide-react";

export default function LedgerFilters({
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  timeFilter,
  setTimeFilter,
  searchQuery,
  setSearchQuery,
  onReset,
}) {
  return (
    <div className="card-base p-5 text-xs space-y-3 bg-[#101216] border border-[#20242c]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 font-sans">
            Payment Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#14171d] border border-[#242833] rounded-lg text-white font-medium focus:outline-none font-sans"
          >
            <option value="all">All Payments</option>
            <option value="sent">Sent Payments</option>
            <option value="received">Received Payments</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 font-sans">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#14171d] border border-[#242833] rounded-lg text-white font-medium focus:outline-none font-sans"
          >
            <option value="all">All Statuses</option>
            <option value="success">Confirmed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 font-sans">
            Time Period
          </label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#14171d] border border-[#242833] rounded-lg text-white font-medium focus:outline-none font-sans"
          >
            <option value="all">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="year">Past 365 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 font-sans">
            Search
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address or hash..."
              className="w-full pl-8 pr-3 py-2 bg-[#14171d] border border-[#242833] rounded-lg text-white text-xs font-mono placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onReset}
          className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
}
