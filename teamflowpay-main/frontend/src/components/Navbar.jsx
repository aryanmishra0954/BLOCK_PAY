import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import BrandLogo from "./common/BrandLogo";
import {
  Layers,
  Send,
  QrCode,
  FileText,
  Users,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import PriceTicker from "./common/PriceTicker";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { walletAddress } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: Layers },
    { name: "Send", path: "/send", icon: Send },
    { name: "Receive", path: "/receive", icon: QrCode },
    { name: "History", path: "/history", icon: FileText },
    { name: "Contacts", path: "/contacts", icon: Users },
  ];

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "0x742d...5f0bEb";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <BrandLogo size="md" to="/dashboard" />

            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? "bg-zinc-800/80 text-white border border-zinc-700"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <PriceTicker />

            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[11px] text-zinc-300">Polygon Amoy</span>
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-mono font-semibold overflow-hidden flex-shrink-0">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : user?.auth_provider === "web3" ? (
                      <span className="text-[11px]">🦊</span>
                    ) : (
                      user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"
                    )}
                  </div>
                  <span className="font-mono text-xs text-zinc-300 hidden sm:inline">
                    {shortAddress}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl py-1 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-zinc-800">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="font-semibold text-white truncate">
                          {user?.full_name || "Authenticated User"}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {user?.auth_provider || "Email"}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-zinc-400 truncate">
                        {user?.email || shortAddress}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Profile & Wallet</span>
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Transaction History</span>
                    </Link>

                    <div className="border-t border-zinc-800 my-1"></div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-950/20 transition text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/"
                className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <div className="md:hidden flex items-center justify-around border-t border-zinc-850 py-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                    isActive ? "text-emerald-400" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
