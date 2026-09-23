import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchLiveCryptoPrices, DEFAULT_PRICES } from "../services/prices";

const PriceContext = createContext(null);

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveCryptoPrices();
      if (data) {
        setPrices(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn("PriceContext refresh notice:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshPrices();
    const interval = setInterval(() => {
      refreshPrices();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const pol = prices.pol || DEFAULT_PRICES.pol;

  const rates = {
    POL: 1,
    USD: pol.usd,
    EUR: pol.eur,
    INR: pol.inr,
  };

  const convertPolToFiat = useCallback(
    (polAmount, currency = "USD") => {
      const num = parseFloat(polAmount) || 0;
      const rate = rates[currency] || rates.USD;
      return num * rate;
    },
    [rates]
  );

  const convertFiatToPol = useCallback(
    (fiatAmount, currency = "USD") => {
      const num = parseFloat(fiatAmount) || 0;
      if (currency === "POL") return num;
      const rate = rates[currency] || rates.USD;
      if (rate <= 0) return num;
      return num / rate;
    },
    [rates]
  );

  return (
    <PriceContext.Provider
      value={{
        prices,
        rates,
        polPriceUSD: pol.usd,
        polPriceINR: pol.inr,
        polPriceEUR: pol.eur,
        pol24hChange: pol.usd_24h_change,
        isRefreshing,
        lastUpdated,
        refreshPrices,
        convertPolToFiat,
        convertFiatToPol,
      }}
    >
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error("usePrices must be used within a PriceProvider");
  }
  return context;
}
