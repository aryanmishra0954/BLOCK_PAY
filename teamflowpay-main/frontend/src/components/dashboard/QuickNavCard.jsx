import React from "react";
import { Link } from "react-router-dom";

export default function QuickNavCard() {
  const links = [
    { name: "Send Money", to: "/send" },
    { name: "Receive", to: "/receive" },
    { name: "History", to: "/history" },
    { name: "Settings", to: "/profile" },
  ];

  return (
    <div className="card-base p-6 text-xs bg-[#101216] border border-[#20242c]">
      <h4 className="font-display font-semibold text-sm text-white mb-3">Quick Navigation</h4>
      <div className="grid grid-cols-2 gap-2 font-sans">
        {links.map((item, idx) => (
          <Link
            key={idx}
            to={item.to}
            className="p-2.5 rounded-lg border border-[#20242c] bg-[#14171d] hover:bg-[#1c2028] transition font-medium text-center block text-zinc-300 hover:text-white"
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
