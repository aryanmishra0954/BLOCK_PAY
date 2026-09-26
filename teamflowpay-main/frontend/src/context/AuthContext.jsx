import React, { createContext, useContext, useState, useEffect } from "react";
import { BlockPayAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("authToken") || "");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem("authToken");
      const isAuth = localStorage.getItem("isAuthenticated") === "true";
      if (!storedToken || !isAuth) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await BlockPayAPI.auth.me();
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem("userEmail", res.user.email);
          localStorage.setItem("userName", res.user.full_name || "");
          localStorage.setItem("walletAddress", res.user.wallet_address || "");
          if (res.user.balance !== undefined) {
            localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
          }
        } else {
          handleLogoutLocal();
        }
      } catch (err) {
        console.warn("Auth initialization notice:", err);
        handleLogoutLocal();
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await BlockPayAPI.auth.login(email, password);
    if (res.token && res.user) {
      BlockPayAPI.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", res.user.email);
      localStorage.setItem("userName", res.user.full_name || "");
      localStorage.setItem("walletAddress", res.user.wallet_address || "");
      if (res.user.balance !== undefined) {
        localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
      }
    }
    return res;
  };

  const loginAsDemo = async () => {
    return await login("trader@blockpay.io", "password123");
  };

  const register = async (email, password, fullName) => {
    const res = await BlockPayAPI.auth.register(email, password, fullName);
    if (res.token && res.user) {
      BlockPayAPI.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", res.user.email);
      localStorage.setItem("userName", res.user.full_name || "");
      localStorage.setItem("walletAddress", res.user.wallet_address || "");
      if (res.user.balance !== undefined) {
        localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
      }
    }
    return res;
  };

  const loginWithWeb3 = async () => {
    if (typeof window.ethereum === "undefined") {
      throw new Error(
        "MetaMask is not installed. Please install the MetaMask browser extension from metamask.io or use a Web3 compatible browser."
      );
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts authorized in MetaMask.");
    }

    const address = accounts[0];

    const nonceRes = await BlockPayAPI.auth.getWeb3Nonce(address);
    if (!nonceRes || !nonceRes.message) {
      throw new Error("Failed to generate challenge nonce from BlockPay server.");
    }

    const challengeMessage = nonceRes.message;

    let signature;
    try {
      signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challengeMessage, address],
      });
    } catch (err) {
      if (err.code === 4001) {
        throw new Error("Signature request cancelled in MetaMask.");
      }
      throw new Error(err.message || "Failed to sign message with MetaMask.");
    }

    const verifyRes = await BlockPayAPI.auth.verifyWeb3({
      address,
      signature,
      message: challengeMessage,
    });

    if (verifyRes.token && verifyRes.user) {
      BlockPayAPI.setToken(verifyRes.token);
      setToken(verifyRes.token);
      setUser(verifyRes.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", verifyRes.user.email);
      localStorage.setItem("userName", verifyRes.user.full_name || "");
      localStorage.setItem("walletAddress", verifyRes.user.wallet_address || address);
      if (verifyRes.user.balance !== undefined) {
        localStorage.setItem("walletBalance", parseFloat(verifyRes.user.balance).toFixed(4));
      }
    }
    return verifyRes;
  };

  const loginWithWeb3Auth = async (fallbackEmail = null) => {
    let email = fallbackEmail?.trim() || null;
    let name = email ? email.split("@")[0] : null;
    let picture = null;
    let walletAddress = null;
    let googleId = null;
    let idToken = null;

    try {
      const { web3AuthService } = await import("../services/web3auth");
      const res = await web3AuthService.connect();
      if (res) {
        if (res.userInfo) {
          email = res.userInfo.email || email;
          name = res.userInfo.name || name;
          picture = res.userInfo.profileImage || null;
          googleId = res.userInfo.verifierId || res.userInfo.id || null;
          idToken = res.userInfo.idToken || res.userInfo.id_token || null;
        }
        if (res.walletAddress) {
          walletAddress = res.walletAddress;
        }
      }
    } catch (err) {
      console.warn("Web3Auth Cloud SDK notice:", err?.message || err);
      if (!email) {
        throw new Error("NEED_GOOGLE_EMAIL");
      }
    }

    if (!email) {
      throw new Error("NEED_GOOGLE_EMAIL");
    }

    const res = await BlockPayAPI.auth.verifyGoogle({
      id_token: idToken,
      email,
      name: name || email.split("@")[0],
      picture,
      wallet_address: walletAddress,
      google_id: googleId || ("google_web3_" + email.replace(/[^a-zA-Z0-9]/g, "_")),
    });

    if (res.token && res.user) {
      BlockPayAPI.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", res.user.email);
      localStorage.setItem("userName", res.user.full_name || "");
      localStorage.setItem("walletAddress", res.user.wallet_address || walletAddress || "");
      if (res.user.balance !== undefined) {
        localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
      }
    }
    return res;
  };

  const loginWithGoogle = async (googleData) => {
    const res = await BlockPayAPI.auth.verifyGoogle(googleData);
    if (res.token && res.user) {
      BlockPayAPI.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", res.user.email);
      localStorage.setItem("userName", res.user.full_name || "");
      localStorage.setItem("walletAddress", res.user.wallet_address || "");
      if (res.user.balance !== undefined) {
        localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
      }
    }
    return res;
  };

  const logout = async () => {
    try {
      const { web3AuthService } = await import("../services/web3auth");
      await web3AuthService.logout();
    } catch (e) {
      console.warn("Web3Auth logout notice:", e);
    }
    await BlockPayAPI.auth.logout();
    handleLogoutLocal();
  };

  const handleLogoutLocal = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletBalance");
  };

  const refreshUser = async () => {
    try {
      const res = await BlockPayAPI.auth.me();
      if (res && res.user) {
        setUser(res.user);
        if (res.user.balance !== undefined) {
          localStorage.setItem("walletBalance", parseFloat(res.user.balance).toFixed(4));
        }
      }
    } catch (e) {
      console.warn("Refresh user notice:", e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginAsDemo,
        loginWithWeb3,
        loginWithWeb3Auth,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
