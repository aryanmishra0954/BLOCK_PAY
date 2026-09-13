const urlParams = new URLSearchParams(window.location.search);
const urlRecipient = urlParams.get("to");
const urlAmount = urlParams.get("amount");
const urlCurrency = urlParams.get("currency");

if (urlRecipient || urlAmount || urlCurrency) {
  const paymentRequest = {
    to: urlRecipient,
    amount: urlAmount,
    currency: urlCurrency,
    timestamp: Date.now(),
  };
  localStorage.setItem("pendingPaymentRequest", JSON.stringify(paymentRequest));
}

let currentTxHash = "";
let userBalance = 0;
let currentGasFee = 0.0023;
const POLYGON_RPC = "https://rpc-amoy.polygon.technology";

function checkAuth() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (isAuthenticated !== "true") {
    window.location.href = "index.html";
    return false;
  }
  return true;
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
  if (
    loginMethod === "web3auth" &&
    typeof web3auth !== "undefined" &&
    web3auth &&
    web3auth.connected
  ) {
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

let exchangeRates = {
  POL: 1,
  USD: 0.56,
  EUR: 0.52,
  INR: 12.5,
};

let lastRateUpdate = null;

async function fetchLiveRates() {
  try {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd,eur,inr&include_last_updated_at=true",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data["matic-network"]) {
          exchangeRates.USD = data["matic-network"].usd || exchangeRates.USD;
          exchangeRates.EUR = data["matic-network"].eur || exchangeRates.EUR;
          exchangeRates.INR = data["matic-network"].inr || exchangeRates.INR;
          lastRateUpdate = new Date();
          const amount = document.getElementById("amount")?.value;
          if (amount) {
            updateConversion();
          }
          return true;
        }
      }
    } catch (cgError) {}
    try {
      const ccResponse = await fetch(
        "https://min-api.cryptocompare.com/data/price?fsym=MATIC&tsyms=USD,EUR,INR"
      );
      if (ccResponse.ok) {
        const ccData = await ccResponse.json();
        if (ccData.USD) {
          exchangeRates.USD = ccData.USD || exchangeRates.USD;
          exchangeRates.EUR = ccData.EUR || exchangeRates.EUR;
          exchangeRates.INR = ccData.INR || exchangeRates.INR;
          lastRateUpdate = new Date();
          const amount = document.getElementById("amount")?.value;
          if (amount) {
            updateConversion();
          }
          return true;
        }
      }
    } catch (ccError) {}
    return false;
  } catch (error) {
    console.error("❌ Error fetching live rates:", error);
    return false;
  }
}

async function fetchRealTimeGasFee() {
  try {
    const gasLoadingIcon = document.getElementById("gasLoadingIcon");
    if (gasLoadingIcon) {
      gasLoadingIcon.classList.add("fa-spin");
    }
    try {
      const gasStationResponse = await fetch(
        "https://gasstation.polygon.technology/v2"
      );
      const gasData = await gasStationResponse.json();
      if (gasData.fast && gasData.fast.maxFee) {
        const gasPriceGwei = gasData.fast.maxFee;
        const gasPriceWei = gasPriceGwei * 1e9;
        const gasLimit = 21000;
        const totalGasWei = gasPriceWei * gasLimit;
        const gasFeeInPol = totalGasWei / 1e18;
        currentGasFee = gasFeeInPol;
        updateConversion();
        if (gasLoadingIcon) {
          setTimeout(() => gasLoadingIcon.classList.remove("fa-spin"), 500);
        }
        return true;
      }
    } catch (apiError) {}
    const response = await fetch(POLYGON_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result) {
      const gasPriceWei = parseInt(data.result, 16);
      const adjustedGasPriceWei = gasPriceWei * 1.2;
      const gasLimit = 21000;
      const totalGasWei = adjustedGasPriceWei * gasLimit;
      const gasFeeInPol = totalGasWei / 1e18;
      currentGasFee = gasFeeInPol;
      updateConversion();
      if (gasLoadingIcon) {
        setTimeout(() => gasLoadingIcon.classList.remove("fa-spin"), 500);
      }
      return true;
    } else {
      if (gasLoadingIcon) {
        gasLoadingIcon.classList.remove("fa-spin");
      }
      return false;
    }
  } catch (error) {
    console.error("❌ Error fetching gas price:", error);
    const gasLoadingIcon = document.getElementById("gasLoadingIcon");
    if (gasLoadingIcon) {
      gasLoadingIcon.classList.remove("fa-spin");
    }
    return false;
  }
}

async function pasteAddress() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById("receiverAddress").value = text;
    showNotification("Address pasted!", "success");
  } catch (err) {
    showNotification("Failed to paste from clipboard", "error");
  }
}

function setMaxAmount() {
  const gasFee = currentGasFee;
  const maxAmount = Math.max(0, userBalance - gasFee);
  document.getElementById("amount").value = maxAmount.toFixed(4);
  updateConversion();
}

function updateConversion() {
  const amount = parseFloat(document.getElementById("amount").value) || 0;
  const currency = document.getElementById("currency").value;
  let polAmount, convertedAmount, toCurrency, displayRate;
  const usdRate = exchangeRates.USD || 0.68;
  const eurRate = exchangeRates.EUR || 0.62;
  const inrRate = exchangeRates.INR || 56.8;
  if (currency === "POL") {
    polAmount = amount;
    convertedAmount = (amount * usdRate).toFixed(2);
    toCurrency = "USD";
    displayRate = usdRate;
  } else if (currency === "USD") {
    polAmount = (amount / usdRate).toFixed(4);
    convertedAmount = polAmount;
    toCurrency = "POL";
    displayRate = 1 / usdRate;
  } else if (currency === "EUR") {
    polAmount = (amount / eurRate).toFixed(4);
    convertedAmount = polAmount;
    toCurrency = "POL";
    displayRate = 1 / eurRate;
  } else if (currency === "INR") {
    polAmount = (amount / inrRate).toFixed(4);
    convertedAmount = polAmount;
    toCurrency = "POL";
    displayRate = 1 / inrRate;
  }
  const fromAmountEl = document.getElementById("fromAmount");
  const fromCurrencyEl = document.getElementById("fromCurrency");
  const toAmountEl = document.getElementById("toAmount");
  const toCurrencyEl = document.getElementById("toCurrency");
  if (fromAmountEl) fromAmountEl.textContent = amount.toFixed(2);
  if (fromCurrencyEl) fromCurrencyEl.textContent = currency;
  if (toAmountEl) toAmountEl.textContent = convertedAmount;
  if (toCurrencyEl) toCurrencyEl.textContent = toCurrency;
  const rateElement = document.getElementById("exchangeRate");
  const rateCurrencyElement = document.getElementById("rateCurrency");
  const rateFromCurrencyElement = document.getElementById("rateFromCurrency");
  if (rateElement && rateCurrencyElement && rateFromCurrencyElement) {
    if (currency === "POL") {
      rateFromCurrencyElement.textContent = "POL";
      rateElement.textContent = displayRate.toFixed(4);
      rateCurrencyElement.textContent = toCurrency;
    } else {
      rateFromCurrencyElement.textContent = currency;
      rateElement.textContent = displayRate.toFixed(6);
      rateCurrencyElement.textContent = "POL";
    }
  }
  const gasFeeUsd = currentGasFee * usdRate;
  const gasFeeEl = document.getElementById("gasFee");
  const gasFeeUsdEl = document.getElementById("gasFeeUsd");
  if (gasFeeEl) gasFeeEl.textContent = `${currentGasFee.toFixed(4)} POL`;
  if (gasFeeUsdEl) gasFeeUsdEl.textContent = `≈ $${gasFeeUsd.toFixed(3)}`;
  const totalPol =
    parseFloat(currency === "POL" ? amount : polAmount) + currentGasFee;
  const totalUsd = totalPol * usdRate;
  const totalAmountEl = document.getElementById("totalAmount");
  const totalUsdEl = document.getElementById("totalUsd");
  if (totalAmountEl) totalAmountEl.textContent = `${totalPol.toFixed(4)} POL`;
  if (totalUsdEl) totalUsdEl.textContent = `≈ $${totalUsd.toFixed(2)}`;
  const previewAmountEl = document.getElementById("previewAmount");
  if (previewAmountEl)
    previewAmountEl.textContent = `${amount.toFixed(4)} ${currency}`;
}

async function loadRecentRecipients() {
  const walletAddress = localStorage.getItem("walletAddress");
  const container = document.getElementById("recentRecipientsList");
  if (!container) return;
  if (
    !walletAddress ||
    !window.firebaseService ||
    !window.firebaseService.initialized
  ) {
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center py-4">No recent recipients</p>';
    return;
  }
  try {
    const transactions = await window.firebaseService.getTransactions(
      walletAddress
    );
    const sentTxs = transactions.filter((tx) => tx.type === "sent");
    if (sentTxs.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-gray-500 text-center py-4">No recent recipients</p>';
      return;
    }
    const recipientsMap = new Map();
    sentTxs.forEach((tx) => {
      if (!recipientsMap.has(tx.address)) {
        recipientsMap.set(tx.address, {
          address: tx.address,
          lastSent: new Date(tx.date),
          amount: tx.amount,
          currency: tx.currency,
        });
      }
    });
    const recipients = Array.from(recipientsMap.values())
      .sort((a, b) => b.lastSent - a.lastSent)
      .slice(0, 5);
    container.innerHTML = recipients
      .map((recipient) => {
        const addressShort =
          recipient.address.slice(0, 6) + "..." + recipient.address.slice(-4);
        const timeAgo = getTimeAgo(recipient.lastSent);
        return `
                <button onclick="selectRecipient('${recipient.address}')" 
                        class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                    <p class="font-mono text-xs text-gray-900">${addressShort}</p>
                    <p class="text-xs text-gray-500">Last sent ${timeAgo}</p>
                </button>
            `;
      })
      .join("");
  } catch (error) {
    console.error("❌ Error loading recent recipients:", error);
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center py-4">No recent recipients</p>';
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths > 0)
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "Just now";
}

function selectRecipient(address) {
  document.getElementById("receiverAddress").value = address;
  const addressShort = address.slice(0, 6) + "..." + address.slice(-4);
  document.getElementById("previewTo").textContent = addressShort;
  showNotification("Recipient selected!", "success");
}

async function handleSendTransaction(event) {
  event.preventDefault();
  const receiverAddress = document.getElementById("receiverAddress").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  if (!receiverAddress || !amount) {
    showNotification("Please fill all required fields", "error");
    return;
  }
  if (!receiverAddress.startsWith("0x") || receiverAddress.length !== 42) {
    showNotification("Invalid wallet address", "error");
    return;
  }
  if (amount <= 0) {
    showNotification("Amount must be greater than 0", "error");
    return;
  }
  const gasFee = currentGasFee;
  let requiredAmount = amount;
  if (currency !== "POL") {
    requiredAmount = amount / exchangeRates[currency];
  }
  if (requiredAmount + gasFee > userBalance) {
    showNotification(
      `Insufficient balance. You have ${userBalance.toFixed(4)} POL`,
      "error"
    );
    return;
  }
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
  submitBtn.disabled = true;
  try {
    const loginMethod = localStorage.getItem("loginMethod");
    if (loginMethod === "web3auth") {
      let polAmount = amount;
      if (currency !== "POL") {
        polAmount = amount / exchangeRates[currency];
      }
      const txHash = await sendPOL(receiverAddress, polAmount.toString());
      currentTxHash = txHash;
      document.getElementById("modalAmount").textContent = `${polAmount.toFixed(
        4
      )} POL`;
      document.getElementById("modalReceiver").textContent =
        receiverAddress.slice(0, 6) + "..." + receiverAddress.slice(-4);
      document.getElementById("txHash").textContent =
        txHash.slice(0, 10) + "..." + txHash.slice(-8);
      const polygonScanLink = document.getElementById("polygonScanLink");
      polygonScanLink.href = `https://amoy.polygonscan.com/tx/${txHash}`;
      document.getElementById("successModal").classList.remove("hidden");
      showNotification("Transaction sent successfully! 🎉", "success");
      saveTransaction({
        type: "sent",
        address: receiverAddress,
        amount: polAmount,
        currency: "POL",
        status: "success",
        hash: txHash,
        date: new Date().toISOString(),
      });
      event.target.reset();
      updateConversion();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    } else {
      setTimeout(() => {
        const txHash =
          "0x" +
          Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
        document.getElementById(
          "modalAmount"
        ).textContent = `${amount} ${currency}`;
        document.getElementById("modalReceiver").textContent =
          receiverAddress.slice(0, 6) + "..." + receiverAddress.slice(-4);
        document.getElementById("txHash").textContent =
          txHash.slice(0, 10) + "..." + txHash.slice(-8);
        const polygonScanLink = document.getElementById("polygonScanLink");
        polygonScanLink.href = `https://polygonscan.com/tx/${txHash}`;
        document.getElementById("successModal").classList.remove("hidden");
        event.target.reset();
        updateConversion();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        saveTransaction({
          type: "sent",
          address: receiverAddress,
          amount: amount,
          currency: currency,
          status: "success",
          hash: txHash,
          date: new Date().toISOString(),
        });
      }, 2000);
    }
  } catch (error) {
    console.error("Transaction error:", error);
    showNotification(error.message || "Transaction failed", "error");
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

function closeModal() {
  document.getElementById("successModal").classList.add("hidden");
}

function copyTxHash() {
  if (!currentTxHash) {
    showNotification("No transaction hash available", "error");
    return;
  }
  navigator.clipboard.writeText(currentTxHash).then(() => {
    showNotification("Transaction hash copied! 📋", "success");
  });
}

async function saveTransaction(transaction) {
  let transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
  transactions.unshift(transaction);
  localStorage.setItem("transactions", JSON.stringify(transactions));

  try {
    const senderAddress = localStorage.getItem("walletAddress");

    if (
      senderAddress &&
      window.firebaseService &&
      window.firebaseService.initialized
    ) {
      await window.firebaseService.saveTransaction(senderAddress, transaction);

      if (transaction.type === "sent" && transaction.address) {
        const receivedTransaction = {
          ...transaction,
          type: "received",
          address: senderAddress,
        };

        await window.firebaseService.saveTransaction(
          transaction.address,
          receivedTransaction
        );
      }
    }
  } catch (error) {
    console.error("❌ Error saving to Firebase:", error);
  }
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
  notification.className = `notification fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 transition-all`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.transform = "translateX(120%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
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
                <p class="text-gray-600">To send payments, please connect your MetaMask wallet</p>
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
            <button onclick="closeWalletPrompt()" class="w-full text-gray-600 hover:text-gray-800 font-medium py-2">
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
  window.location.href = "dashboard.html";
}

async function loadUserBalance() {
  try {
    const loginMethod = localStorage.getItem("loginMethod");
    if (loginMethod === "web3auth") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (typeof getBalance === "function") {
        const balance = await getBalance();
        userBalance = parseFloat(balance) || 0;
      } else {
        const storedBalance = localStorage.getItem("walletBalance");
        userBalance = storedBalance ? parseFloat(storedBalance) : 0;
      }
    } else {
      const storedBalance = localStorage.getItem("walletBalance");
      userBalance = storedBalance ? parseFloat(storedBalance) : 0;
    }
    updateBalanceDisplay();
  } catch (error) {
    console.error("❌ Error loading balance:", error);
    userBalance = 0;
    updateBalanceDisplay();
  }
}

function updateBalanceDisplay() {
  const balanceElements = document.querySelectorAll(
    ".user-balance, #availableBalance"
  );
  balanceElements.forEach((el, index) => {
    el.innerHTML = `Available: <span class="font-semibold">${userBalance.toFixed(
      4
    )} POL</span>`;
  });
  const availableBalance = document.getElementById("availableBalance");
  if (availableBalance) {
    availableBalance.innerHTML = `Available: <span class="font-semibold">${userBalance.toFixed(
      4
    )} POL</span>`;
  } else {
  }
}

function updateFromAddress() {
  const walletAddress = localStorage.getItem("walletAddress");
  if (walletAddress) {
    const shortAddress =
      walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
    const previewFromEl = document.getElementById("previewFrom");
    if (previewFromEl) {
      previewFromEl.textContent = shortAddress;
    } else {
    }
  } else {
  }
}

function updateToAddress(address) {
  const previewTo = document.getElementById("previewTo");
  if (!previewTo) {
    return;
  }
  if (address && address.trim().length >= 10) {
    const shortAddress = address.slice(0, 6) + "..." + address.slice(-4);
    previewTo.textContent = shortAddress;
  } else {
    previewTo.textContent = "Not set";
  }
}

async function loadSenderAddress() {
  const walletAddress = localStorage.getItem("walletAddress");
  const previewFromElement = document.getElementById("previewFrom");
  if (walletAddress && previewFromElement) {
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(
      -4
    )}`;
    previewFromElement.textContent = shortAddress;
    previewFromElement.innerText = shortAddress;
    previewFromElement.innerHTML = shortAddress;
  } else {
    console.error("❌ Missing:", {
      hasWallet: !!walletAddress,
      hasElement: !!previewFromElement,
    });
  }
}

function updateReceiverPreview() {
  const receiverInput = document.getElementById("receiverAddress");
  const previewToElement = document.getElementById("previewTo");
  if (receiverInput && previewToElement) {
    receiverInput.addEventListener("input", function () {
      const value = this.value.trim();
      if (value) {
        const shortAddress =
          value.length > 10
            ? `${value.slice(0, 6)}...${value.slice(-4)}`
            : value;
        previewToElement.textContent = shortAddress;
        previewToElement.innerText = shortAddress;
        previewToElement.innerHTML = shortAddress;
      } else {
        previewToElement.textContent = "Not set";
        previewToElement.innerText = "Not set";
        previewToElement.innerHTML = "Not set";
      }
    });
  } else {
    console.error("❌ Missing:", {
      hasInput: !!receiverInput,
      hasElement: !!previewToElement,
    });
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  if (!checkAuth()) return;
  if (!checkWalletConnection()) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const recipientFromUrl = urlParams.get("to");
  const amountFromUrl = urlParams.get("amount");
  const currencyFromUrl = urlParams.get("currency");

  const walletAddress = localStorage.getItem("walletAddress");

  if (window.firebaseService) {
    try {
      await window.firebaseService.init();
      if (walletAddress) {
        await window.firebaseService.autoBackupLocalStorage(walletAddress);
      }
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
    }
  }

  const ratesFetched = await fetchLiveRates();
  await fetchRealTimeGasFee();

  setInterval(async () => {
    await fetchLiveRates();
    await fetchRealTimeGasFee();
  }, 30000);

  setTimeout(() => {
    loadSenderAddress();
  }, 100);

  setTimeout(() => {
    loadSenderAddress();
  }, 500);

  updateReceiverPreview();

  await loadRecentRecipients();

  const amountInput = document.getElementById("amount");
  const currencySelect = document.getElementById("currency");
  const receiverAddressInput = document.getElementById("receiverAddress");

  const storedRequest = localStorage.getItem("pendingPaymentRequest");

  if (storedRequest) {
    try {
      const paymentData = JSON.parse(storedRequest);

      const age = Date.now() - (paymentData.timestamp || 0);

      if (age < 300000) {
        if (paymentData.to && receiverAddressInput) {
          receiverAddressInput.value = paymentData.to;
          updateToAddress(paymentData.to);
          updateReceiverPreview();
          showNotification(
            "Recipient address loaded from payment link!",
            "info"
          );
        }

        if (paymentData.amount && amountInput) {
          amountInput.value = paymentData.amount;
        }

        if (paymentData.currency && currencySelect) {
          const currencyOptions = Array.from(currencySelect.options);
          const matchingOption = currencyOptions.find(
            (opt) => opt.value === paymentData.currency
          );
          if (matchingOption) {
            currencySelect.value = paymentData.currency;
          }
        }

        setTimeout(() => {
          updateConversion();
        }, 300);
      } else {
      }

      localStorage.removeItem("pendingPaymentRequest");
    } catch (error) {
      console.error("❌ Error parsing payment request:", error);
      localStorage.removeItem("pendingPaymentRequest");
    }
  }

  if (amountInput) {
    amountInput.addEventListener("input", function () {
      updateConversion();
    });
  }

  if (currencySelect) {
    currencySelect.addEventListener("change", function () {
      updateConversion();
    });
  }

  let retries = 3;
  while (retries > 0 && userBalance === 0) {
    await loadUserBalance();
    if (userBalance === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      retries--;
    } else {
      break;
    }
  }
  updateConversion();
});

async function handleSendMoney(event) {
  event.preventDefault();
  const recipientAddress = document
    .getElementById("receiverAddress")
    .value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  if (!recipientAddress) {
    alert("Please enter recipient address");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }
  if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    alert("Invalid Ethereum address format");
    return;
  }
  const loginMethod = localStorage.getItem("loginMethod");
  try {
    const sendButton = event.target.querySelector('button[type="submit"]');
    const originalText = sendButton.innerHTML;
    sendButton.disabled = true;
    sendButton.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
    let txHash;
    if (loginMethod === "web3auth") {
      txHash = await sendPOL(recipientAddress, amount);
    } else if (loginMethod === "metamask") {
      if (
        typeof window.walletUtils !== "undefined" &&
        window.walletUtils.sendTransaction
      ) {
        const result = await window.walletUtils.sendTransaction(
          recipientAddress,
          amount
        );
        txHash = result.hash;
      } else {
        throw new Error("Wallet not properly initialized");
      }
    } else {
      throw new Error("No valid wallet connection found");
    }
    alert(
      `✅ Transaction sent successfully!\n\nTransaction Hash: ${txHash}\n\nView on Explorer: https://amoy.polygonscan.com/tx/${txHash}`
    );
    const transaction = {
      type: "sent",
      amount: amount,
      currency: currency,
      recipient: recipientAddress,
      date: new Date().toISOString(),
      status: "completed",
      hash: txHash,
    };
    let transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    transactions.unshift(transaction);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    document.getElementById("sendForm").reset();
    sendButton.disabled = false;
    sendButton.innerHTML = originalText;
    setTimeout(() => {
      window.location.href = "history.html";
    }, 3000);
  } catch (error) {
    console.error("Send transaction error:", error);
    alert("❌ Transaction failed: " + (error.message || "Unknown error"));
    const sendButton = event.target.querySelector('button[type="submit"]');
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Money';
  }
}

if (typeof window !== "undefined") {
  window.setMaxAmount = setMaxAmount;
  window.loadUserBalance = loadUserBalance;
  window.updateBalanceDisplay = updateBalanceDisplay;
  window.updateFromAddress = updateFromAddress;
  window.updateToAddress = updateToAddress;
  window.pasteAddress = pasteAddress;
  window.selectRecipient = selectRecipient;
  window.closeModal = closeModal;
  window.copyTxHash = copyTxHash;
  window.logout = logout;
}

const WEB3AUTH_CLIENT_ID =
  "BHN8je-BBHtAlgc6EtNp1d3PBRzpFGC6bGWGMagVQlZOHX56wmXkjmc2dxBanaXNcVitiVHx4F9VBjJpbPyPYgs";
let web3auth = null;
let provider = null;
async function initWeb3AuthOnSend() {
  try {
    const loginMethod = localStorage.getItem("loginMethod");
    if (loginMethod !== "web3auth") {
      return;
    }
    let attempts = 0;
    while (attempts < 20 && !window.Modal?.Web3Auth) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      attempts++;
    }
    if (!window.Modal?.Web3Auth) {
      console.warn("⚠️ Web3Auth libraries not loaded after 6 seconds");
      return;
    }
    const { Web3Auth } = window.Modal;
    const { EthereumPrivateKeyProvider } = window.EthereumProvider;
    const chainConfig = {
      chainNamespace: "eip155",
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology",
      displayName: "Polygon Amoy Testnet",
      blockExplorerUrls: ["https://amoy.polygonscan.com/"],
      ticker: "POL",
      tickerName: "Polygon",
    };
    const privateKeyProvider = new EthereumPrivateKeyProvider({
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
      setTimeout(async () => {
        const balance = await getBalance();
        if (typeof window.loadUserBalance === "function") {
          await window.loadUserBalance();
        } else {
          const el = document.getElementById("availableBalance");
          if (el) {
            el.innerHTML = `Available: <span class="font-semibold">${parseFloat(
              balance
            ).toFixed(4)} POL</span>`;
          }
        }
      }, 500);
    } else {
    }
  } catch (error) {
    console.warn("⚠️ Web3Auth initialization issue:", error.message);
  }
}
async function getBalance() {
  if (!web3auth || !web3auth.connected) {
    const stored = localStorage.getItem("walletBalance");
    return stored || "0";
  }
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    const address = accounts[0];
    const balanceHex = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    const balanceWei = parseInt(balanceHex, 16);
    const balancePOL = (balanceWei / 1e18).toFixed(4);
    localStorage.setItem("walletBalance", balancePOL);
    return balancePOL;
  } catch (error) {
    console.error("❌ Balance error:", error);
    return "0";
  }
}
async function sendPOL(to, amount) {
  if (!web3auth || !web3auth.connected) {
    throw new Error("Web3Auth not connected");
  }
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    const fromAddress = accounts[0];
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
    console.error("❌ Send error:", error);
    throw error;
  }
}
async function refreshBalance() {
  if (!web3auth) {
    await initWeb3AuthOnSend();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const balance = await getBalance();
  const el = document.getElementById("availableBalance");
  if (el) {
    el.innerHTML = `Available: <span class="font-semibold">${parseFloat(
      balance
    ).toFixed(4)} POL</span>`;
  }
  if (typeof window.loadUserBalance === "function") {
    await window.loadUserBalance();
  }
}
window.addEventListener("load", initWeb3AuthOnSend);
