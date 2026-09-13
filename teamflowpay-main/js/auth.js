async function connectMetaMask() {
  if (typeof window.ethereum === "undefined") {
    const container = document.getElementById("metamask-install-container");
    if (container && !document.getElementById("metamask-install-msg")) {
      const message = document.createElement("p");
      message.id = "metamask-install-msg";
      message.className = "text-center text-red-600 text-sm mt-6";
      message.innerHTML = `
                MetaMask not found. 
                <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="text-purple-600 hover:text-purple-700 underline font-medium">
                    Download MetaMask
                </a>
            `;
      container.appendChild(message);
    }
    return;
  }
  try {
    showNotification("Connecting to MetaMask...", "info");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = accounts[0];
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("authMethod", "metamask");
    localStorage.setItem("loginMethod", "metamask");
    localStorage.setItem("walletAddress", account);
    const userProfile = localStorage.getItem(`profile_${account}`);
    if (!userProfile) {
      showNotification("Wallet connected!", "success");
      showProfileSetupModal(account);
    } else {
      const profile = JSON.parse(userProfile);
      localStorage.setItem("userName", profile.name);
      localStorage.setItem("userFirstName", profile.firstName);
      localStorage.setItem("userLastName", profile.lastName || "");
      if (profile.email) {
        localStorage.setItem("userEmail", profile.email);
      }
      showNotification(`Welcome back, ${profile.firstName}! 👋`, "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    }
  } catch (error) {
    console.error("MetaMask connection error:", error);
    if (error.code === 4001) {
      showNotification("MetaMask connection rejected by user.", "error");
    } else {
      showNotification("Failed to connect wallet. Please try again.", "error");
    }
  }
}

function showProfileSetupModal(walletAddress) {
  const modal = document.createElement("div");
  modal.id = "profileModal";
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div class="text-center mb-6">
                <div class="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-user text-white text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                <p class="text-gray-600 text-sm">Let's personalize your FlowPay experience</p>
            </div>
            <form id="profileModalForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        First Name <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="modalFirstName" 
                        required
                        placeholder="Enter your first name"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Last Name <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="modalLastName" 
                        required
                        placeholder="Enter your last name"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Email <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="email" 
                        id="modalEmail" 
                        required
                        placeholder="your.email@example.com"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                </div>
                <div class="mt-6">
                    <button 
                        type="submit" 
                        class="w-full gradient-bg text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg transition"
                    >
                        Continue
                    </button>
                </div>
            </form>
            <p class="text-center text-xs text-gray-500 mt-4">
                Stored locally on your device
            </p>
        </div>
    `;
  document.body.appendChild(modal);
  document
    .getElementById("profileModalForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const firstName = document.getElementById("modalFirstName").value.trim();
      const lastName = document.getElementById("modalLastName").value.trim();
      const email = document.getElementById("modalEmail").value.trim();
      if (!firstName || !lastName || !email) {
        showNotification("Please fill in all fields", "error");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }
      saveProfile(walletAddress, firstName, lastName, email);
    });
  setTimeout(() => {
    document.getElementById("modalFirstName").focus();
  }, 100);
}

function saveProfile(walletAddress, firstName, lastName, email) {
  const profile = {
    firstName: firstName,
    lastName: lastName,
    name: lastName ? `${firstName} ${lastName}` : firstName,
    email: email || "",
    walletAddress: walletAddress,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(`profile_${walletAddress}`, JSON.stringify(profile));
  localStorage.setItem("userName", profile.name);
  localStorage.setItem("userFirstName", profile.firstName);
  localStorage.setItem("userLastName", profile.lastName);
  if (email) {
    localStorage.setItem("userEmail", email);
  }
  const modal = document.getElementById("profileModal");
  if (modal) {
    modal.remove();
  }
  showNotification(`Welcome, ${firstName}! 🎉`, "success");
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1000);
}

function logout() {
  const loginMethod = localStorage.getItem("loginMethod");
  localStorage.clear();
  sessionStorage.clear();
  showNotification("Logged out successfully", "success");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
}

function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification");
  if (existing) {
    existing.remove();
  }
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };
  const notification = document.createElement("div");
  notification.className = `notification fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 transition-all transform translate-x-0`;
  notification.innerHTML = `
        <div class="flex items-center gap-2">
            <span>${message}</span>
        </div>
    `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.transform = "translateX(120%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const currentPage = window.location.pathname;
  if (isAuthenticated === "true" && currentPage.includes("index.html")) {
    window.location.href = "dashboard.html";
  }
});

if (typeof window !== "undefined") {
  window.logout = logout;
  window.connectMetaMask = connectMetaMask;
  window.showNotification = showNotification;
}
