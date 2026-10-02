# BlockPay (FlowPay) — Project Review & Viva Preparation Guide

> **Prepared for:** Final Project Review & Technical Viva  
> **Project Name:** BlockPay (Autonomous Web3 Payment Platform & AI Financial Agent)  
> **Network:** Polygon Amoy Testnet (Chain ID: 80002)  
> **Tech Stack:** React 18, Vite, Tailwind CSS, Python Flask, PostgreSQL/SQLite, Groq LLaMA-3.3-70B, EIP-1193 / EIP-191 Web3  

---

## 📋 Table of Contents
1. [Project Overview & Elevator Pitch](#1-project-overview--elevator-pitch)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Tech Stack Breakdown](#3-tech-stack-breakdown)
4. [Key Concepts Used in the Project](#4-key-concepts-used-in-the-project)
   - [A. Web3 & Blockchain Concepts](#a-web3--blockchain-concepts)
   - [B. Artificial Intelligence & NLP Concepts](#b-artificial-intelligence--nlp-concepts)
   - [C. Backend & Database Engineering Concepts](#c-backend--database-engineering-concepts)
   - [D. Frontend & State Management Concepts](#d-frontend--state-management-concepts)
   - [E. Security & Cryptographic Integrity](#e-security--cryptographic-integrity)
5. [File-by-File Codebase Map](#5-file-by-file-codebase-map)
6. [Top 15 Likely Viva & Review Questions (With Answers)](#6-top-15-likely-viva--review-questions-with-answers)
7. [Step-by-Step Live Demo Flow](#7-step-by-step-live-demo-flow)

---

## 1. Project Overview & Elevator Pitch

### The Problem
Traditional business payments suffer from high international settlement fees, slow processing times (3–5 banking days), and fragmented invoicing. Conversely, mainstream Web3 payment solutions require heavy cryptographic friction, manual gas management, and complex wallet interfaces that alienate non-technical team members and clients.

### The Solution: BlockPay
**BlockPay** is an enterprise-ready, hybrid financial management dashboard that combines:
1. **Tri-Auth Onboarding**: Users can sign in using standard Email/Password, Web3 wallets (MetaMask), or Google Social Login.
2. **Dual-Settlement Modes**:
   - **Instant Ledger (Gasless)**: Zero-fee, sub-second internal disbursements.
   - **Real On-Chain Transfers**: Direct native POL token transfers broadcasted to the **Polygon Amoy Testnet** with public explorer verification.
3. **Autonomous AI Command Center**: Powered by **Groq LLaMA-3.3-70B**, enabling users to manage payments, check balances, export CSVs, and set reminders simply by typing or speaking in natural English.

---

## 2. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite)                      │
│   Tailwind CSS • Lucide Icons • QRCode.React • React Router DOM v6     │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                │ REST / JSON (Bearer Token)             │ Injected Provider (EIP-1193)
                ▼                                        ▼
┌──────────────────────────────────────┐     ┌───────────────────────────┐
│        BACKEND (Flask 3 API)         │     │   POLYGON AMOY TESTNET    │
│  Modular Blueprint Architecture      │     │       (Chain ID 80002)    │
├──────────────────────────────────────┤     ├───────────────────────────┤
│ • routes/auth.py (EIP-191 Nonce Auth)│     │ • Native POL transfers    │
│ • routes/chain.py (Wallet Binding)   │◄────┤ • Public Polygonscan      │
│ • routes/agent.py (AI Command Hub)   │     │ • RPC Node Verification   │
│ • routes/transactions.py (Ledger)    │     └───────────────────────────┘
│ • routes/contacts.py (Address Book)  │
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐ ┌───────────────────────────────────────────────────┐
│     DATABASE     │ │                    GROQ AI CLOUD                  │
│ PostgreSQL 16 /  │ │ LLaMA-3.3-70B-Versatile                           │
│ SQLite Fallback  │ │ (Natural Language Intent -> Structured JSON Cmd)  │
└──────────────────┘ └───────────────────────────────────────────────────┘
```

---

## 3. Tech Stack Breakdown

| Layer | Technologies Used | Key Libraries / Modules |
|---|---|---|
| **Frontend** | React 18, Vite 5, JavaScript (ES6+) | `react-router-dom`, `lucide-react`, `qrcode.react`, `@web3auth/modal`, `@web3auth/ethereum-provider`, `tailwindcss` |
| **Backend** | Python 3.10+, Flask 3 | `flask`, `werkzeug`, `eth-account`, `requests`, `python-dotenv`, `psycopg2-binary` |
| **Blockchain** | Polygon Amoy Testnet (Chain ID: 80002) | JSON-RPC 2.0, MetaMask (EIP-1193), EIP-191 standard |
| **AI / NLP** | Groq Cloud API | LLaMA-3.3-70B-Versatile, Regex Fallback Engine |
| **Database** | Dual Persistence Engine | PostgreSQL 16 (production) with automatic fallback to SQLite (`BlockPay.db`) |
| **Testing** | Python Unittest & Test Suites | `tests.test_tri_auth`, `tests.test_contacts`, `tests.test_api` |

---

## 4. Key Concepts Used in the Project

### A. Web3 & Blockchain Concepts
1. **Polygon Amoy Testnet (EVM Layer-2)**:
   - Successor to the deprecated Polygon Mumbai testnet.
   - Operates on **Chain ID `80002` (`0x13882`)** with **POL** as native gas token.
   - Provides 2-second block times and minimal transaction fees.
2. **EIP-191 Cryptographic Challenge-Response Authentication**:
   - Rather than storing private keys on the server, the server issues a unique, time-stamped nonce message (`secrets.token_hex(16)`).
   - The user signs the challenge using MetaMask (`personal_sign`).
   - The server calls `Account.recover_message(encode_defunct(message), signature=signature)` to recover the public EVM address.
   - If the recovered address matches the registered address, a session token is issued.
3. **Replay-Attack Prevention**:
   - Every nonce is stored with a 5-minute expiration timestamp and is deleted immediately upon successful verification. Replay of previous signatures is mathematically impossible.
4. **Zero-Trust Server-Side RPC Verification**:
   - Located in `services/chain_service.py`.
   - The backend does **not** take the client's word that a transfer succeeded.
   - The backend calls the Polygon RPC (`eth_getTransactionByHash` & `eth_getTransactionReceipt`), verifies that `chainId == 80002`, confirms that the input data is native POL transfer (`0x`), verifies the recipient and positive transfer amount, and checks for canonical block confirmation before updating records.
5. **Dual Transfer Architecture**:
   - **Internal Ledger Mode**: High-velocity, zero-gas balance updates stored securely in the database for daily corporate disbursements.
   - **On-Chain Mode**: Verifiable on-chain transfer directly signed via MetaMask with public tx-hash links on Polygonscan.

---

### B. Artificial Intelligence & NLP Concepts
1. **LLM Structured Output Generation**:
   - Leverages Groq's high-speed inference engine running `llama-3.3-70b-versatile`.
   - The prompt instructs the model to act as an autonomous financial parser that outputs strictly valid JSON adhering to `agent-schema.json`.
2. **Intent Classification & Named Entity Recognition (NER)**:
   - Maps natural English commands into supported system actions:
     - `"Send 50 POL to Aryan"` -> `create_payment` (vendor: Aryan, amount: 50, currency: POL).
     - `"Show me unpaid invoices"` -> `show_pending_payments`.
     - `"Export all payments to CSV"` -> `export_report`.
     - `"Remind me to pay Sarah next week"` -> `set_reminder`.
     - `"Add contact Bob"` -> `add_client`.
3. **Graceful Degradation / Deterministic Fallback Parser**:
   - Implemented in `services/ai_service.py` (`_fallback_parse`).
   - If the Groq API key is expired, rate-limited, or internet access is severed, a regular-expression pattern matcher extracts entities so the core application never experiences downtime.
4. **Command Pattern Dispatcher**:
   - Implemented in `services/command_executor.py`.
   - Encapsulates actions into isolated command handlers that handle contact matching, balance validation, and database updates.

---

### C. Backend & Database Engineering Concepts
1. **Flask Application Factory & Blueprints**:
   - Defined in `backend_flask/app.py` via `create_app()`.
   - Modular blueprints partition concerns:
     - `auth_bp` (`/api/auth`)
     - `chain_bp` (`/api/chain`)
     - `agent_bp` (`/api/agent`)
     - `transactions_bp` (`/api/transactions`)
     - `contacts_bp` (`/api/contacts`)
2. **Dual-Engine Database Layer with Failover**:
   - Defined in `backend_flask/data/db.py`.
   - Tries connecting to PostgreSQL (via `psycopg2-binary`); if unavailable, cleanly switches to SQLite (`BlockPay.db`).
   - Unified helper functions (`execute_query`, `fetch_one`, `fetch_all`) abstract database dialect differences.
3. **SQL Injection Defense**:
   - 100% of SQL statements utilize parameterized queries (`?` for SQLite, `%s` for PostgreSQL), completely eliminating SQL injection vectors.
4. **CORS & Pre-Flight Handlers**:
   - Manual, granular CORS filters in `app.after_request` ensure only whitelisted origins (`http://localhost:5173`, etc.) can make credentialed API requests.

---

### D. Frontend & State Management Concepts
1. **React 18 & Context API Architecture**:
   - Instead of heavyweight state libraries, global state is divided into focused Context Providers:
     - `AuthContext`: Tracks user session, token lifecycle, profile updates, and login/logout state.
     - `WalletContext` & `ChainWalletContext`: Tracks MetaMask connection, current chain ID, and account address.
     - `PriceContext`: Handles live exchange rates.
2. **Live FX Pricing & 60-Second In-Memory Cache**:
   - Located in `frontend/src/context/PriceContext.jsx` and `services/prices.js`.
   - Polls CoinGecko API for real-time prices of **POL, ETH, and BTC** against **USD, EUR, and INR**.
   - Caches rates for 60 seconds (TTL) to prevent triggering 429 Rate Limit errors on free tiers.
3. **Route Protection (Guards)**:
   - `<ProtectedRoute>` in `App.jsx` checks `isAuthenticated` and `isLoading` before rendering dashboard pages, redirecting unauthenticated visitors to the landing page.
4. **Dynamic QR Code Generation**:
   - Uses `qrcode.react` on `ReceivePage.jsx` to generate instant QR codes encoding payment recipient addresses, desired token, and amount.

---

### E. Security & Cryptographic Integrity
1. **Werkzeug PBKDF2/scrypt Password Hashing**: Passwords are never stored in plaintext; salt is automatically computed and verified using constant-time comparisons.
2. **High-Entropy Session Tokens**: Generated using Python's cryptographically secure pseudo-random number generator (`secrets.token_hex(32)`).
3. **EVM Address Regex Validation**: All recipient addresses must pass `^0x[0-9a-fA-F]{40}$` validation. The zero-address (`0x0000...0000`) is explicitly blocked to prevent irreversible fund burning.

---

## 5. File-by-File Codebase Map

| File Path | What It Does |
|---|---|
| `backend_flask/app.py` | Initializes Flask app, configures CORS, registers blueprints, sets error handlers. |
| `backend_flask/routes/auth.py` | Handles registration, email login, Web3 nonce challenge, EIP-191 verification, Google login. |
| `backend_flask/routes/chain.py` | Authenticated wallet-binding challenge and signature verification. |
| `backend_flask/routes/agent.py` | Exposes `/api/agent/command` and `/api/agent/execute` endpoints for natural language operations. |
| `backend_flask/routes/transactions.py`| Handles transaction listing, internal transfers, and recording confirmed on-chain transactions. |
| `backend_flask/routes/contacts.py` | CRUD operations for the user's address book with EVM address validation. |
| `backend_flask/services/ai_service.py` | Connects to Groq LLaMA-3.3-70B with JSON system prompt + regex fallback parsing. |
| `backend_flask/services/chain_service.py` | Communicates directly with Polygon Amoy RPC to independently verify transactions and balances. |
| `backend_flask/services/command_executor.py` | Validates, verifies, and executes parsed financial actions in the database. |
| `backend_flask/data/db.py` | Database abstraction layer managing schema creation, SQLite/PostgreSQL failover, and queries. |
| `frontend/src/App.jsx` | Main client entry point configuring client routing, layout, and protected route guards. |
| `frontend/src/context/AuthContext.jsx` | Manages auth token, login/logout methods, and current user profile state. |
| `frontend/src/context/PriceContext.jsx`| Fetches and caches CoinGecko live prices for POL, ETH, and BTC. |
| `frontend/src/pages/DashboardPage.jsx` | Displays wallet balance, recent activity, quick navigation, and metrics. |
| `frontend/src/pages/SendPage.jsx` | Form allowing user to switch between Instant Ledger and Real On-Chain transfers. |
| `frontend/src/pages/ReceivePage.jsx` | Generates QR code and shareable payment link with pre-filled amount and currency. |
| `frontend/src/pages/HistoryPage.jsx` | Detailed transaction ledger with search, filters (sent/received), and status badges. |
| `frontend/src/pages/ContactsPage.jsx`| Address book page to add, edit, and delete contacts with wallet addresses. |
| `frontend/src/components/AICommandCenter.jsx`| Interactive floating command bar for natural language payment execution. |
| `agent-schema.json` | JSON Schema definition defining valid parameters and types for all AI actions. |

---

## 6. Top 15 Likely Viva & Review Questions (With Answers)

#### Q1: What is the main objective and real-world value of this project?
**Answer:** BlockPay bridges modern enterprise finance and decentralized Web3. It provides an intuitive Web2-like user experience (social login, instant zero-gas internal transfers, and conversational AI) combined with the trustless security and auditability of the Polygon blockchain.

#### Q2: How does Web3 authentication work without a password?
**Answer:** We implement EIP-191 challenge-response authentication. When the user connects MetaMask, the backend creates a cryptographically random challenge nonce (`secrets.token_hex(16)`). The user signs this text with their private key. The backend recovers the public key using `Account.recover_message`. If it matches the wallet address, a session token is issued.

#### Q3: How do you prevent replay attacks on the Web3 login?
**Answer:** Each challenge message includes a unique nonce and a strict 5-minute expiry timestamp. Once the challenge is verified, the nonce is immediately deleted from the database so that identical signed messages cannot be reused by an attacker.

#### Q4: Why did you implement Dual Transfer Modes (Ledger vs. On-Chain)?
**Answer:** For intra-team reimbursements or micro-transactions, paying blockchain gas fees and waiting for block confirmations is inefficient. The Instant Ledger allows gasless, millisecond-fast internal transfers. For external or high-value settlements, the On-Chain mode broadcasts directly to Polygon Amoy for public verification.

#### Q5: What stops a user from faking an on-chain transaction by submitting a random hash?
**Answer:** Our backend never trusts client data. In `services/chain_service.py`, the server independently queries the Polygon Amoy RPC node using `eth_getTransactionByHash` and `eth_getTransactionReceipt`. It verifies that the network chain ID is 80002, checks the sender and recipient addresses, verifies that the transfer value is positive, and ensures the transaction has canonical block confirmation.

#### Q6: Which LLM are you using, and why Groq?
**Answer:** We use Groq's LLaMA-3.3-70B-Versatile. Groq's LPU (Language Processing Unit) architecture delivers ultra-low inference latency (<500ms), which is critical for making natural language financial commands feel like an instant conversational interface.

#### Q7: What happens if the Groq AI service goes down or the API key fails?
**Answer:** We built a resilient deterministic fallback parser in `services/ai_service.py` (`_fallback_parse`). It uses regular expressions to extract verbs, amounts, recipient names, and currencies, ensuring that command parsing continues to work seamlessly even without external AI connectivity.

#### Q8: What is `agent-schema.json` used for?
**Answer:** It is a JSON Schema definition that enforces strict structural validation for all AI-generated actions. It guarantees that parameters like `vendor`, `amount`, `currency`, and `due_date` meet type and formatting requirements before passing them to the execution engine.

#### Q9: Why Polygon Amoy instead of Ethereum Sepolia or Goerli?
**Answer:** Polygon Amoy offers sub-second to 2-second block finality and gas fees that are fractions of a cent, making it suitable for realistic, high-throughput consumer payments.

#### Q10: How do you handle password security for standard accounts?
**Answer:** We use Werkzeug's `generate_password_hash` and `check_password_hash`, which utilize modern salting and hashing algorithms (PBKDF2/scrypt). Plaintext passwords are never saved or logged.

#### Q11: How do you prevent SQL Injection?
**Answer:** All database operations in `data/db.py` use parameterized queries (`?` for SQLite, `%s` for PostgreSQL). User input is treated strictly as data, never as executable SQL code.

#### Q12: How are live crypto and fiat rates handled without hitting rate limits?
**Answer:** In `PriceContext.jsx`, we fetch live exchange rates from CoinGecko for POL, ETH, and BTC against USD, EUR, and INR. We implement a **60-second in-memory TTL cache** so rapid page navigations do not trigger HTTP 429 (Too Many Requests) errors.

#### Q13: What happens if PostgreSQL is not installed on the evaluator's machine?
**Answer:** The application is architected with dual-database persistence. In `data/db.py`, the system attempts to connect to PostgreSQL; if the connection fails or credentials are absent, it automatically and silently initializes a local SQLite database (`BlockPay.db`).

#### Q14: How does the AI Command Center differentiate between different contacts?
**Answer:** In `command_executor.py`, `find_matching_contact` performs case-insensitive exact matching, followed by substring matching. If multiple contacts match the query, the engine safely throws an error requiring the user to specify the exact address to avoid erroneous disbursements.

#### Q15: How is the frontend state organized without Redux?
**Answer:** We leverage React 18's native Context API. We decoupled states into three dedicated contexts: `AuthContext` (session & user), `WalletContext` / `ChainWalletContext` (MetaMask provider), and `PriceContext` (FX rates). This minimizes re-renders and eliminates bulky external dependencies.

---

## 7. Step-by-Step Live Demo Flow

If asked to demonstrate the project tomorrow, follow this smooth 5-minute path:

1. **Landing Page (`/`)**:
   - Showcase the modern dark-themed financial UI, key feature cards, and the live crypto price ticker (POL, ETH, BTC).
2. **Authentication**:
   - Click **Sign In / Connect Wallet**.
   - Demonstrate the **Web3 MetaMask Login**: Show the MetaMask prompt signing the EIP-191 challenge nonce without exposing private keys.
3. **Dashboard (`/dashboard`)**:
   - Highlight the wallet balance (seeded with 10,000 POL on registration), recent activity, and quick navigation.
4. **Autonomous AI Command Center**:
   - Open the AI Command bar or modal.
   - Enter: `"Send 25 POL to Sarah for project design"`
   - Show how the AI parses the command into structured JSON parameters and displays a confirmation card.
   - Enter: `"Export all transactions to CSV"` and show the report action.
5. **Send Page (`/send`)**:
   - Demonstrate an **Instant Transfer** (immediate ledger update).
   - Demonstrate an **On-Chain Transfer** (triggers MetaMask transaction broadcast to Polygon Amoy with Polygonscan hash).
6. **Receive Page (`/receive`)**:
   - Enter an amount (e.g., 50 POL) and show the instant QR code and generated deep-link.
7. **Address Book (`/contacts`) & History (`/history`)**:
   - Show saved contacts with 0x addresses and the searchable transaction ledger.

---
*Good luck with your project review!*
