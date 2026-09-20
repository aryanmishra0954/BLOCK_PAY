import React, { createContext, useContext, useState, useEffect } from "react";
import { BlockPayAPI } from "../services/api";
import { useAuth } from "./AuthContext";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user, refreshUser } = useAuth();
  const [balance, setBalance] = useState(() => {
    return parseFloat(localStorage.getItem("walletBalance") || "10000.0000");
  });
  const [walletAddress, setWalletAddress] = useState(() => {
    return localStorage.getItem("walletAddress") || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.wallet_address) {
        setWalletAddress(user.wallet_address);
        localStorage.setItem("walletAddress", user.wallet_address);
      }
      if (user.balance !== undefined) {
        const num = parseFloat(user.balance);
        setBalance(num);
        localStorage.setItem("walletBalance", num.toFixed(4));
      }
    }
  }, [user]);

  const refreshBalance = async () => {
    setIsRefreshing(true);
    try {
      if (user) {
        await refreshUser();
      } else {
        const stored = parseFloat(localStorage.getItem("walletBalance") || "10000.0000");
        setBalance(stored);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const claimTestFunds = async (amount = 10000) => {
    const newBal = balance + amount;
    setBalance(newBal);
    localStorage.setItem("walletBalance", newBal.toFixed(4));

    const hash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    try {
      await BlockPayAPI.transactions.record({
        type: "received",
        amount: amount,
        currency: "POL",
        counterparty_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        tx_hash: hash,
        note: "Polygon Testnet Faucet Allocation",
        status: "success",
      });
    } catch (err) {
      console.warn("Backend faucet sync notice:", err);
    }

    return { success: true, amount, newBalance: newBal, hash };
  };

  const sendTransaction = async ({ to, amount, currency = "POL", note = "" }) => {
    const numAmount = parseFloat(amount);
    if (numAmount > balance) {
      throw new Error(`Insufficient balance. You have ${balance.toFixed(4)} POL`);
    }

    const hash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    const newBal = Math.max(0, balance - numAmount);
    setBalance(newBal);
    localStorage.setItem("walletBalance", newBal.toFixed(4));

    try {
      await BlockPayAPI.transactions.record({
        type: "sent",
        amount: numAmount,
        currency: currency,
        counterparty_address: to,
        tx_hash: hash,
        note: note || "Payment via BlockPay",
        status: "success",
      });
    } catch (err) {
      console.warn("Backend transaction sync notice:", err);
    }

    return {
      hash,
      amount: numAmount,
      currency,
      to,
      newBalance: newBal,
      isOnChain: false,
    };
  };

  /**
   * Broadcast an authentic on-chain transfer to Polygon Amoy Testnet via MetaMask.
   */
  const sendOnChainTransaction = async ({ to, amount, note = "" }) => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask or a Web3 EVM wallet was not detected. Please install MetaMask to broadcast real on-chain transactions, or switch to Instant Ledger mode."
      );
    }

    const AMOY_CHAIN_ID_HEX = "0x13882"; // 80002 decimal

    // 1. Ensure connected to Polygon Amoy Testnet
    try {
      const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
      if (currentChainId !== AMOY_CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: AMOY_CHAIN_ID_HEX }],
          });
        } catch (switchError) {
          // Chain not added to user's wallet yet
          if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: AMOY_CHAIN_ID_HEX,
                  chainName: "Polygon Amoy Testnet",
                  nativeCurrency: {
                    name: "POL",
                    symbol: "POL",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (err) {
      throw new Error(`Failed to switch network to Polygon Amoy: ${err.message}`);
    }

    // 2. Request user account
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("No active account selected in your Web3 wallet.");
    }
    const fromAddress = accounts[0];

    // 3. Convert POL amount to 18-decimal Wei Hex
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("Amount must be greater than 0 POL.");
    }

    // High-precision BigInt wei conversion
    const [wholePart, decimalPart = ""] = amount.toString().split(".");
    const paddedDecimals = decimalPart.padEnd(18, "0").slice(0, 18);
    const weiAmount = BigInt(wholePart || "0") * 10n ** 18n + BigInt(paddedDecimals);
    const valueHex = "0x" + weiAmount.toString(16);

    // 4. Prompt MetaMask to sign and broadcast the real on-chain transaction
    let realTxHash;
    try {
      realTxHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: fromAddress,
            to: to,
            value: valueHex,
          },
        ],
      });
    } catch (txErr) {
      if (txErr.code === 4001 || txErr?.message?.includes("rejected")) {
        throw new Error("Transaction rejected in MetaMask.");
      }
      throw new Error(`MetaMask broadcast error: ${txErr.message || "Unknown error"}`);
    }

    // 5. Update local balance and sync to backend
    const newBal = Math.max(0, balance - numAmount);
    setBalance(newBal);
    localStorage.setItem("walletBalance", newBal.toFixed(4));

    try {
      await BlockPayAPI.transactions.record({
        type: "sent",
        amount: numAmount,
        currency: "POL",
        counterparty_address: to,
        tx_hash: realTxHash,
        note: note ? `${note} (On-Chain Amoy)` : "Polygon Amoy On-Chain Transfer",
        status: "success",
      });
    } catch (err) {
      console.warn("Backend transaction record notice:", err);
    }

    return {
      hash: realTxHash,
      amount: numAmount,
      currency: "POL",
      to,
      newBalance: newBal,
      isOnChain: true,
    };
  };

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  return (
    <WalletContext.Provider
      value={{
        balance,
        walletAddress,
        isRefreshing,
        refreshBalance,
        claimTestFunds,
        sendTransaction,
        sendOnChainTransaction,
        hasMetaMask,
        setBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
