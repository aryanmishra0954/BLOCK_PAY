# FlowPay - AI-Powered Payment Management System

A modern payment management system built with blockchain technology and AI-powered natural language processing for Polygon network.

## Website Link - https://teamflowpay.vercel.app/

## Features

### Core Features

- 🔐 Secure Web3Auth authentication
- 💳 Cryptocurrency payments on Polygon network
- 📊 Real-time balance tracking
- 📝 Transaction history
- 🌓 Dark mode support
- 📱 Responsive design

### AI-Powered Features

- 🤖 Natural language command processing
- 💬 Conversational payment creation
- 📋 Automated payment management
- 🔔 Smart balance reminders
- 📊 Intelligent report generation
- 💾 Command history with replay functionality

## Tech Stack

### Frontend

- HTML5, CSS3, JavaScript (ES6+)
- TailwindCSS for styling
- Firebase Firestore for data persistence
- Web3Auth for authentication
- Ethers.js for blockchain interactions

### Backend

- Node.js with Express.js
- Groq AI (llama-3.3-70b-versatile) for NLP
- Axios for API requests
- CORS enabled
- Serverless deployment ready

### Blockchain

- Polygon Amoy Testnet
- POL (Polygon) token
- Smart contract interactions

## Installation

### Prerequisites

- Node.js v18+ installed
- Git installed
- A Groq API key (free at https://console.groq.com/keys)

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/siddharthjha-30/teamflowpay.git
cd teamflowpay/backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
GROQ_API_KEY=your_groq_api_key_here
```

4. Start the server:

```bash
npm start
```

Backend will run at: `http://localhost:3000`

### Frontend Setup

1. Open `index.html` in a web browser or use a local server:

```bash
python -m http.server 5500
```

2. Access the application at `http://127.0.0.1:5500`

## AI Command System

### Available Commands

The AI agent understands natural language and can execute these actions:

1. **Create Payment**

   - "Create a payment for ₹12,000 to Ditre Italia due Monday"
   - "Add new payment of 5000 INR to Acme Corp tomorrow"

2. **Show Pending Payments**

   - "Show me all pending payments"
   - "List outstanding payments"

3. **Export Reports**

   - "Export monthly report"
   - "Generate payment report for last week"

4. **Set Reminders**

   - "Remind me to pay vendor tomorrow"
   - "Set reminder for invoice on Friday"

5. **Add Client**

   - "Add new client called TechCorp"
   - "Register vendor named GlobalSupply"

6. **Check Balance**
   - "Check if I have enough balance for tomorrow's payments"
   - "Warn me about low balance"

### API Endpoints

#### POST /api/agent/command

Process natural language command with AI.

**Request:**

```json
{
  "prompt": "Create a payment for ₹12,000 to Ditre Italia due Monday"
}
```

**Response:**

```json
{
  "success": true,
  "prompt": "Create a payment for ₹12,000 to Ditre Italia due Monday",
  "action": "create_payment",
  "command": {
    "action": "create_payment",
    "parameters": {
      "amount": 12000,
      "currency": "INR",
      "recipient": "Ditre Italia",
      "dueDate": "2025-12-02T00:00:00.000Z"
    }
  },
  "data": {
    "id": "uuid",
    "vendor": "Ditre Italia",
    "amount": 12000,
    "due_date": "2025-12-02"
  }
}
```

#### POST /api/agent/execute

Execute a pre-formed JSON command.

**Request:**

```json
{
  "action": "show_pending_payments",
  "parameters": {}
}
```

#### GET /api/agent/actions

Get list of available actions.

#### GET /health

Health check endpoint.

## Deployment

### Deploy to Vercel

#### Backend Deployment

1. Push code to GitHub

2. Go to https://vercel.com/new

3. Import your repository

4. Configure:

   - **Root Directory:** `backend`
   - **Framework:** Other
   - **Build Command:** (leave empty)
   - **Install Command:** `npm install`

5. Add environment variables:

   - `GROQ_API_KEY` - Your Groq API key
   - `NODE_ENV` - `production`
   - `ALLOWED_ORIGINS` - Your frontend URL

6. Deploy

#### Frontend Deployment

1. Go to https://vercel.com/new

2. Import same repository

3. Configure:

   - **Root Directory:** `./` (root)
   - **Framework:** Other

4. Update `js/config.js` with your backend URL:

```javascript
url: "https://your-backend.vercel.app";
```

5. Deploy

## Project Structure

```
teamflowpay/
├── backend/
│   ├── services/
│   │   ├── aiService.js          # Groq AI integration
│   │   └── commandExecutor.js    # Command execution logic
│   ├── routes/
│   │   └── agent.js               # API routes
│   ├── data/
│   │   └── database.js            # In-memory database
│   ├── server.js                  # Express server
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
├── js/
│   ├── auth.js                    # Authentication logic
│   ├── config.js                  # Configuration
│   ├── dashboard.js               # Dashboard logic
│   ├── firebase-config.js         # Firebase setup
│   ├── firebase-service.js        # Firebase operations
│   ├── theme.js                   # Dark mode toggle
│   └── ...
├── css/
│   └── styles.css
├── assets/
│   └── images/
├── index.html                     # Landing page
├── dashboard.html                 # Main dashboard
├── send.html                      # Send payment
├── receive.html                   # Receive payment
├── history.html                   # Transaction history
├── profile.html                   # User profile
├── vercel.json                    # Frontend Vercel config
└── README.md
```

## Configuration

### Environment Variables

Backend `.env` file:

```env
PORT=3000
NODE_ENV=development|production
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
GROQ_API_KEY=your_groq_api_key_here
```

### Firebase Configuration

Update `js/firebase-config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

## Development

### Running Locally

1. Start backend:

```bash
cd backend
npm start
```

2. Open frontend in browser:

```bash
open index.html
```

### Testing AI Commands

1. Open dashboard

2. Find "AI Command Agent" section

3. Type natural language commands:
   - "Create a payment for ₹5000 to Test Corp due tomorrow"
   - "Show pending payments"
   - "Check balance reminders"

## Security

- Environment variables protected by `.gitignore`
- API key stored securely in backend
- CORS configured for allowed origins only
- Firebase security rules configured
- Wallet private keys never exposed

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see LICENSE file for details

## Contributors

- Siddharth Jha (@siddharthjha-30)

## Support

For issues and questions:

- GitHub Issues: https://github.com/siddharthjha-30/teamflowpay/issues
- Email: siddharthjha-30@github.com

## Acknowledgments

- Groq AI for free and fast AI inference
- Polygon for blockchain infrastructure
- Vercel for hosting
- Firebase for data storage
- Web3Auth for authentication
