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
    localStorage.clear();
    window.location.href = "index.html";
  }
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

const allTransactions = [];

async function loadTransactionsFromStorage() {
  const walletAddress = localStorage.getItem("walletAddress");
  if (walletAddress && window.firebaseService) {
    try {
      const mergedTransactions =
        await window.firebaseService.loadAndMergeTransactions(walletAddress);
      allTransactions.length = 0;
      allTransactions.push(...mergedTransactions);
      return mergedTransactions;
    } catch (error) {
      console.error("Error loading from Firebase:", error);
    }
  }
  const stored = localStorage.getItem("transactions");
  if (stored) {
    try {
      const transactions = JSON.parse(stored);
      allTransactions.length = 0;
      allTransactions.push(...transactions);
      return transactions;
    } catch (error) {
      console.error("Error parsing transactions:", error);
      return [];
    }
  } else {
    return [];
  }
}

let currentPage = 1;

const itemsPerPage = 10;

let filteredTransactions = [];

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status) {
  const badges = {
    success:
      '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Success</span>',
    pending:
      '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending</span>',
    failed:
      '<span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Failed</span>',
  };
  return badges[status] || badges.pending;
}

function applyFilters() {
  const typeFilter = document.getElementById("typeFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;
  const timeFilter = document.getElementById("timeFilter").value;
  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();
  filteredTransactions = allTransactions.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (timeFilter !== "all") {
      const txDate = new Date(tx.date);
      const now = new Date();
      const diff = now - txDate;
      const hours = diff / (1000 * 60 * 60);
      const days = hours / 24;
      if (timeFilter === "today" && days > 1) return false;
      if (timeFilter === "week" && days > 7) return false;
      if (timeFilter === "month" && days > 30) return false;
      if (timeFilter === "year" && days > 365) return false;
    }
    if (searchInput) {
      const searchableText = `${tx.address} ${tx.hash}`.toLowerCase();
      if (!searchableText.includes(searchInput)) return false;
    }
    return true;
  });
  currentPage = 1;
  renderTransactions();
}

function clearFilters() {
  document.getElementById("typeFilter").value = "all";
  document.getElementById("statusFilter").value = "all";
  document.getElementById("timeFilter").value = "all";
  document.getElementById("searchInput").value = "";
  applyFilters();
}

function renderTransactions() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageTransactions = filteredTransactions.slice(startIndex, endIndex);
  const tableBody = document.getElementById("transactionTable");
  const emptyState = document.getElementById("emptyState");
  if (pageTransactions.length === 0) {
    if (tableBody) tableBody.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
  } else {
    if (emptyState) emptyState.classList.add("hidden");
    if (tableBody) {
      tableBody.innerHTML = pageTransactions
        .map((tx) => {
          const addressShort =
            tx.address.slice(0, 6) + "..." + tx.address.slice(-4);
          const hashShort = tx.hash.slice(0, 10) + "..." + tx.hash.slice(-8);
          const typeIcon =
            tx.type === "sent"
              ? '<i class="fas fa-arrow-up text-red-500 mr-2"></i>'
              : '<i class="fas fa-arrow-down text-green-500 mr-2"></i>';
          return `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${formatDateTime(tx.date)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="flex items-center capitalize font-medium ${
                              tx.type === "sent"
                                ? "text-red-600"
                                : "text-green-600"
                            }">
                                ${typeIcon}${tx.type}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            ${addressShort}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ${tx.type === "sent" ? "-" : "+"} ${tx.amount} ${
            tx.currency
          }
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${getStatusBadge(tx.status)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <a href="https://amoy.polygonscan.com/tx/${
                              tx.hash
                            }" target="_blank" 
                               class="text-purple-600 hover:text-purple-700 text-sm font-mono flex items-center gap-1">
                                ${hashShort}
                                <i class="fas fa-external-link-alt text-xs"></i>
                            </a>
                        </td>
                    </tr>
                `;
        })
        .join("");
    }
    const mobileContainer = document.getElementById("transactionMobile");
    if (mobileContainer) {
      mobileContainer.innerHTML = pageTransactions
        .map((tx) => {
          const addressShort =
            tx.address.slice(0, 6) + "..." + tx.address.slice(-4);
          const hashShort = tx.hash.slice(0, 10) + "..." + tx.hash.slice(-8);
          return `
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 ${
                                  tx.type === "sent"
                                    ? "bg-red-100"
                                    : "bg-green-100"
                                } rounded-lg flex items-center justify-center">
                                    <i class="fas fa-arrow-${
                                      tx.type === "sent" ? "up" : "down"
                                    } text-${
            tx.type === "sent" ? "red" : "green"
          }-600 text-sm"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900 capitalize">${
                                      tx.type
                                    }</p>
                                    <p class="text-xs text-gray-600">${formatDateTime(
                                      tx.date
                                    )}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-gray-900">${
                                  tx.type === "sent" ? "-" : "+"
                                } ${tx.amount} ${tx.currency}</p>
                                ${getStatusBadge(tx.status)}
                            </div>
                        </div>
                        <div class="mt-2 pt-2 border-t border-gray-100">
                            <p class="text-xs text-gray-600 mb-1">Address: <span class="font-mono">${addressShort}</span></p>
                            <a href="https://amoy.polygonscan.com/tx/${
                              tx.hash
                            }" target="_blank" 
                               class="text-xs text-purple-600 hover:text-purple-700 font-mono flex items-center gap-1">
                                ${hashShort}
                                <i class="fas fa-external-link-alt text-xs"></i>
                            </a>
                        </div>
                    </div>
                `;
        })
        .join("");
    }
  }
  updatePagination();
}

function updatePagination() {
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredTransactions.length
  );
  document.getElementById("showingFrom").textContent =
    filteredTransactions.length > 0 ? startIndex : 0;
  document.getElementById("showingTo").textContent = endIndex;
  document.getElementById("totalTransactions").textContent =
    filteredTransactions.length;
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn)
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  const pageNumbers = document.getElementById("pageNumbers");
  if (pageNumbers) {
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    pageNumbers.innerHTML = pages
      .map((page) => {
        if (page === "...") {
          return '<span class="px-3 py-2 text-gray-500">...</span>';
        }
        return `
                <button 
                    onclick="goToPage(${page})"
                    class="px-3 py-2 rounded-lg ${
                      page === currentPage
                        ? "bg-purple-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    } transition"
                >
                    ${page}
                </button>
            `;
      })
      .join("");
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTransactions();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTransactions();
  }
}

function goToPage(page) {
  currentPage = page;
  renderTransactions();
}

function exportCSV() {
  let csv = "Date,Type,Address,Amount,Currency,Status,Hash\n";
  filteredTransactions.forEach((tx) => {
    csv += `"${formatDateTime(tx.date)}","${tx.type}","${tx.address}","${
      tx.amount
    }","${tx.currency}","${tx.status}","${tx.hash}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flowpay-transactions-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  a.click();
  showNotification("CSV exported successfully!", "success");
}

function exportPDF() {
  showNotification("PDF export feature coming soon!", "info");
}

function printHistory() {
  window.print();
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

async function refreshTransactions() {
  const refreshIcon = document.getElementById("refreshTxIcon");
  if (refreshIcon) {
    refreshIcon.classList.add("fa-spin");
  }
  try {
    const tableBody = document.getElementById("transactionTable");
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...</td></tr>';
    }
    await loadTransactionsFromStorage();
    applyFilters();
    showNotification("Transactions refreshed!", "success");
  } catch (error) {
    console.error("Error refreshing transactions:", error);
    showNotification("Failed to refresh transactions", "error");
  } finally {
    if (refreshIcon) {
      setTimeout(() => {
        refreshIcon.classList.remove("fa-spin");
      }, 500);
    }
  }
}

window.refreshTransactions = refreshTransactions;

document.addEventListener("DOMContentLoaded", async () => {
  if (!checkAuth()) return;
  const walletAddress = localStorage.getItem("walletAddress");
  if (window.firebaseService) {
    try {
      await window.firebaseService.init();
      if (walletAddress) {
        await window.firebaseService.autoBackupLocalStorage(walletAddress);
      }
      if (walletAddress) {
        window.firebaseService.subscribeToTransactions(
          walletAddress,
          (transactions) => {
            allTransactions.length = 0;
            allTransactions.push(...transactions);
            applyFilters();
          }
        );
      }
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
    }
  }
  await loadTransactionsFromStorage();
  filteredTransactions = [...allTransactions];
  renderTransactions();
});

window.addEventListener("beforeunload", () => {
  if (window.firebaseService) {
    window.firebaseService.unsubscribeFromTransactions();
  }
});
