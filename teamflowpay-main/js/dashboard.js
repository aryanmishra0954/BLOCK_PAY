function checkAuth() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (isAuthenticated !== "true") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.clear();
      window.location.href = "index.html";
    }
  }
}

const mockTransactions = [];

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusBadge(status) {
  const badges = {
    success:
      '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Success</span>',
    pending:
      '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>',
    failed:
      '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Failed</span>',
  };
  return badges[status] || badges.pending;
}

async function loadRecentTransactions() {
  const container = document.getElementById("recentTransactions");
  const emptyState = document.getElementById("emptyTransactionsState");
  if (!container) return;
  try {
    const walletAddress = localStorage.getItem("walletAddress");
    let transactions = [];
    if (
      walletAddress &&
      window.firebaseService &&
      window.firebaseService.initialized
    ) {
      try {
        transactions = await window.firebaseService.loadAndMergeTransactions(
          walletAddress
        );
      } catch (error) {
        console.error("Error loading from Firebase:", error);
        transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
      }
    } else {
      transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    }
    const recentTxs = transactions.slice(0, 5);
    if (recentTxs.length === 0) {
      container.innerHTML = "";
      if (emptyState) {
        emptyState.classList.remove("hidden");
      }
      return;
    }
    if (emptyState) {
      emptyState.classList.add("hidden");
    }
    container.innerHTML = recentTxs
      .map((tx) => {
        const icon =
          tx.type === "sent"
            ? '<i class="fas fa-arrow-up text-red-500"></i>'
            : '<i class="fas fa-arrow-down text-green-500"></i>';
        const addressShort =
          tx.address.slice(0, 6) + "..." + tx.address.slice(-4);
        return `
                <div class="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onclick="viewTransaction('${
                  tx.hash
                }')">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 ${
                          tx.type === "sent" ? "bg-red-100" : "bg-green-100"
                        } rounded-lg flex items-center justify-center">
                            ${icon}
                        </div>
                        <div class="flex-1">
                            <p class="font-medium text-gray-900 dark:text-gray-100 capitalize">${
                              tx.type
                            }</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">${addressShort}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-gray-900 dark:text-gray-100">${
                          tx.type === "sent" ? "-" : "+"
                        } ${tx.amount} POL</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400">${formatDate(
                          tx.date
                        )}</p>
                    </div>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("❌ Error loading transactions:", error);
    container.innerHTML = "";
    if (emptyState) {
      emptyState.classList.remove("hidden");
    }
  }
}

window.loadRecentTransactions = loadRecentTransactions;

function viewTransaction(hash) {
  const url = `https://polygonscan.com/tx/${hash}`;
  window.open(url, "_blank");
}

function copyAddress() {
  const address =
    localStorage.getItem("walletAddress") ||
    "0x742d35Cc6634C0532925a3b844Bc9e5e89Fe5e89";
  navigator.clipboard
    .writeText(address)
    .then(() => {
      showNotification("Address copied to clipboard!", "success");
    })
    .catch(() => {
      showNotification("Failed to copy address", "error");
    });
}

function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };
  const notification = document.createElement("div");
  notification.className = `notification fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.transform = "translateX(120%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function toggleProfileMenu() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
  }
}

function showProfileMenu() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    clearTimeout(window.profileMenuTimeout);
    dropdown.classList.remove("hidden");
  }
}

function hideProfileMenu() {
  window.profileMenuTimeout = setTimeout(() => {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
    }
  }, 300);
}

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("profileDropdown");
  const button = document.getElementById("profileMenuButton");
  if (
    dropdown &&
    button &&
    !button.contains(event.target) &&
    !dropdown.contains(event.target)
  ) {
    dropdown.classList.add("hidden");
  }
});

async function loadWalletInfo() {
  const walletAddress = localStorage.getItem("walletAddress");
  const authMethod = localStorage.getItem("authMethod");
  const connectedView = document.getElementById("walletConnectedView");
  const notConnectedView = document.getElementById("walletNotConnectedView");
  if (!walletAddress && authMethod === "google") {
    if (connectedView) connectedView.style.display = "none";
    if (notConnectedView) notConnectedView.style.display = "block";
    return;
  }
  if (connectedView) connectedView.style.display = "block";
  if (notConnectedView) notConnectedView.style.display = "none";
  const addressShort =
    walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
  const addressElement = document.getElementById("walletAddress");
  if (addressElement) {
    addressElement.textContent = addressShort;
  }
  if (authMethod === "metamask" && typeof window.ethereum !== "undefined") {
    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      });
      const balanceInMatic = parseInt(balance, 16) / Math.pow(10, 18);
      const maticBalanceElement = document.getElementById("maticBalance");
      if (maticBalanceElement) {
        maticBalanceElement.textContent = balanceInMatic.toFixed(4);
      }
      const usdRate = 0.68;
      const usdBalance = (balanceInMatic * usdRate).toFixed(2);
      const usdBalanceElement = document.getElementById("usdBalance");
      if (usdBalanceElement) {
        usdBalanceElement.textContent = `≈ $${usdBalance} USD`;
      }
    } catch (error) {
      console.error("Error fetching balance from MetaMask:", error);
    }
  }
}

function checkWalletConnection() {
  const authMethod = localStorage.getItem("authMethod");
  const walletAddress = localStorage.getItem("walletAddress");
  if (authMethod === "google" && !walletAddress) {
    return false;
  }
  return true;
}

function showWalletConnectionPrompt() {
  const modal = document.createElement("div");
  modal.id = "walletConnectionModal";
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h3>
                <p class="text-gray-600">To send or receive payments, please connect your MetaMask wallet</p>
            </div>
            <button onclick="connectMetaMaskFromDashboard()" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-6 py-4 font-medium flex items-center justify-center gap-3 hover:shadow-lg transition-all mb-3">
                <svg class="w-6 h-6" viewBox="0 0 40 40" fill="none">
                    <path d="M33.76 5.25L21.5 14.25L23.75 9.25L33.76 5.25Z" fill="#E17726"/>
                    <path d="M6.24 5.25L18.38 14.33L16.25 9.25L6.24 5.25Z" fill="#E27625"/>
                    <path d="M29.01 28.5L26.13 33L33.13 34.88L35.05 28.63L29.01 28.5Z" fill="#E27625"/>
                    <path d="M4.96 28.63L6.87 34.88L13.87 33L10.99 28.5L4.96 28.63Z" fill="#E27625"/>
                </svg>
                <span>Connect MetaMask</span>
            </button>
            <button onclick="closeWalletPrompt()" class="w-full text-gray-600 hover:text-gray-800 font-medium py-2">
                Maybe Later
            </button>
        </div>
    `;
  document.body.appendChild(modal);
}

async function connectMetaMaskFromDashboard() {
  if (typeof window.ethereum === "undefined") {
    showNotification(
      "MetaMask is not installed. Redirecting to download page...",
      "error"
    );
    setTimeout(() => {
      window.open(
        "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
        "_blank"
      );
    }, 1000);
    return;
  }
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = accounts[0];
    localStorage.setItem("walletAddress", account);
    closeWalletPrompt();
    showNotification("Wallet connected successfully!", "success");
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error("MetaMask connection error:", error);
    showNotification("Failed to connect wallet. Please try again.", "error");
  }
}

function closeWalletPrompt() {
  const modal = document.getElementById("walletConnectionModal");
  if (modal) {
    modal.remove();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!checkAuth()) return;
  if (window.firebaseService) {
    try {
      await window.firebaseService.init();
    } catch (error) {
      console.error("❌ Firebase initialization failed:", error);
    }
  }
  const rawFirstName =
    localStorage.getItem("userFirstName") ||
    (localStorage.getItem("userName") || "").split(" ")[0] ||
    "User";
  const formattedFirstName = String(rawFirstName).toLowerCase();
  const firstName =
    formattedFirstName.charAt(0).toUpperCase() + formattedFirstName.slice(1);
  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent = firstName;
  }
  loadWalletInfo();
  setTimeout(async () => {
    await loadRecentTransactions();
    const walletAddress = localStorage.getItem("walletAddress");
    if (
      walletAddress &&
      window.firebaseService &&
      window.firebaseService.initialized
    ) {
      window.firebaseService.subscribeToTransactions(walletAddress, () => {
        loadRecentTransactions();
      });
    }
  }, 1000);
});

window.addEventListener("beforeunload", () => {
  if (window.firebaseService) {
    window.firebaseService.unsubscribeFromTransactions();
  }
});

const WEB3AUTH_CLIENT_ID =
  "BHN8je-BBHtAlgc6EtNp1d3PBRzpFGC6bGWGMagVQlZOHX56wmXkjmc2dxBanaXNcVitiVHx4F9VBjJpbPyPYgs";
let web3auth = null;
let provider = null;
async function initWeb3AuthOnDashboard() {
  try {
    let attempts = 0;
    while (attempts < 20) {
      if (window.Modal?.Web3Auth || window.Web3auth?.Web3Auth) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
    let Web3Auth, CHAIN_NAMESPACES;
    if (window.Modal?.Web3Auth) {
      Web3Auth = window.Modal.Web3Auth;
      CHAIN_NAMESPACES = window.Modal.CHAIN_NAMESPACES;
    } else if (window.Web3auth?.Web3Auth) {
      Web3Auth = window.Web3auth.Web3Auth;
      CHAIN_NAMESPACES =
        window.Web3authBase?.CHAIN_NAMESPACES ||
        window.Web3auth.CHAIN_NAMESPACES;
    } else {
      console.error("Web3Auth libraries not loaded");
      return;
    }
    const chainConfig = {
      chainNamespace: "eip155",
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology",
      displayName: "Polygon Amoy Testnet",
      blockExplorer: "https://amoy.polygonscan.com/",
      ticker: "POL",
      tickerName: "Polygon",
    };
    const privateKeyProvider =
      new window.EthereumProvider.EthereumPrivateKeyProvider({
        config: { chainConfig },
      });
    web3auth = new Web3Auth({
      clientId: WEB3AUTH_CLIENT_ID,
      web3AuthNetwork: "sapphire_devnet",
      privateKeyProvider: privateKeyProvider,
      chainConfig: chainConfig,
      sessionTime: 86400 * 7,
      uiConfig: {
        appName: "FlowPay",
        mode: "light",
      },
    });
    await web3auth.initModal();
    if (web3auth.connected) {
      provider = web3auth.provider;
      await loadUserWallet();
      await verifyWalletConsistency();
    }
  } catch (error) {
    console.error("Error initializing Web3Auth:", error);
  }
}
async function getUserAddress() {
  if (!web3auth || !web3auth.connected) {
    return null;
  }
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    return accounts[0];
  } catch (error) {
    console.error("Error getting address:", error);
    return null;
  }
}
async function getBalance() {
  if (!web3auth || !web3auth.connected) {
    return 0;
  }
  try {
    const address = await getUserAddress();
    if (!address) return 0;
    const balance = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    return parseInt(balance, 16) / 1e18;
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
}
async function sendPOL(to, amount) {
  if (!web3auth || !web3auth.connected) {
    console.error("Web3Auth not connected");
    throw new Error("Please connect your wallet first");
  }
  try {
    const fromAddress = await getUserAddress();
    const valueInWei = Math.floor(amount * 1e18);
    const valueHex = "0x" + valueInWei.toString(16);
    const tx = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: fromAddress,
          to: to,
          value: valueHex,
          gas: "0x5208",
        },
      ],
    });
    return tx;
  } catch (error) {
    console.error("❌ Error sending transaction:", error);
    throw error;
  }
}
async function logout() {
  try {
    if (web3auth && web3auth.connected) {
      await web3auth.logout();
    }
    localStorage.clear();
    window.location.href = "index.html";
  } catch (error) {
    console.error("❌ Error during logout:", error);
    localStorage.clear();
    window.location.href = "index.html";
  }
}

window.getUserAddress = getUserAddress;
window.getBalance = getBalance;
window.sendPOL = sendPOL;
window.logout = logout;

async function verifyWalletConsistency() {
  try {
    const userEmail = localStorage.getItem("userEmail");
    const currentWallet = localStorage.getItem("walletAddress");
    const expectedWallet = localStorage.getItem(`wallet_${userEmail}`);
    const loginMethod = localStorage.getItem("loginMethod");
    if (!userEmail || !currentWallet) {
      return true;
    }
    if (!expectedWallet) {
      return true;
    }
    if (currentWallet.toLowerCase() !== expectedWallet.toLowerCase()) {
      console.error("❌ WALLET MISMATCH DETECTED!");
      const warningBanner = document.createElement("div");
      warningBanner.className =
        "fixed top-16 left-0 right-0 bg-yellow-500 text-white px-4 py-3 shadow-lg z-40";
      warningBanner.innerHTML = `
                        <div class="max-w-7xl mx-auto flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-exclamation-triangle text-xl"></i>
                                <div>
                                    <p class="font-semibold">Wallet Address Changed</p>
                                    <p class="text-sm">You're using a different wallet than before. This may affect your transaction history.</p>
                                </div>
                            </div>
                            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    `;
      document.body.insertBefore(warningBanner, document.body.firstChild);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verifying wallet consistency:", error);
    return true;
  }
}
async function loadUserWallet() {
  try {
    const address = await getUserAddress();
    if (address) {
      const walletAddressElement = document.getElementById("walletAddress");
      if (walletAddressElement) {
        const shortAddress = address.slice(0, 6) + "..." + address.slice(-4);
        walletAddressElement.innerText = shortAddress;
        walletAddressElement.title = address;
      }
      const balance = await getBalance();
      const balanceElement = document.getElementById("maticBalance");
      if (balanceElement) {
        balanceElement.innerText = balance.toFixed(4);
      }
      try {
        const response = await fetch(
          "https://min-api.cryptocompare.com/data/price?fsym=POL&tsyms=USD"
        );
        const data = await response.json();
        const usdRate = data.USD || 0.56;
        const usdBalance = (balance * usdRate).toFixed(2);
        const usdBalanceElement = document.getElementById("usdBalance");
        if (usdBalanceElement) {
          usdBalanceElement.textContent = `≈ $${usdBalance} USD`;
        }
      } catch (error) {
        console.warn("Failed to fetch live rate, using fallback");
        const usdRate = 0.56;
        const usdBalance = (balance * usdRate).toFixed(2);
        const usdBalanceElement = document.getElementById("usdBalance");
        if (usdBalanceElement) {
          usdBalanceElement.textContent = `≈ $${usdBalance} USD`;
        }
      }
      const connectedView = document.getElementById("walletConnectedView");
      const notConnectedView = document.getElementById(
        "walletNotConnectedView"
      );
      if (connectedView) connectedView.style.display = "block";
      if (notConnectedView) notConnectedView.style.display = "none";
      localStorage.setItem("walletAddress", address);
      if (window.loadRecentTransactions) {
        setTimeout(() => window.loadRecentTransactions(), 500);
      }
    } else {
      console.warn("Web3Auth connected but no address found");
      const connectedView = document.getElementById("walletConnectedView");
      const notConnectedView = document.getElementById(
        "walletNotConnectedView"
      );
      if (connectedView) connectedView.style.display = "none";
      if (notConnectedView) notConnectedView.style.display = "block";
    }
  } catch (error) {
    console.error("Error loading user wallet:", error);
  }
}
const loginMethod = localStorage.getItem("loginMethod");
if (loginMethod === "web3auth") {
  setTimeout(initWeb3AuthOnDashboard, 500);
} else {
  const storedAddress = localStorage.getItem("walletAddress");
  if (storedAddress) {
    const walletAddressElement = document.getElementById("walletAddress");
    if (walletAddressElement) {
      const shortAddress =
        storedAddress.slice(0, 6) + "..." + storedAddress.slice(-4);
      walletAddressElement.innerText = shortAddress;
      walletAddressElement.title = storedAddress;
    }
    const connectedView = document.getElementById("walletConnectedView");
    const notConnectedView = document.getElementById("walletNotConnectedView");
    if (connectedView) connectedView.style.display = "block";
    if (notConnectedView) notConnectedView.style.display = "none";
  } else {
    const connectedView = document.getElementById("walletConnectedView");
    const notConnectedView = document.getElementById("walletNotConnectedView");
    if (connectedView) connectedView.style.display = "none";
    if (notConnectedView) notConnectedView.style.display = "block";
  }
}
async function refreshBalance() {
  const refreshIcon = document.getElementById("refreshIcon");
  if (refreshIcon) {
    refreshIcon.classList.add("fa-spin");
  }
  try {
    const loginMethod = localStorage.getItem("loginMethod");
    if (loginMethod === "web3auth" && web3auth && web3auth.connected) {
      const balance = await getBalance();
      const balanceElement = document.getElementById("maticBalance");
      if (balanceElement) {
        balanceElement.innerText = parseFloat(balance).toFixed(4);
      }
      const usdRate = 0.68;
      const usdBalance = (balance * usdRate).toFixed(2);
      const usdBalanceElement = document.getElementById("usdBalance");
      if (usdBalanceElement) {
        usdBalanceElement.textContent = `≈ $${usdBalance} USD`;
      }
      localStorage.setItem("walletBalance", balance);
    } else if (loginMethod === "metamask") {
      const walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress && typeof window.ethereum !== "undefined") {
        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [walletAddress, "latest"],
        });
        const balanceInPol = parseInt(balance, 16) / Math.pow(10, 18);
        const balanceElement = document.getElementById("maticBalance");
        if (balanceElement) {
          balanceElement.textContent = balanceInPol.toFixed(4);
        }
        const usdRate = 0.68;
        const usdBalance = (balanceInPol * usdRate).toFixed(2);
        const usdBalanceElement = document.getElementById("usdBalance");
        if (usdBalanceElement) {
          usdBalanceElement.textContent = `≈ $${usdBalance} USD`;
        }
      }
    }
  } catch (error) {
    console.error("❌ Error refreshing balance:", error);
  } finally {
    if (refreshIcon) {
      setTimeout(() => {
        refreshIcon.classList.remove("fa-spin");
      }, 500);
    }
  }
}
window.refreshBalance = refreshBalance;
setInterval(refreshBalance, 30000);
