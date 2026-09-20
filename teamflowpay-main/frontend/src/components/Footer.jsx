import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "./common/BrandLogo";
import { ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#1f232b] py-8 text-xs text-zinc-500 mt-16 bg-[#0a0b0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showBadge={false} to="/" />
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-500 font-sans">Fast crypto payments on Polygon Amoy</span>
        </div>
        <div className="flex items-center gap-5 font-medium text-zinc-400 font-sans">
          <a
            href="https://amoy.polygonscan.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition"
          >
            <span>Polygonscan</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <Link to="/send" className="hover:text-white transition">
            Send
          </Link>
          <Link to="/receive" className="hover:text-white transition">
            Receive
          </Link>
          <Link to="/history" className="hover:text-white transition">
            History
          </Link>
          <Link to="/profile" className="hover:text-white transition">
            Profile
          </Link>
        </div>
      </div>
    </footer>
  );
}
