import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";
import { PriceProvider } from "./context/PriceContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import SendPage from "./pages/SendPage";
import ReceivePage from "./pages/ReceivePage";
import HistoryPage from "./pages/HistoryPage";
import ContactsPage from "./pages/ContactsPage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ children }) {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-400 relative">
      <div className="page-ambient-grid" aria-hidden="true" />
      {!isLanding && <Navbar />}
      <main className={`flex-1 relative z-10 ${!isLanding ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" : ""}`}>
        {children}
      </main>
      {!isLanding && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <PriceProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/send"
                  element={
                    <ProtectedRoute>
                      <SendPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/receive"
                  element={
                    <ProtectedRoute>
                      <ReceivePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <ProtectedRoute>
                      <ContactsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </PriceProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
