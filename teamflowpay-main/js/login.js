const WEB3AUTH_CLIENT_ID =
  "BHN8je-BBHtAlgc6EtNp1d3PBRzpFGC6bGWGMagVQlZOHX56wmXkjmc2dxBanaXNcVitiVHx4F9VBjJpbPyPYgs";
let web3auth = null;
let provider = null;
async function initWeb3Auth() {
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
      console.error("❌ Web3Auth libraries not found");
      throw new Error(
        "Web3Auth library failed to load. Please refresh the page."
      );
    }
    const chainConfig = {
      chainNamespace: "eip155",
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology",
      displayName: "Polygon Amoy Testnet",
      blockExplorerUrls: ["https://amoy.polygonscan.com/"],
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
        loginMethodsOrder: ["google"],
        defaultLanguage: "en",
      },
    });
    await web3auth.initModal();
    if (web3auth.connected) {
      provider = web3auth.provider;
      await handleWeb3AuthLogin();
    }
    return true;
  } catch (error) {
    console.error("❌ Error initializing Web3Auth:", error);
    console.error("Error details:", error.message);
    alert("Failed to initialize Web3Auth. Error: " + error.message);
    return false;
  }
}
async function loginWithGoogle() {
  try {
    if (!web3auth) {
      const initialized = await initWeb3Auth();
      if (!initialized) {
        alert(
          "Failed to initialize Web3Auth. Please refresh the page and try again."
        );
        return;
      }
    }
    provider = await web3auth.connect();
    if (!provider) {
      throw new Error("No provider received from Web3Auth");
    }
    await handleWeb3AuthLogin();
  } catch (error) {
    console.error("❌ Login error:", error);
    if (error.message.includes("user closed popup")) {
    } else if (error.message.includes("already pending")) {
      alert("Login already in progress. Please wait...");
    } else {
      alert("Login failed: " + error.message);
    }
  }
}
async function handleWeb3AuthLogin() {
  try {
    const userInfo = await web3auth.getUserInfo();
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();
    const address = await signer.getAddress();
    const balance = await ethersProvider.getBalance(address);
    const userEmail = userInfo.email;
    const savedWalletForUser = localStorage.getItem(`wallet_${userEmail}`);
    if (savedWalletForUser && savedWalletForUser !== address) {
      console.warn("⚠️ WARNING: Different wallet detected for same user!");
      const useOldWallet = confirm(
        `⚠️ Wallet Address Changed!\n\n` +
          `Previous: ${savedWalletForUser.slice(
            0,
            10
          )}...${savedWalletForUser.slice(-8)}\n` +
          `Current:  ${address.slice(0, 10)}...${address.slice(-8)}\n\n` +
          `This may happen if you cleared browser data or are using a different device.\n\n` +
          `Click OK to keep using your PREVIOUS wallet (recommended)\n` +
          `Click Cancel to use the NEW wallet`
      );
      if (useOldWallet) {
        localStorage.setItem("walletPreference", "previous");
        localStorage.setItem("preferredWallet", savedWalletForUser);
      } else {
        localStorage.setItem("walletPreference", "new");
      }
    }
    const userData = {
      email: userInfo.email || "",
      name: userInfo.name || "",
      firstName: userInfo.name?.split(" ")[0] || "",
      picture: userInfo.profileImage || "",
      walletAddress: address,
      loginMethod: "web3auth",
      authMethod: "google",
      isAuthenticated: "true",
      walletCreatedAt: savedWalletForUser
        ? localStorage.getItem(`wallet_${userEmail}_created`)
        : new Date().toISOString(),
    };
    Object.entries(userData).forEach(([key, value]) => {
      if (key === "walletAddress") {
        localStorage.setItem("walletAddress", value);
        localStorage.setItem(`wallet_${userEmail}`, value);
        if (!savedWalletForUser) {
          localStorage.setItem(
            `wallet_${userEmail}_created`,
            userData.walletCreatedAt
          );
        }
      } else if (key === "email") {
        localStorage.setItem("userEmail", value);
      } else if (key === "name") {
        localStorage.setItem("userName", value);
      } else if (key === "firstName") {
        localStorage.setItem("userFirstName", value);
      } else if (key === "picture") {
        localStorage.setItem("userPicture", value);
      } else if (key !== "walletCreatedAt") {
        localStorage.setItem(key, value);
      }
    });
    localStorage.setItem("isAuthenticated", "true");
    const verifyData = {
      isAuthenticated: localStorage.getItem("isAuthenticated"),
      loginMethod: localStorage.getItem("loginMethod"),
      walletAddress: localStorage.getItem("walletAddress"),
      userEmail: localStorage.getItem("userEmail"),
    };
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    console.error("❌ Error handling login:", error);
    alert("Failed to complete login. Please try again.");
  }
}
async function getUserAddress() {
  if (!web3auth || !web3auth.connected) {
    console.error("Web3Auth not connected");
    return null;
  }
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    return accounts[0];
  } catch (error) {
    console.error("Error getting user address:", error);
    return null;
  }
}
async function getBalance() {
  if (!web3auth || !web3auth.connected) {
    console.error("Web3Auth not connected");
    return 0;
  }
  try {
    const address = await getUserAddress();
    if (!address) return 0;
    const balance = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    const balanceInPOL = parseInt(balance, 16) / 1e18;
    return balanceInPOL;
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
window.web3authInstance = () => web3auth;
window.web3authProvider = () => provider;

const web3AuthLogin = loginWithGoogle;
window.handleGoogleLogin = function () {
  return web3AuthLogin();
};
window.loginWithGoogle = loginWithGoogle;

window.addEventListener("load", () => {
  setTimeout(initWeb3Auth, 1000);
});
