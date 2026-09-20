import React, { useState } from "react";
import { Copy, Check, Share2, ExternalLink, MessageCircle, Send as TelegramIcon } from "lucide-react";

export default function PaymentRequestBuilder({ walletAddress }) {
  const [requestAmount, setRequestAmount] = useState("");
  const [requestCurrency, setRequestCurrency] = useState("POL");
  const [linkCopied, setLinkCopied] = useState(false);

  const fallbackAddress = walletAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

  const generatedLink = `${window.location.origin}/send?to=${fallbackAddress}${
    requestAmount ? `&amount=${requestAmount}&currency=${requestCurrency}` : ""
  }`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="card-base p-6 sm:p-7 shadow-sm bg-[#101216] border border-[#20242c] space-y-5">
      <div>
        <h3 className="font-display text-sm font-semibold text-white mb-1">
          Create Payment Request
        </h3>
        <p className="text-xs text-zinc-400 font-sans">
          Specify an amount to create a personalized payment link you can share with anyone.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
            Requested Amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              placeholder="Optional: e.g. 50"
              className="input-base flex-1 px-3.5 py-2.5 text-xs font-mono"
            />
            <select
              value={requestCurrency}
              onChange={(e) => setRequestCurrency(e.target.value)}
              className="px-3 py-2.5 bg-[#14171d] border border-[#242833] rounded-xl text-white text-xs font-semibold focus:outline-none font-sans"
            >
              <option value="POL">POL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </div>

        {/* Generated Direct URL */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
            Shareable Payment Link
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="input-base px-3.5 py-2.5 text-xs font-mono text-zinc-400 pr-20 truncate bg-[#0c0d10]"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white text-xs px-2.5 py-1 rounded bg-[#161920] border border-[#262b36] flex items-center gap-1 transition"
            >
              {linkCopied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-400" />
              )}
              <span>{linkCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Social Share Dispatch */}
        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 font-sans">
            Share Payment Link
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(
                generatedLink
              )}&text=${encodeURIComponent(
                `BlockPay Payment: Please send ${
                  requestAmount || "requested amount"
                } ${requestCurrency} on Polygon Amoy.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary py-2 rounded-xl flex items-center justify-center gap-1.5"
            >
              <TelegramIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Telegram</span>
            </a>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `BlockPay Payment Link: ${generatedLink}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary py-2 rounded-xl flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="pt-2 border-t border-[#1f232b]">
          <a
            href={`https://amoy.polygonscan.com/address/${fallbackAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white text-xs flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#20242c] transition group font-sans"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>View on Polygonscan</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
          </a>
        </div>
      </div>
    </div>
  );
}
