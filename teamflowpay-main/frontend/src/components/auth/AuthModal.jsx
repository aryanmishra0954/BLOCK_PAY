import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../common/BrandLogo";
import {
  Mail,
  Lock,
  User,
  X,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function AuthModal({ isOpen, onClose, initialMode = "signin", onSuccess }) {
  const { login, register, loginWithWeb3, loginWithWeb3Auth, loginWithGoogle } = useAuth();
  const [authMode, setAuthMode] = useState(initialMode); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null); // "email" | "metamask" | "web3auth"

  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  // MetaMask detection
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [showNoMetaMaskNotice, setShowNoMetaMaskNotice] = useState(false);

  useEffect(() => {
    setHasMetaMask(typeof window !== "undefined" && typeof window.ethereum !== "undefined");
    setAuthMode(initialMode);
    setErrorMsg("");
    setShowGooglePrompt(false);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    setActiveProvider("email");

    const cleanEmail = email.trim();
    const cleanName = fullName.trim() || cleanEmail.split("@")[0];

    try {
      if (authMode === "signin") {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password, cleanName);
      }
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  const handleMetaMaskConnect = async () => {
    setErrorMsg("");
    setShowNoMetaMaskNotice(false);

    if (typeof window.ethereum === "undefined") {
      setShowNoMetaMaskNotice(true);
      return;
    }

    setIsSubmitting(true);
    setActiveProvider("metamask");

    try {
      await loginWithWeb3();
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      setErrorMsg(err.message || "MetaMask connection failed");
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  const handleWeb3AuthConnect = async () => {
    setErrorMsg("");
    setIsSubmitting(true);
    setActiveProvider("web3auth");

    const targetEmail = (email || googleEmailInput).trim();

    try {
      await loginWithWeb3Auth(targetEmail);
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      console.warn("Web3Auth handler fallback check:", err);
      // If Web3Auth requires email or cloud initialization is unavailable:
      if (targetEmail && targetEmail.includes("@")) {
        try {
          await loginWithGoogle({
            email: targetEmail,
            name: fullName.trim() || targetEmail.split("@")[0],
          });
          if (onSuccess) onSuccess();
          else onClose();
          return;
        } catch (gErr) {
          setErrorMsg(gErr.message || "Google sign-in failed. Please verify email.");
        }
      } else {
        // Open the streamlined Google Account prompt instead of showing raw SDK error
        setGoogleEmailInput(email || "");
        setShowGooglePrompt(true);
      }
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  const handleGooglePromptSubmit = async (e) => {
    if (e) e.preventDefault();
    const target = (googleEmailInput || email).trim();
    if (!target || !target.includes("@")) {
      setErrorMsg("Please enter a valid Google email address.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    setActiveProvider("web3auth");

    try {
      await loginWithGoogle({
        email: target,
        name: fullName.trim() || target.split("@")[0],
      });
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      setErrorMsg(err.message || "Google authentication failed.");
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#101216] border border-[#232732] rounded-2xl max-w-md w-full p-6 sm:p-7 relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand & Header */}
        <div className="mb-5">
          <BrandLogo size="md" to={null} />
          <h3 className="font-display text-lg font-bold text-white mt-3">
            {authMode === "signin" ? "Sign in to BlockPay" : "Create Your BlockPay Account"}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Choose your preferred sign-in method. New accounts receive 10,000 free Test POL.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* No MetaMask Installed Notice */}
        {showNoMetaMaskNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs space-y-2 font-sans">
            <div className="flex items-center gap-1.5 font-semibold text-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span>MetaMask Not Detected</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              No Web3 provider was found in this browser window. You can install MetaMask or use Email / Google sign in.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-[11px] px-3 py-1.5 rounded-lg inline-flex items-center gap-1 font-semibold"
              >
                <span>Install MetaMask</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setShowNoMetaMaskNotice(false)}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {showGooglePrompt ? (
          <form onSubmit={handleGooglePromptSubmit} className="space-y-4 font-sans animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 text-left">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <h4 className="text-white text-xs font-bold">Google Web3 Authentication</h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                Enter your Google account email to link or generate your non-custodial Polygon wallet with 10,000 Test POL.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 text-xs mb-1.5">
                Google Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="e.g. aryan2204.mishra@gmail.com"
                  className="input-base pl-9 py-2.5 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !googleEmailInput}
              className="w-full btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Continue with Google</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowGooglePrompt(false);
                setErrorMsg("");
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-white py-1 transition"
            >
              ← Back to all sign-in options
            </button>
          </form>
        ) : (
          <>
            {/* Real Web3Auth & MetaMask Authentication Buttons */}
            <div className="space-y-2.5 mb-5 font-sans">
              {/* Web3Auth: Google & Social Account Button */}
              <button
                type="button"
                onClick={handleWeb3AuthConnect}
                disabled={isSubmitting}
                className="w-full p-3 rounded-xl border border-[#262b37] bg-[#14171d] hover:bg-[#1c212c] hover:border-emerald-500/40 text-white font-semibold text-xs flex items-center justify-between transition shadow-sm disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  {/* Google SVG */}
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-xs font-semibold">Continue with Google (Web3Auth)</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Instant Web3 wallet • No extension required</p>
                  </div>
                </div>

                {isSubmitting && activeProvider === "web3auth" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Web3Auth
                  </span>
                )}
              </button>

              {/* MetaMask Web3 Button */}
              <button
                type="button"
                onClick={handleMetaMaskConnect}
                disabled={isSubmitting}
                className="w-full p-3 rounded-xl border border-[#262b37] bg-[#14171d] hover:bg-[#1c212c] hover:border-amber-500/40 text-white font-semibold text-xs flex items-center justify-between transition shadow-sm disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  {/* MetaMask Fox SVG */}
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="w-4 h-4 flex-shrink-0" fill="none">
                      <path d="M28.4 4.5l-10 7.4 1.9-4.5L28.4 4.5z" fill="#E17726"/>
                      <path d="M3.6 4.5l9.9 7.5-1.8-4.6L3.6 4.5z" fill="#E27625"/>
                      <path d="M24.7 21.6l-2.7 4.1 5.6 1.5 1.6-5.5-4.5-.1z" fill="#E27625"/>
                      <path d="M2.8 21.7l1.6 5.5 5.6-1.5-2.7-4.1-4.5.1z" fill="#E27625"/>
                      <path d="M10.7 14.2l-1.5 2.3 5.4.2-.2-5.8-3.7 3.3z" fill="#E27625"/>
                      <path d="M21.3 14.2l-3.8-3.4-.2 5.9 5.4-.2-1.4-2.3z" fill="#E27625"/>
                      <path d="M10.7 14.2l3.7-3.3-4.1-3.6-1.4 4.6 1.8 2.3z" fill="#D56327"/>
                      <path d="M21.3 14.2l1.8-2.3-1.4-4.6-4.1 3.5 3.7 3.4z" fill="#D56327"/>
                      <path d="M10.7 16.5l-3.5 5.2 4 1.9 2-4.8-2.5-2.3z" fill="#E27625"/>
                      <path d="M21.3 16.5l-2.5 2.3 2 4.8 4-1.9-3.5-5.2z" fill="#E27625"/>
                      <path d="M14.6 23.6l-3.4-1.6 2.5 3.7 3.3-.8-2.4-1.3z" fill="#D56327"/>
                      <path d="M17.4 23.6l-2.4 1.3 3.3.8 2.5-3.7-3.4 1.6z" fill="#D56327"/>
                      <path d="M17.3 24.9l-1.3-.7-1.3.7 1.3 2.6 1.3-2.6z" fill="#F5841F"/>
                      <path d="M16 11.9l-.2 4.6 2.7-.1-.2-4.5H16z" fill="#C0AD9E"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-xs font-semibold">Connect MetaMask</p>
                    <p className="text-[10px] text-zinc-400 font-normal">Sign in with browser extension wallet</p>
                  </div>
                </div>

                {isSubmitting && activeProvider === "metamask" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    EIP-191
                  </span>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-full border-t border-[#1e222b]"></div>
              <span className="bg-[#101216] px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-sans">
                Or continue with email
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs font-sans">
              {authMode === "signup" && (
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Satoshi Nakamoto"
                      className="input-base pl-9 py-2.5 text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="input-base pl-9 py-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-base pl-9 pr-9 py-2.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md"
              >
                {isSubmitting && activeProvider === "email" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {authMode === "signin"
                      ? "Sign In with Email"
                      : "Create Account & Get 10,000 POL"}
                  </span>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="mt-4 text-center text-xs text-zinc-400 border-t border-[#1f232c] pt-3.5 font-sans">
              {authMode === "signin" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setAuthMode("signup");
                    }}
                    className="text-white hover:underline font-semibold ml-1"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setAuthMode("signin");
                    }}
                    className="text-white hover:underline font-semibold ml-1"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

