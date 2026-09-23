import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BlockPayAPI } from "../services/api";
import {
  Users,
  UserPlus,
  Search,
  Send,
  Copy,
  Check,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  ClipboardPaste,
} from "lucide-react";

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const res = await BlockPayAPI.contacts.getAll();
      if (res.success && Array.isArray(res.contacts)) {
        setContacts(res.contacts);
      }
    } catch (err) {
      console.warn("Error fetching contacts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormName("");
    setFormAddress("");
    setFormEmail("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormAddress(contact.address);
    setFormEmail(contact.email || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormError("");
  };

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setFormAddress(text.trim());
    } catch (err) {
      console.warn("Clipboard access not allowed:", err);
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setFormError("");

    const name = formName.trim();
    const address = formAddress.trim();
    const email = formEmail.trim();

    if (!name) {
      setFormError("Please enter a contact name.");
      return;
    }

    if (!address.startsWith("0x") || address.length !== 42) {
      setFormError("Please enter a valid 42-character EVM address starting with 0x.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingContact) {
        await BlockPayAPI.contacts.update(editingContact.id, { name, address, email });
      } else {
        await BlockPayAPI.contacts.create({ name, address, email });
      }
      await fetchContacts();
      handleCloseModal();
    } catch (err) {
      setFormError(err.message || "Failed to save contact.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to remove this contact?")) return;
    try {
      await BlockPayAPI.contacts.delete(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      alert("Failed to delete contact: " + err.message);
    }
  };

  const handleCopyAddress = (id, address) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToContact = (contact) => {
    navigate(`/send?to=${encodeURIComponent(contact.address)}&name=${encodeURIComponent(contact.name)}`);
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Address Book
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-800 text-xs font-mono text-zinc-400">
              {contacts.length} {contacts.length === 1 ? "Contact" : "Contacts"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Saved teammates, vendors, and frequent Polygon counterparties
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs tracking-tight transition shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Contact</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, 0x address, or email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 font-sans transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs font-mono">Loading address book...</span>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {searchQuery ? "No contacts match your search" : "No contacts in address book yet"}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? "Try searching by a different name, address, or keyword."
              : "Save your teammates and vendors for instant 1-click payments and AI dispatch."}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-medium text-white transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Your First Contact</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const shortAddr = `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`;
            const isCopied = copiedId === contact.id;

            return (
              <div
                key={contact.id}
                className="group relative rounded-xl border border-zinc-800/90 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-850/80 transition p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center font-display text-xs font-bold text-white flex-shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-zinc-100 truncate">
                          {contact.name}
                        </h3>
                        {contact.email ? (
                          <p className="text-[11px] text-zinc-400 truncate">{contact.email}</p>
                        ) : (
                          <p className="text-[11px] text-zinc-500 font-mono">Polygon Amoy</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(contact)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800/90 font-mono text-[11px]">
                    <span className="text-zinc-400 truncate">{shortAddr}</span>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(contact.id, contact.address)}
                        className="text-zinc-400 hover:text-zinc-200 transition"
                        title="Copy Address"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <a
                        href={`https://amoy.polygonscan.com/address/${contact.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-zinc-300 transition"
                        title="View on Polygonscan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/70">
                  <button
                    type="button"
                    onClick={() => handleSendToContact(contact)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Payment</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="font-display text-base font-bold text-white">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Contact Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Lead Designer)"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Polygon EVM Address <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteAddress}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 font-mono placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email / Notes (Optional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. sarah@studio.xyz"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold tracking-tight transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingContact ? "Save Changes" : "Create Contact"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
