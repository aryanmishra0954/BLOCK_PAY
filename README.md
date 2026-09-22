# BlockPay — Autonomous Web3 Payment Platform & AI Financial Agent

[![Polygon Amoy](https://img.shields.io/badge/Polygon-Amoy%20Testnet%20(80002)-8247E5?logo=polygon&logoColor=white)](https://amoy.polygonscan.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python%20Flask-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Groq AI](https://img.shields.io/badge/AI%20Engine-Groq%20LLaMA%203.3%2070B-F55036)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**BlockPay** is a non-custodial, high-performance Web3 payments platform and AI financial command center built on the **Polygon Amoy Testnet**. It enables friction-free peer-to-peer transfers, batch disbursements, shareable payment requests, live crypto/fiat FX conversions, and natural language payment dispatch powered by autonomous AI.

---

## ⚡ Key Highlights

* **Autonomous AI Command Center**: Turn natural language (e.g., *"Send 50 POL to Sarah for UI design"*, *"Generate payment link for $100"*) into validated on-chain and ledger actions using Groq LLaMA-3.3-70B.
* **Tri-Auth System**: Seamless onboarding through three distinct, interlinked auth pathways:
  1. **Email / Password**: Secure, Werkzeug-hashed credentials seeded with 10,000 test POL.
  2. **Web3 / MetaMask**: Cryptographic EIP-191 challenge-response authentication with replay-attack-proof nonces.
  3. **Google OAuth / Web3Auth**: 1-click social sign-in with automatic EVM key generation and resilient local fallback.
* **Dual Transfer Modes**:
  - ⚡ **Instant Ledger (Gasless)**: Zero-latency internal transfers verified through BlockPay's persistent database ledger.
  - 🌐 **Real On-Chain (MetaMask)**: Direct smart contract and native POL transfers broadcasted onto **Polygon Amoy Testnet (Chain ID 80002)** with public [Polygonscan](https://amoy.polygonscan.com/) transaction hashes.
* **Live Crypto & FX Price Feeds**: Real-time market data for **POL, ETH, and BTC** against **USD, EUR, and INR** powered by CoinGecko with automated 60-second caching.
* **Built-in Address Book**: Save frequent counterparties and team members with EVM address validation and 1-click payment triggers.
* **Personalized QR & Deep-Links**: Generate instant payment request URLs and scannable QR codes with pre-configured currencies and amounts.

---

## 🏛️ System Architecture
