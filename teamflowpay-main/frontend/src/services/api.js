
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? ""
    : "https://BlockPay-backend.vercel.app");

export const BlockPayAPI = {
  getToken() {
    return localStorage.getItem("authToken") || "";
  },

  setToken(token) {
    if (token) localStorage.setItem("authToken", token);
  },

  clearToken() {
    localStorage.removeItem("authToken");
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const userEmail = localStorage.getItem("userEmail") || "trader@BlockPay.io";
    const walletAddress = localStorage.getItem("walletAddress") || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
    headers["X-User-Email"] = userEmail;
    headers["X-Wallet-Address"] = walletAddress;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg =
          data.error || data.message || `Request failed with status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to BlockPay backend at http://127.0.0.1:3000. Please ensure the Flask server is running."
        );
      }
      throw error;
    }
  },

  auth: {
    async register(email, password, fullName, walletAddress = "") {
      return await BlockPayAPI.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          wallet_address: walletAddress,
        }),
      });
    },

    async login(email, password) {
      return await BlockPayAPI.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    async me() {
      return await BlockPayAPI.request("/api/auth/me", {
        method: "GET",
      });
    },

    async getWeb3Nonce(address) {
      return await BlockPayAPI.request(`/api/auth/web3/nonce?address=${encodeURIComponent(address)}`, {
        method: "GET",
      });
    },

    async verifyWeb3({ address, signature, message }) {
      return await BlockPayAPI.request("/api/auth/web3/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature, message }),
      });
    },

    async verifyGoogle(googleData) {
      return await BlockPayAPI.request("/api/auth/google/verify", {
        method: "POST",
        body: JSON.stringify(googleData),
      });
    },

    async logout() {
      try {
        await BlockPayAPI.request("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.warn("Backend logout notice:", err);
      }
      BlockPayAPI.clearToken();
    },
  },

  transactions: {
    async getAll(limit = 100) {
      const email = localStorage.getItem("userEmail");
      const url = `/api/transactions?limit=${limit}${
        email ? `&email=${encodeURIComponent(email)}` : ""
      }`;
      return await BlockPayAPI.request(url, { method: "GET" });
    },

    async record(txData) {
      const email = localStorage.getItem("userEmail");
      return await BlockPayAPI.request("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          ...txData,
          user_email: email,
        }),
      });
    },
  },

  agent: {
    async sendCommand(prompt) {
      return await BlockPayAPI.request("/api/agent/command", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
    },

    async executeAction(action, params) {
      return await BlockPayAPI.request("/api/agent/execute", {
        method: "POST",
        body: JSON.stringify({ action, params }),
      });
    },
  },

  contacts: {
    async getAll() {
      const email = localStorage.getItem("userEmail") || "trader@BlockPay.io";
      const url = `/api/contacts?email=${encodeURIComponent(email)}`;
      return await BlockPayAPI.request(url, { method: "GET" });
    },

    async create({ name, address, email }) {
      const userEmail = localStorage.getItem("userEmail") || "trader@BlockPay.io";
      const walletAddress = localStorage.getItem("walletAddress") || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      return await BlockPayAPI.request("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ name, address, email, email_user: userEmail, wallet_address: walletAddress }),
      });
    },

    async update(contactId, { name, address, email }) {
      const userEmail = localStorage.getItem("userEmail") || "trader@BlockPay.io";
      return await BlockPayAPI.request(`/api/contacts/${contactId}`, {
        method: "PUT",
        body: JSON.stringify({ name, address, email, email_user: userEmail }),
      });
    },

    async delete(contactId) {
      const userEmail = localStorage.getItem("userEmail") || "trader@BlockPay.io";
      const url = `/api/contacts/${contactId}?email=${encodeURIComponent(userEmail)}`;
      return await BlockPayAPI.request(url, { method: "DELETE" });
    },
  },
};

