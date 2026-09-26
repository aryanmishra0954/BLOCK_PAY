import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download } from "lucide-react";

export default function QrDisplayCard({ walletAddress }) {
  const [copied, setCopied] = useState(false);
  const fallbackAddress = walletAddress || "";

  const handleCopyAddress = async () => {
    try {
      if (!fallbackAddress) return;
      await navigator.clipboard.writeText(fallbackAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("wallet-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `BlockPay-qr-${fallbackAddress.slice(0, 6)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="card-base p-6 sm:p-7 flex flex-col items-center text-center shadow-sm bg-[#101216] border border-[#20242c]">
      <h3 className="font-display text-sm font-semibold text-white mb-5">
        Your Wallet QR Code
      </h3>

      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-md mb-5">
        <QRCodeSVG
          id="wallet-qr-svg"
          value={fallbackAddress ? `ethereum:${fallbackAddress}@80002` : ""}
          size={180}
          level="H"
          includeMargin={false}
        />
      </div>

      <p className="text-xs text-zinc-400 mb-4 max-w-xs font-sans">
        Scan from MetaMask, Rabby, Phantom or any Web3 wallet.
      </p>

      <div className="w-full bg-[#0c0d10] rounded-xl p-3 mb-5 border border-[#20242c] text-left">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold font-sans">
          Your Wallet Address
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-zinc-300 truncate">
            {fallbackAddress}
          </span>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="text-zinc-400 hover:text-white text-xs p-1 transition"
            title="Copy Address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-2 text-xs font-sans">
        <button
          type="button"
          onClick={handleDownloadQR}
          className="btn-primary py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save PNG</span>
        </button>
        <button
          type="button"
          onClick={handleCopyAddress}
          className="btn-secondary py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Addr</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
