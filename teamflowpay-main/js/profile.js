function checkAuth() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (isAuthenticated !== "true") {
    window.location.href = "index.html";
    return false;
  }
  return true;
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

function loadProfileData() {
  const firstName = localStorage.getItem("userFirstName") || "";
  const lastName = localStorage.getItem("userLastName") || "";
  const email = localStorage.getItem("userEmail") || "";
  const userPicture = localStorage.getItem("userPicture") || "";
  const authMethod = localStorage.getItem("authMethod") || "google";
  const walletAddress = localStorage.getItem("walletAddress") || "";
  document.getElementById("firstName").value = firstName;
  document.getElementById("lastName").value = lastName;
  document.getElementById("email").value = email;
  if (userPicture) {
    const profilePic = document.getElementById("profilePicture");
    const defaultIcon = document.getElementById("defaultProfileIcon");
    profilePic.src = userPicture;
    profilePic.classList.remove("hidden");
    defaultIcon.classList.add("hidden");
  }
  const authBadge = document.getElementById("authMethodBadge");
  if (authMethod === "google") {
    authBadge.innerHTML = '<i class="fas fa-google mr-1"></i>Google';
    authBadge.className =
      "px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium";
  } else if (authMethod === "metamask") {
    authBadge.innerHTML = '<i class="fas fa-wallet mr-1"></i>MetaMask';
    authBadge.className =
      "px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-medium";
  }
  loadWalletInfo(walletAddress);
}

async function loadWalletInfo(walletAddress) {
  const walletConnectedSection = document.getElementById(
    "walletConnectedSection"
  );
  const noWalletSection = document.getElementById("noWalletSection");
  if (!walletAddress) {
    walletConnectedSection.classList.add("hidden");
    noWalletSection.classList.remove("hidden");
    return;
  }
  walletConnectedSection.classList.remove("hidden");
  noWalletSection.classList.add("hidden");
  const addressShort =
    walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
  document.getElementById("connectedWalletAddress").textContent = addressShort;
  if (typeof window.ethereum !== "undefined") {
    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      });
      const balanceInMatic = parseInt(balance, 16) / Math.pow(10, 18);
      document.getElementById("walletBalance").textContent =
        balanceInMatic.toFixed(4) + " MATIC";
    } catch (error) {
      console.error("Error fetching balance:", error);
      document.getElementById("walletBalance").textContent = "0.0000 MATIC";
    }
  }
}

document
  .getElementById("personalDetailsForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    if (!firstName || !lastName || !email) {
      showNotification("Please fill in all required fields", "error");
      return;
    }
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName", lastName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", `${firstName} ${lastName}`);
    const walletAddress = localStorage.getItem("walletAddress");
    const authMethod = localStorage.getItem("authMethod");
    if (authMethod === "metamask" && walletAddress) {
      const profile = {
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        walletAddress: walletAddress,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`profile_${walletAddress}`, JSON.stringify(profile));
    }
    showNotification("Profile updated successfully!", "success");
  });

function changeProfilePicture() {
  showNotification("Profile picture upload coming soon!", "info");
}

function copyWalletAddress() {
  const walletAddress = localStorage.getItem("walletAddress");
  if (walletAddress) {
    navigator.clipboard
      .writeText(walletAddress)
      .then(() => {
        showNotification("Wallet address copied!", "success");
      })
      .catch(() => {
        showNotification("Failed to copy address", "error");
      });
  }
}

async function connectMetaMaskFromProfile() {
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
    showNotification("Wallet connected successfully!", "success");
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error("MetaMask connection error:", error);
    showNotification("Failed to connect wallet. Please try again.", "error");
  }
}

function disconnectWallet() {
  if (confirm("Are you sure you want to disconnect your wallet?")) {
    localStorage.removeItem("walletAddress");
    showNotification("Wallet disconnected", "success");
    setTimeout(() => {
      location.reload();
    }, 1000);
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

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  loadProfileData();
});
