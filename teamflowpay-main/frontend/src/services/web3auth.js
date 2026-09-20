import { Web3Auth } from "@web3auth/modal";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

// Polygon Amoy Testnet Chain Configuration
export const POLYGON_AMOY_CHAIN_CONFIG = {
  chainNamespace: "eip155",
  chainId: "0x13882", // 80002 hex
  rpcTarget: "https://rpc-amoy.polygon.technology",
  displayName: "Polygon Amoy Testnet",
  blockExplorerUrl: "https://amoy.polygonscan.com/",
  ticker: "POL",
  tickerName: "Polygon Ecosystem Token",
  decimals: 18,
};

// Public Sapphire Devnet Client ID (Whitelisted for localhost & dev environments)
const DEFAULT_CLIENT_ID =
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8Kc-0G6E4VwyIc";

const CLIENT_ID =
  import.meta.env.VITE_WEB3AUTH_CLIENT_ID || DEFAULT_CLIENT_ID;

class Web3AuthService {
  constructor() {
    this.web3auth = null;
    this.provider = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.isInitialized && this.web3auth) return this.web3auth;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig: POLYGON_AMOY_CHAIN_CONFIG },
        });

        this.web3auth = new Web3Auth({
          clientId: CLIENT_ID,
          web3AuthNetwork: "sapphire_devnet",
          privateKeyProvider,
          uiConfig: {
            appName: "BlockPay",
            mode: "dark",
            theme: {
              primary: "#10b981",
            },
            logoLight: "https://teamBlockPay.vercel.app/assets/images/BlockPay-icon.svg",
            logoDark: "https://teamBlockPay.vercel.app/assets/images/BlockPay-icon.svg",
            defaultLanguage: "en",
          },
        });

        await this.web3auth.initModal();
        this.isInitialized = true;
        if (this.web3auth.provider) {
          this.provider = this.web3auth.provider;
        }
        return this.web3auth;
      } catch (err) {
        console.warn("Web3Auth init warning:", err);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Connect via Web3Auth Modal (Google, Email OTP, Web3 Wallets)
   */
  async connect() {
    await this.init();
    if (this.web3auth.connected && this.web3auth.provider) {
      this.provider = this.web3auth.provider;
    } else {
      this.provider = await this.web3auth.connect();
    }

    const userInfo = await this.web3auth.getUserInfo();
    const accounts = await this.provider.request({ method: "eth_accounts" });
    const walletAddress = accounts && accounts[0] ? accounts[0] : null;

    return {
      provider: this.provider,
      userInfo,
      walletAddress,
    };
  }

  /**
   * Sign out of Web3Auth
   */
  async logout() {
    try {
      if (this.web3auth && this.web3auth.connected) {
        await this.web3auth.logout();
      }
    } catch (err) {
      console.warn("Web3Auth logout notice:", err);
    } finally {
      this.provider = null;
    }
  }

  /**
   * Get current active account address if connected
   */
  async getAccount() {
    if (!this.provider) return null;
    try {
      const accounts = await this.provider.request({ method: "eth_accounts" });
      return accounts && accounts[0] ? accounts[0] : null;
    } catch {
      return null;
    }
  }
}

export const web3AuthService = new Web3AuthService();
