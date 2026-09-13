"use strict";

let web3auth = null;

function checkAuth() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (isAuthenticated !== "true") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

async function initWeb3AuthOnReceive() {
  try {
    const loginMethod = localStorage.getItem("loginMethod");

    if (loginMethod !== "web3auth") {
      return;
    }

    const { Web3Auth } = window.Modal;
    const { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } = window.Web3authBase;
    const { EthereumPrivateKeyProvider } = window.EthereumProvider;

    const clientId =
      "BHN8je-BBHtAlgc6EtNp1d3PBRzpFGC6bGWGMagVQlZOHX56wmXkjmc2dxBanaXNcVitiVHx4F9VBjJpbPyPYgs";

    const chainConfig = {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology",
      displayName: "Polygon Amoy Testnet",
      blockExplorerUrl: "https://amoy.polygonscan.com",
      ticker: "POL",
      tickerName: "Polygon",
    };

    const privateKeyProvider = new EthereumPrivateKeyProvider({
      config: { chainConfig },
    });

    web3auth = new Web3Auth({
      clientId,
      web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      privateKeyProvider: privateKeyProvider,
      sessionTime: 604800,
      uiConfig: {
        appName: "FlowPay",
        theme: {
          primary: "#7C3AED",
        },
        loginMethodsOrder: ["google"],
        defaultLanguage: "en",
      },
    });

    await web3auth.initModal({
      modalConfig: {
        [window.Web3authBase.WALLET_ADAPTERS.OPENLOGIN]: {
          label: "openlogin",
          loginMethods: {
            google: {
              name: "google",
              showOnModal: true,
            },
          },
          showOnModal: true,
        },
      },
    });

    if (web3auth.connected) {
      await displayWalletInfo();
    } else {
      const walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress) {
        displayWalletAddress(walletAddress);
      }
    }
  } catch (error) {
    console.error("Web3Auth initialization error:", error);
  }
}

async function getUserAddress() {
  if (!web3auth || !web3auth.connected) {
    const stored = localStorage.getItem("walletAddress");
    if (stored) return stored;
    throw new Error("Web3Auth not connected");
  }

  const provider = new ethers.providers.Web3Provider(await web3auth.provider);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  return address;
}

async function displayWalletInfo() {
  try {
    const address = await getUserAddress();
    displayWalletAddress(address);
  } catch (error) {
    console.error("Failed to get wallet address:", error);
    const stored = localStorage.getItem("walletAddress");
    if (stored) {
      displayWalletAddress(stored);
    }
  }
}

function displayWalletAddress(address) {
  const addressElement = document.getElementById("walletAddress");
  if (addressElement) {
    addressElement.textContent = address;
  }

  generatePaymentLink();

  const amount = document.getElementById("requestAmount")?.value;
  const currency = document.getElementById("requestCurrency")?.value || "POL";
  const baseUrl = CONFIG.app.url;
  let link;
  if (amount && parseFloat(amount) > 0) {
    link = `${baseUrl}/send.html?to=${address}&amount=${amount}&currency=${currency}`;
  } else {
    link = `${baseUrl}/send.html?to=${address}`;
  }

  generateQRCode(link);
}

function generateQRCode(data) {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  qrContainer.innerHTML = "";

  if (typeof QRCode !== "undefined") {
    try {
      new QRCode(qrContainer, {
        text: data,
        width: 192,
        height: 192,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (error) {
      console.error("QRCode generation error:", error);
      generateFallbackQR(qrContainer, data);
    }
  } else {
    generateFallbackQR(qrContainer, data);
  }
}

function generateFallbackQR(container, data) {
  const qrSize = 192;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${qrSize} ${qrSize}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", qrSize);
  bg.setAttribute("height", qrSize);
  bg.setAttribute("fill", "white");
  svg.appendChild(bg);

  const patterns = [
    { x: 10, y: 10, w: 50, h: 50 },
    { x: 132, y: 10, w: 50, h: 50 },
    { x: 10, y: 132, w: 50, h: 50 },
  ];

  patterns.forEach((p) => {
    const outer = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    outer.setAttribute("x", p.x);
    outer.setAttribute("y", p.y);
    outer.setAttribute("width", p.w);
    outer.setAttribute("height", p.h);
    outer.setAttribute("fill", "black");
    svg.appendChild(outer);

    const inner = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    inner.setAttribute("x", p.x + 10);
    inner.setAttribute("y", p.y + 10);
    inner.setAttribute("width", p.w - 20);
    inner.setAttribute("height", p.h - 20);
    inner.setAttribute("fill", "white");
    svg.appendChild(inner);
  });

  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      if (
        Math.random() > 0.5 &&
        !(i < 8 && j < 8) &&
        !(i > 13 && j < 8) &&
        !(i < 8 && j > 13)
      ) {
        const pixel = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        pixel.setAttribute("x", i * 9 + 2);
        pixel.setAttribute("y", j * 9 + 2);
        pixel.setAttribute("width", 8);
        pixel.setAttribute("height", 8);
        pixel.setAttribute("fill", "black");
        svg.appendChild(pixel);
      }
    }
  }

  container.appendChild(svg);
}

function checkWalletConnection() {
  const authMethod = localStorage.getItem("authMethod");
  const walletAddress = localStorage.getItem("walletAddress");

  if (authMethod === "google" && !walletAddress) {
    showWalletConnectionPrompt();
    return false;
  }
  return true;
}

function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "index.html";
  }
}

async function logout() {
  const loginMethod = localStorage.getItem("loginMethod");
  if (loginMethod === "web3auth" && web3auth && web3auth.connected) {
    try {
      await web3auth.logout();
    } catch (error) {
      console.error("Web3Auth logout error:", error);
    }
  }
  localStorage.clear();
  window.location.href = "index.html";
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

const mockIncomingPayments = [
  {
    from: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    amount: 25.5,
    status: "success",
    date: "2024-11-13T10:30:00",
    hash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
  },
  {
    from: "0x5e7d9f2a4c6b8e1d3f5a7c9b2e4d6f8a1c3b5e7d",
    amount: 15.75,
    status: "pending",
    date: "2024-11-13T14:20:00",
    hash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e",
  },
  {
    from: "0x3c4e8d2f1a9b6c5e7d4f2a8b9c6e5d7f4a2b8c9e",
    amount: 50.0,
    status: "success",
    date: "2024-11-12T09:15:00",
    hash: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f",
  },
];

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function copyAddress() {
  const address = document.getElementById("walletAddress").textContent;
  navigator.clipboard
    .writeText(address)
    .then(() => {
      showNotification("Address copied to clipboard!", "success");
    })
    .catch(() => {
      showNotification("Failed to copy address", "error");
    });
}

function downloadQR() {
  showNotification("QR code download started!", "success");
  setTimeout(() => {
    showNotification("QR code saved to downloads", "info");
  }, 1000);
}

function generatePaymentLink() {
  const walletAddress = localStorage.getItem("walletAddress");
  if (!walletAddress) {
    document.getElementById("paymentLink").textContent = "Loading...";
    return;
  }

  const amount = document.getElementById("requestAmount")?.value;
  const currency = document.getElementById("requestCurrency")?.value || "POL";
  const addressShort = ValidationService.formatAddress(walletAddress);
  const baseUrl = CONFIG.app.url.replace(/^https?:\/\//, "");

  let link;
  if (amount && parseFloat(amount) > 0) {
    link = `${baseUrl}/send.html?to=${walletAddress}&amount=${amount}&currency=${currency}`;
  } else {
    link = `${baseUrl}/send.html?to=${walletAddress}`;
  }

  const linkElement = document.getElementById("paymentLink");
  if (linkElement) {
    linkElement.textContent = link;
  }
}

function copyPaymentLink() {
  const linkElement = document.getElementById("paymentLink");
  if (!linkElement) return;

  const link = linkElement.textContent;
  const walletAddress = localStorage.getItem("walletAddress");

  if (!walletAddress || link === "Loading...") {
    showNotification("Please wait for wallet to load", "warning");
    return;
  }

  const fullLink = `https://${link}`;

  navigator.clipboard
    .writeText(fullLink)
    .then(() => {
      showNotification("Payment link copied!", "success");
    })
    .catch(() => {
      showNotification("Failed to copy link", "error");
    });
}

function sharePaymentLink() {
  const walletAddress = localStorage.getItem("walletAddress");
  if (!walletAddress) {
    showNotification("Wallet address not available", "error");
    return;
  }

  const amount = document.getElementById("requestAmount")?.value;
  const currency = document.getElementById("requestCurrency")?.value || "POL";

  let fullLink = `https://teamflowpay.vercel.app/send.html?to=${walletAddress}`;
  if (amount && parseFloat(amount) > 0) {
    fullLink += `&amount=${amount}&currency=${currency}`;
  }

  if (navigator.share) {
    navigator
      .share({
        title: "FlowPay Payment Request",
        text: "Send me crypto payment via FlowPay",
        url: fullLink,
      })
      .then(() => {
        showNotification("Link shared successfully!", "success");
      })
      .catch(() => {
        copyPaymentLink();
      });
  } else {
    copyPaymentLink();
  }
}

function shareVia(platform) {
  const walletAddress = localStorage.getItem("walletAddress");
  if (!walletAddress) {
    showNotification("Wallet address not available", "error");
    return;
  }

  const amount = document.getElementById("requestAmount")?.value;
  const currency = document.getElementById("requestCurrency")?.value || "POL";

  let paymentUrl = `https://teamflowpay.vercel.app/send.html?to=${walletAddress}`;
  if (amount && parseFloat(amount) > 0) {
    paymentUrl += `&amount=${amount}&currency=${currency}`;
  }

  let message = `Send me payment via FlowPay: ${paymentUrl}`;

  if (amount && parseFloat(amount) > 0) {
    message += `\nAmount: ${amount} ${currency}`;
  }

  let url;
  switch (platform) {
    case "whatsapp":
      url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      break;
    case "telegram":
      url = `https://t.me/share/url?url=${encodeURIComponent(message)}`;
      break;
    case "email":
      url = `mailto:?subject=FlowPay Payment Request&body=${encodeURIComponent(
        message
      )}`;
      break;
  }

  if (url) {
    window.open(url, "_blank");
    showNotification(`Opening ${platform}...`, "info");
  }
}

async function refreshPayments() {
  showNotification("Refreshing payment history...", "info");
  await loadIncomingPayments();
}

async function loadIncomingPayments() {
  const container = document.getElementById("incomingPayments");
  if (!container) return;

  const walletAddress = localStorage.getItem("walletAddress");

  if (!walletAddress) {
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center py-4">Wallet not connected</p>';
    return;
  }

  try {
    let transactions = [];

    if (window.firebaseService && window.firebaseService.initialized) {
      transactions = await window.firebaseService.getTransactions(
        walletAddress
      );
    } else {
      transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    }

    const incomingTxs = transactions
      .filter((tx) => tx.type === "received")
      .slice(0, 5);

    if (incomingTxs.length === 0) {
      container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                    <p class="text-sm text-gray-500 dark:text-gray-400">No incoming payments yet</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Share your QR code to receive payments</p>
                </div>
            `;
      return;
    }

    container.innerHTML = incomingTxs
      .map((payment) => {
        const addressShort = ValidationService.formatAddress(payment.address);
        const statusClass =
          payment.status === "success"
            ? "text-green-600 dark:text-green-400"
            : "text-yellow-600 dark:text-yellow-400";
        const statusIcon =
          payment.status === "success" ? "fa-check-circle" : "fa-clock";
        const timeAgo = DateService.getRelativeTime(payment.date);

        return `
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer" onclick="viewTransaction('${payment.hash}')">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <i class="fas fa-arrow-down text-green-600 dark:text-green-400"></i>
                        </div>
                        <div>
                            <p class="font-medium text-gray-900 dark:text-gray-100">Received</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400 font-mono">${addressShort}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-gray-900 dark:text-gray-100">+${payment.amount} ${payment.currency}</p>
                        <div class="flex items-center gap-1 justify-end mt-1">
                            <i class="fas ${statusIcon} ${statusClass} text-xs"></i>
                            <p class="text-xs ${statusClass}">${timeAgo}</p>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading incoming payments:", error);
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center py-4">Error loading transactions</p>';
  }
}

function viewTransaction(hash) {
  const url = `https://amoy.polygonscan.com/tx/${hash}`;
  window.open(url, "_blank");
}

function copyAddress() {
  const addressElement = document.getElementById("walletAddress");
  if (!addressElement) return;

  const address = addressElement.textContent;

  if (!address || address === "Loading...") {
    showNotification("Please wait for wallet to load", "warning");
    return;
  }

  navigator.clipboard
    .writeText(address)
    .then(() => {
      showNotification("Address copied to clipboard!", "success");
    })
    .catch(() => {
      showNotification("Failed to copy address", "error");
    });
}

function downloadQR() {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  try {
    const canvas = qrContainer.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = "flowpay-qr-code.png";
      link.href = canvas.toDataURL();
      link.click();
      showNotification("QR code downloaded!", "success");
    } else {
      showNotification("QR code generation in progress...", "info");
    }
  } catch (error) {
    console.error("Download error:", error);
    showNotification("Download failed. Please try again.", "error");
  }
}

async function logout() {
  const loginMethod = localStorage.getItem("loginMethod");

  if (loginMethod === "web3auth" && web3auth && web3auth.connected) {
    try {
      await web3auth.logout();
    } catch (error) {
      console.error("Web3Auth logout error:", error);
    }
  }

  localStorage.clear();
  sessionStorage.clear();
  showNotification("Logged out successfully", "success");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
}

function toggleProfileMenu() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
  }
}

function showWalletConnectionPrompt() {
  const modal = document.createElement("div");
  modal.id = "walletConnectionModal";
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Connect Your Wallet</h3>
                <p class="text-gray-600 dark:text-gray-400">To receive payments, please connect your MetaMask wallet</p>
            </div>
            <button onclick="connectMetaMaskFromPage()" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-6 py-4 font-medium flex items-center justify-center gap-3 hover:shadow-lg transition-all mb-3">
                <svg class="w-6 h-6" viewBox="0 0 40 40" fill="none">
                    <path d="M33.76 5.25L21.5 14.25L23.75 9.25L33.76 5.25Z" fill="#E17726"/>
                    <path d="M6.24 5.25L18.38 14.33L16.25 9.25L6.24 5.25Z" fill="#E27625"/>
                    <path d="M29.01 28.5L26.13 33L33.13 34.88L35.05 28.63L29.01 28.5Z" fill="#E27625"/>
                    <path d="M4.96 28.63L6.87 34.88L13.87 33L10.99 28.5L4.96 28.63Z" fill="#E27625"/>
                </svg>
                <span>Connect MetaMask</span>
            </button>
            <button onclick="closeWalletPrompt()" class="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2">
                Go Back to Dashboard
            </button>
        </div>
    `;
  document.body.appendChild(modal);
}

async function connectMetaMaskFromPage() {
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

  try {
    if (window.firebaseService) {
      await window.firebaseService.init();
    }
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
  }

  await initWeb3AuthOnReceive();

  if (!checkWalletConnection()) {
    return;
  }

  const walletAddress = localStorage.getItem("walletAddress");
  if (walletAddress) {
    displayWalletAddress(walletAddress);
    await loadIncomingPayments();

    if (window.firebaseService && window.firebaseService.initialized) {
      window.firebaseService.subscribeToTransactions(walletAddress, () => {
        loadIncomingPayments();
      });
    }
  } else {
    console.warn("No wallet address found");
  }

  const amountInput = document.getElementById("requestAmount");
  const currencySelect = document.getElementById("requestCurrency");

  if (amountInput) {
    amountInput.addEventListener("input", () => {
      generatePaymentLink();
      const walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress) {
        const amount = amountInput.value;
        const currency = currencySelect?.value || "POL";
        const baseUrl = CONFIG.app.url;
        let link;
        if (amount && parseFloat(amount) > 0) {
          link = `${baseUrl}/send.html?to=${walletAddress}&amount=${amount}&currency=${currency}`;
        } else {
          link = `${baseUrl}/send.html?to=${walletAddress}`;
        }
        generateQRCode(link);
      }
    });
  }

  if (currencySelect) {
    currencySelect.addEventListener("change", () => {
      generatePaymentLink();
      const walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress) {
        const amount = amountInput?.value;
        const currency = currencySelect.value;
        const baseUrl = CONFIG.app.url;
        let link;
        if (amount && parseFloat(amount) > 0) {
          link = `${baseUrl}/send.html?to=${walletAddress}&amount=${amount}&currency=${currency}`;
        } else {
          link = `${baseUrl}/send.html?to=${walletAddress}`;
        }
        generateQRCode(link);
      }
    });
  }
});

window.addEventListener("beforeunload", () => {
  if (window.firebaseService) {
    window.firebaseService.unsubscribeFromTransactions();
  }
});
