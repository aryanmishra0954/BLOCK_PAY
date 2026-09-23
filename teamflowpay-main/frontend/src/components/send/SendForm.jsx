import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePrices } from "../../context/PriceContext";
import { BlockPayAPI } from "../../services/api";
import {
  Send,
  ClipboardPaste,
  Loader2,
  AlertCircle,
  Users,
  BookOpen,
  ChevronDown,
  UserCheck,
  Check,
  UserPlus,
  Zap,
  Globe,
  ShieldCheck,
  Info,
} from "lucide-react";

export default function SendForm({
  balance = 0,
  onSubmitTransaction,
  onClaimFaucet,
  onRecipientChange,
  onPolEquivalentChange,
}) {
  const [searchParams] = useSearchParams();
  const { rates } = usePrices();

  const [transferMode, setTransferMode] = useState("instant");

  const [recipient, setRecipient] = useState(searchParams.get("to") || "");
  const [recipientName, setRecipientName] = useState(searchParams.get("name") || "");
  const [amount, setAmount] = useState(searchParams.get("amount") || "");
  const [currency, setCurrency] = useState(searchParams.get("currency") || "POL");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [contacts, setContacts] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [saveToContacts, setSaveToContacts] = useState(false);
  const [newContactName, setNewContactName] = useState("");

  const currentGasFee = 0.0023;
  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await BlockPayAPI.contacts.getAll();
        if (res.success && Array.isArray(res.contacts)) {
          setContacts(res.contacts);
          if (!recipientName && recipient) {
            const found = res.contacts.find(
              (c) => c.address.toLowerCase() === recipient.toLowerCase()
            );
            if (found) setRecipientName(found.name);
          }
        }
      } catch (err) {
        console.warn("Could not load contacts:", err);
      }
    }
    loadContacts();
  }, [recipient, recipientName]);

  const numAmount = parseFloat(amount) || 0;
  let polEquivalent = numAmount;
  if (currency !== "POL") {
    const rate = rates[currency] || 1;
    polEquivalent = rate > 0 ? numAmount / rate : numAmount;
  }

  useEffect(() => {
    if (onRecipientChange) onRecipientChange(recipient);
  }, [recipient, onRecipientChange]);

  useEffect(() => {
    if (onPolEquivalentChange) onPolEquivalentChange(polEquivalent);
  }, [polEquivalent, onPolEquivalentChange]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = text.trim();
        setRecipient(clean);
        const found = contacts.find((c) => c.address.toLowerCase() === clean.toLowerCase());
        setRecipientName(found ? found.name : "");
      }
    } catch (err) {
      console.warn("Clipboard paste access denied:", err);
    }
  };

  const handleSelectContact = (contact) => {
    setRecipient(contact.address);
    setRecipientName(contact.name);
    setIsPickerOpen(false);
    setSaveToContacts(false);
  };

  const handleSetMax = () => {
    const maxVal = Math.max(0, balance - currentGasFee);
    if (currency === "POL") {
      setAmount(maxVal.toFixed(4));
    } else {
      const rate = rates[currency] || 1;
      setAmount((maxVal * rate).toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanRecipient = recipient.trim();
    if (!cleanRecipient.startsWith("0x") || cleanRecipient.length !== 42) {
      setErrorMsg("Please enter a valid 42-character Polygon EVM address (0x...)");
      return;
    }

    if (polEquivalent <= 0) {
      setErrorMsg("Amount must be greater than 0");
      return;
    }

    if (transferMode === "instant" && polEquivalent + currentGasFee > balance) {
      setErrorMsg(
        `Insufficient balance. You require ${(polEquivalent + currentGasFee).toFixed(
          4
        )} POL (incl. gas), but have ${balance.toFixed(4)} POL.`
      );
      return;
    }

    if (transferMode === "on_chain" && !hasMetaMask) {
      setErrorMsg("MetaMask was not detected. Please install MetaMask to broadcast real on-chain transactions, or select Instant Ledger mode.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStep(
      transferMode === "on_chain"
        ? "Waiting for MetaMask signature..."
        : "Broadcasting transaction..."
    );

    try {
      if (saveToContacts && newContactName.trim()) {
        try {
          await BlockPayAPI.contacts.create({
            name: newContactName.trim(),
            address: cleanRecipient,
          });
        } catch (saveErr) {
          console.warn("Notice: could not auto-save contact:", saveErr);
        }
      }

      await onSubmitTransaction({
        to: cleanRecipient,
        amount: polEquivalent,
        currency: "POL",
        note: note || `Payment via BlockPay (${recipientName || "Direct transfer"})`,
        mode: transferMode,
      });

      setAmount("");
      setNote("");
      setSaveToContacts(false);
      setNewContactName("");
    } catch (err) {
      setErrorMsg(err.message || "Transaction broadcast failed");
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  };

  const isExistingContact = contacts.some(
    (c) => c.address.toLowerCase() === recipient.trim().toLowerCase()
  );

  return (
    <div className="card-base p-6 sm:p-7 shadow-sm bg-[#101216] border border-[#20242c] relative">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
            Transfer Mode
          </label>
          <div className="flex p-1 rounded-xl bg-zinc-950 border border-zinc-800 gap-1">
            <button
              type="button"
              onClick={() => setTransferMode("instant")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                transferMode === "instant"
                  ? "bg-zinc-850 text-white border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${transferMode === "instant" ? "text-amber-400" : "text-zinc-500"}`} />
              <span>Instant Ledger (Gasless)</span>
            </button>
            <button
              type="button"
              onClick={() => setTransferMode("on_chain")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                transferMode === "on_chain"
                  ? "bg-purple-950/50 text-purple-200 border border-purple-800/80 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${transferMode === "on_chain" ? "text-purple-400" : "text-zinc-500"}`} />
              <span>Real On-Chain (MetaMask)</span>
            </button>
          </div>

          {transferMode === "on_chain" ? (
            <div className="mt-2.5 p-3 rounded-xl bg-purple-950/25 border border-purple-800/40 text-xs text-purple-300 flex items-start gap-2.5 animate-in fade-in duration-100">
              <Globe className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-purple-200">Broadcasts Live to Polygon Amoy Testnet</p>
                <p className="text-[11px] text-purple-300/80 leading-relaxed">
                  MetaMask will open to sign and broadcast the transfer directly onto Polygon Amoy (Chain 80002). You will receive a verifiable Polygonscan transaction link.
                </p>
                {!hasMetaMask && (
                  <p className="text-[11px] text-rose-400 font-semibold pt-1">
                    Notice: MetaMask was not detected. Please install MetaMask or switch to Instant Ledger mode.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1.5 px-1 font-sans">
              <Zap className="w-3 h-3 text-amber-500/80" />
              <span>Instant transfers execute in zero block time via the persistent BlockPay SQLite ledger.</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-zinc-300 font-sans">
            <label className="flex items-center gap-2">
              <span>Recipient Address</span>
              {recipientName && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-normal">
                  <UserCheck className="w-3 h-3" />
                  {recipientName}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              {contacts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(!isPickerOpen)}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Address Book ({contacts.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isPickerOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {isPickerOpen && (
            <div className="mb-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 max-h-48 overflow-y-auto animate-in fade-in duration-100">
              <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500 px-2 py-1">
                Select from Saved Contacts
              </div>
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-200 group-hover:text-white truncate font-medium">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 ml-2 truncate">
                    {c.address.slice(0, 6)}...{c.address.slice(-4)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                const found = contacts.find(
                  (c) => c.address.toLowerCase() === e.target.value.trim().toLowerCase()
                );
                setRecipientName(found ? found.name : "");
              }}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              className="input-base px-3.5 py-2.5 text-xs font-mono pr-20"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-2.5 py-1 rounded bg-[#161920] border border-[#262b36] flex items-center gap-1 transition"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Paste</span>
            </button>
          </div>

          {recipient.startsWith("0x") && recipient.length === 42 && !isExistingContact && (
            <div className="mt-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToContacts}
                  onChange={(e) => setSaveToContacts(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0"
                />
                <span>Save this address to Address Book</span>
              </label>
              {saveToContacts && (
                <div className="flex gap-2 animate-in fade-in duration-100">
                  <input
                    type="text"
                    required={saveToContacts}
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Contact name (e.g. Alex Frontend)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-zinc-300 font-sans">
            <label>Amount to Send</label>
            <div className="flex items-center gap-2 text-xs font-normal">
              <span className="text-zinc-500">
                Bal:{" "}
                <span className="font-mono text-zinc-300">
                  {balance.toFixed(4)} POL
                </span>
              </span>
              <button
                type="button"
                onClick={() => onClaimFaucet(10000)}
                className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-semibold transition"
              >
                +10k Faucet
              </button>
              <button
                type="button"
                onClick={handleSetMax}
                className="px-2 py-0.5 rounded bg-[#161920] text-zinc-300 hover:bg-[#1f242e] border border-[#262b36] text-[11px] font-semibold transition"
              >
                Max
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-base flex-1 px-3.5 py-2.5 text-sm font-mono"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3.5 py-2.5 bg-[#14171d] border border-[#242833] rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-600 font-sans"
            >
              <option value="POL">POL</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          {currency !== "POL" && numAmount > 0 && (
            <p className="text-[11px] text-zinc-400 mt-1.5 font-mono flex items-center justify-between">
              <span>
                ≈ {polEquivalent.toFixed(4)} POL
              </span>
              <span className="text-[10px] text-zinc-500">
                1 POL = {currency === "INR" ? `₹${rates.INR.toFixed(2)}` : currency === "EUR" ? `€${rates.EUR.toFixed(4)}` : `$${rates.USD.toFixed(4)}`} (Live CoinGecko)
              </span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
            Reference / Memo (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Audit retainer, Design milestone 2"
            className="input-base px-3.5 py-2 text-xs"
          />
        </div>

        <div className="p-3 rounded-xl bg-[#0c0d10] border border-[#1f242d] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-zinc-400 font-sans">
              {transferMode === "on_chain" ? "Network Gas (Polygon Amoy):" : "Estimated Network Fee:"}
            </span>
          </div>
          <span className="text-zinc-300 font-semibold">{currentGasFee} POL</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition ${
            transferMode === "on_chain"
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
              : "btn-primary"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{submitStep || "Broadcasting to Polygon Amoy..."}</span>
            </>
          ) : (
            <>
              {transferMode === "on_chain" ? <Globe className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>
                {transferMode === "on_chain"
                  ? `Confirm & Send via MetaMask (${polEquivalent > 0 ? `${polEquivalent.toFixed(4)} POL` : "POL"})`
                  : `Send ${polEquivalent > 0 ? `${polEquivalent.toFixed(4)} POL` : "Payment"}`}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
