import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/common/BrandLogo";
import AuthModal from "../components/auth/AuthModal";
import HeroSection from "../components/landing/HeroSection";
import PaymentSimulator from "../components/landing/PaymentSimulator";
import FeaturesGrid from "../components/landing/FeaturesGrid";
import ArchitecturePipeline from "../components/landing/ArchitecturePipeline";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      setAuthMode("signup");
      setIsModalOpen(true);
    }
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      setAuthMode("signin");
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-zinc-100 relative selection:bg-emerald-500/20 selection:text-emerald-400">
      <div className="ambient-flow-container" aria-hidden="true">
        <div className="ambient-grid"></div>
        <img
          src="/assets/images/hero_bg_flow.jpg"
          alt=""
          className="ambient-flow-image"
          loading="eager"
        />
        <div className="ambient-flow-overlay"></div>
      </div>

      <header className="sticky top-0 z-40 glass-surface border-b border-[#1f232b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <BrandLogo size="md" to="/" />

              <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400 font-sans">
                <a href="#features" className="hover:text-white transition">Features</a>
                <a href="#simulator" className="hover:text-white transition">Try Demo</a>
                <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
                <a
                  href="https://amoy.polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition flex items-center gap-1"
                >
                  <span>Polygonscan</span>
                  <ArrowRight className="w-3 h-3 -rotate-45 text-zinc-500" />
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#232731] text-xs font-medium text-zinc-400 bg-[#12151b]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-[11px]">Polygon Amoy</span>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-primary text-xs px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSignIn}
                    className="btn-secondary text-xs px-3.5 py-2 rounded-lg hidden sm:inline-flex"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleGetStarted}
                    className="btn-primary text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <HeroSection
          onGetStarted={handleGetStarted}
          isAuthenticated={isAuthenticated}
        />
        <PaymentSimulator />
        <FeaturesGrid />
        <ArchitecturePipeline
          onGetStarted={handleGetStarted}
          isAuthenticated={isAuthenticated}
        />
      </main>

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsModalOpen(false);
          navigate("/dashboard");
        }}
      />
    </div>
  );
}
