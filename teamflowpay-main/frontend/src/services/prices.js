
const CACHE_TTL_MS = 60 * 1000;

let cachedPrices = null;
let lastFetchTime = 0;

export const DEFAULT_PRICES = {
  pol: {
    usd: 0.58,
    eur: 0.53,
    inr: 48.5,
    usd_24h_change: 2.38,
  },
  ethereum: {
    usd: 3450.0,
    eur: 3180.0,
    inr: 288000.0,
    usd_24h_change: 1.45,
  },
  bitcoin: {
    usd: 96200.0,
    eur: 88500.0,
    inr: 8030000.0,
    usd_24h_change: 3.12,
  },
  timestamp: Date.now(),
};

export async function fetchLiveCryptoPrices() {
  const now = Date.now();

  if (cachedPrices && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedPrices;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,bitcoin&vs_currencies=usd,eur,inr&include_24hr_change=true";

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `CoinGecko API responded with ${response.status}. Using cached/fallback rates.`
      );
      return cachedPrices || DEFAULT_PRICES;
    }

    const data = await response.json();

    const normalized = {
      pol: {
        usd: data["matic-network"]?.usd || DEFAULT_PRICES.pol.usd,
        eur: data["matic-network"]?.eur || DEFAULT_PRICES.pol.eur,
        inr: data["matic-network"]?.inr || DEFAULT_PRICES.pol.inr,
        usd_24h_change:
          data["matic-network"]?.usd_24h_change ?? DEFAULT_PRICES.pol.usd_24h_change,
      },
      ethereum: {
        usd: data.ethereum?.usd || DEFAULT_PRICES.ethereum.usd,
        eur: data.ethereum?.eur || DEFAULT_PRICES.ethereum.eur,
        inr: data.ethereum?.inr || DEFAULT_PRICES.ethereum.inr,
        usd_24h_change:
          data.ethereum?.usd_24h_change ?? DEFAULT_PRICES.ethereum.usd_24h_change,
      },
      bitcoin: {
        usd: data.bitcoin?.usd || DEFAULT_PRICES.bitcoin.usd,
        eur: data.bitcoin?.eur || DEFAULT_PRICES.bitcoin.eur,
        inr: data.bitcoin?.inr || DEFAULT_PRICES.bitcoin.inr,
        usd_24h_change:
          data.bitcoin?.usd_24h_change ?? DEFAULT_PRICES.bitcoin.usd_24h_change,
      },
      timestamp: now,
    };

    cachedPrices = normalized;
    lastFetchTime = now;
    return normalized;
  } catch (err) {
    console.warn("Could not fetch live CoinGecko prices (offline or timeout):", err.message);
    return cachedPrices || DEFAULT_PRICES;
  }
}
