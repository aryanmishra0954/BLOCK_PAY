import React from "react";
import { Link } from "react-router-dom";

export default function BrandLogo({
  size = "md",
  showWordmark = true,
  showBadge = true,
  badgeText = "Amoy",
  to = "/dashboard",
  className = "",
}) {
  const sizeMap = {
    sm: { icon: "w-7 h-7", text: "text-sm", badge: "text-[9px]" },
    md: { icon: "w-8 h-8", text: "text-base", badge: "text-[10px]" },
    lg: { icon: "w-10 h-10", text: "text-xl", badge: "text-[11px]" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const LogoIcon = (
    <div
      className={`${currentSize.icon} rounded-xl bg-black border border-[#272c38] shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center relative overflow-hidden group-hover:border-[#384152] transition-colors`}
    >
      <img
        src="/blockpay-logo.jpg"
        alt="BlockPay"
        className="w-full h-full object-cover rounded-xl"
      />
    </div>
  );

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      {LogoIcon}
      {showWordmark && (
        <span className={`font-display font-bold tracking-tight text-white flex items-center gap-2 ${currentSize.text}`}>
          BlockPay
          {showBadge && (
            <span
              className={`uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-[#16181f] text-zinc-400 border border-[#242833] ${currentSize.badge}`}
            >
              {badgeText}
            </span>
          )}
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
