"use strict";

/**
 * FlowPay AI Command Agent
 * Natural Language → JSON → Execute Action
 *
 * Supported AI Providers:
 * - Google Gemini (FREE tier available)
 * - OpenAI (GPT-4, GPT-3.5)
 * - Groq (FREE tier available)
 * - Anthropic Claude
 * - Ollama (FREE, local)
 */

class FlowPayAgent {
  constructor() {
    this.apiKey = null;
    this.provider = "gemini"; // default to free provider
    this.backendUrl = CONFIG.app.url || "http://localhost:3000";
    this.conversationHistory = [];
  }

  /**
   * Initialize the agent with API key and provider
   * @param {string} apiKey - API key for the provider
   * @param {string} provider - 'gemini' (free), 'openai', 'groq' (free), 'claude', 'ollama' (free, local)
   */
  init(apiKey, provider = "gemini") {
    this.apiKey = apiKey;
    this.provider = provider.toLowerCase();
  }

  /**
   * Main function to process natural language commands
   * @param {string} prompt - User's natural language command
   * @returns {Promise<object>} Result from backend execution
   */
  async runAICommand(prompt) {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Command cannot be empty");
    }

    try {
      // Step 1: Convert natural language to JSON using AI
      const jsonCommand = await this.generateJSONCommand(prompt);

      // Step 2: Send JSON to backend for execution
      const result = await this.executeCommand(jsonCommand);

      // Step 3: Save to Firebase for history/replay (non-blocking)
      if (typeof firebaseService !== "undefined") {
        try {
          await firebaseService.saveAICommand(
            this.getUserId(),
            {
              prompt: prompt,
              action: jsonCommand.action,
              jsonCommand: jsonCommand,
            },
            result
          );
        } catch (fbError) {
          // Silently fail - don't break command execution
          console.warn(
            "⚠️ Could not save to Firebase (command still executed successfully)"
          );
        }
      }

      // Update conversation history (in-memory)
      this.conversationHistory.push({
        prompt,
        command: jsonCommand,
        result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error("AI Command Error:", error);

      // Save failed command to Firebase too (non-blocking)
      if (typeof firebaseService !== "undefined") {
        try {
          await firebaseService.saveAICommand(
            this.getUserId(),
            {
              prompt: prompt,
              action: "error",
              jsonCommand: null,
            },
            {
              success: false,
              error: error.message,
            }
          );
        } catch (fbError) {
          // Silently fail
          console.warn("⚠️ Could not save error to Firebase");
        }
      }

      throw error;
    }
  }

  /**
   * Get user ID for Firebase (use wallet address or session ID)
   */
  getUserId() {
    // Try to get wallet address first
    const walletAddress = localStorage.getItem("walletAddress");
    if (walletAddress) return walletAddress;

    // Otherwise use/create a session ID
    let sessionId = localStorage.getItem("flowpay_session_id");
    if (!sessionId) {
      sessionId =
        "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("flowpay_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Generate JSON command from natural language using AI
   * @param {string} prompt - User's natural language command
   * @returns {Promise<object>} JSON command object
   */
  async generateJSONCommand(prompt) {
    const systemPrompt = this.getSystemPrompt();

    try {
      let jsonText;

      switch (this.provider) {
        case "gemini":
          jsonText = await this.callGemini(prompt, systemPrompt);
          break;
        case "openai":
          jsonText = await this.callOpenAI(prompt, systemPrompt);
          break;
        case "groq":
          jsonText = await this.callGroq(prompt, systemPrompt);
          break;
        case "claude":
          jsonText = await this.callClaude(prompt, systemPrompt);
          break;
        case "ollama":
          jsonText = await this.callOllama(prompt, systemPrompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      // Clean and parse JSON response
      jsonText = this.cleanJSONResponse(jsonText);
      const jsonCommand = JSON.parse(jsonText);

      // Validate the command structure
      if (!jsonCommand.action) {
        throw new Error("Invalid command: missing action field");
      }

      return jsonCommand;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Failed to parse AI response as JSON");
      }
      throw error;
    }
  }

  /**
   * Clean JSON response from AI (remove markdown, extra text)
   */
  cleanJSONResponse(text) {
    // Remove markdown code blocks
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    // Remove any text before first { or [
    const firstBrace = text.indexOf("{");
    if (firstBrace > 0) {
      text = text.substring(firstBrace);
    }
    // Remove any text after last } or ]
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace > 0 && lastBrace < text.length - 1) {
      text = text.substring(0, lastBrace + 1);
    }
    return text.trim();
  }

  /**
   * Call Google Gemini API (FREE tier available)
   */
  async callGemini(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error(
        "Google Gemini API key not configured. Get free key at: https://makersuite.google.com/app/apikey"
      );
    }

    // Try multiple model names for compatibility
    const model = "gemini-pro";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nUser: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or 'gpt-4' if you have access
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Groq API (FREE tier available, very fast)
   */
  async callGroq(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error(
        "Groq API key not configured. Get free key at: https://console.groq.com"
      );
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Updated model - fast and free
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Groq API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Anthropic Claude API
   */
  async callClaude(prompt, systemPrompt) {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Claude API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Call Ollama (local, FREE, no API key needed)
   */
  async callOllama(prompt, systemPrompt) {
    const ollamaUrl = "http://localhost:11434";

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3.1", // or 'mistral', 'codellama'
          prompt: `${systemPrompt}\n\nUser: ${prompt}`,
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Ollama not running. Install from https://ollama.ai and run: ollama pull llama3.1"
        );
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(
        "Ollama connection failed. Make sure Ollama is installed and running on port 11434"
      );
    }
  }

  /**
   * Execute the JSON command on the backend
   * @param {object} command - JSON command object
   * @returns {Promise<object>} Execution result
   */
  async executeCommand(command) {
    try {
      const response = await fetch(`${this.backendUrl}/api/agent/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(command),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Command execution failed");
      }

      return result;
    } catch (error) {
      throw new Error(`Backend execution error: ${error.message}`);
    }
  }

  /**
   * Get the system prompt for Claude
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    const today = new Date();
    const currentDate = today.toISOString().split("T")[0];

    return `You are FlowPay Command Agent, an AI assistant that converts user messages into JSON instructions for a payment management system.

CRITICAL RULES:
1. Output ONLY valid JSON. No explanations, no markdown, no extra text.
2. Always include "action" field with one of: create_payment, show_pending_payments, export_report, set_reminder, add_client, check_balance_reminders
3. Include "data" object with relevant fields for the action
4. Use ISO date format (YYYY-MM-DD) for all dates
5. Current date is ${currentDate}

DATE PARSING RULES:
- "today" = ${currentDate}
- "tomorrow" = ${this.getRelativeDate(1)}
- "next week" = ${this.getRelativeDate(7)}
- "Monday", "Tuesday", etc. = next occurrence of that day
- "end of month" = last day of current month
- Month names = first day of that month if year not specified

AMOUNT PARSING:
- Extract numeric values from text (e.g., "₹12,000" → 12000)
- Support INR (₹), USD ($), POL symbols
- Default currency: INR

EXAMPLES:

User: "Create a payment entry for ₹12,000 for Ditre Italia due on Monday."
Output:
{"action":"create_payment","data":{"vendor":"Ditre Italia","amount":12000,"currency":"INR","due_date":"${this.getNextWeekday(
      1
    )}"}}

User: "Show all pending invoices."
Output:
{"action":"show_pending_payments","data":{"filter":"all"}}

User: "Export November report."
Output:
{"action":"export_report","data":{"period":"November","format":"csv"}}

User: "Set reminder to pay electricity bill next Friday."
Output:
{"action":"set_reminder","data":{"message":"Pay electricity bill","date":"${this.getNextWeekday(
      5
    )}"}}

User: "Add new client Acme Corp with email contact@acme.com"
Output:
{"action":"add_client","data":{"name":"Acme Corp","email":"contact@acme.com"}}

User: "Show pending payments for Gamma"
Output:
{"action":"show_pending_payments","data":{"filter":"all","vendor":"Gamma"}}

User: "Check if I have enough balance for upcoming payments" or "Do I need to add funds?"
Output:
{"action":"check_balance_reminders","data":{"balance":USER_CURRENT_BALANCE,"walletAddress":"USER_WALLET"}}
Note: For balance checks, you need to get the actual balance from the wallet. Use placeholder values if not available.

Now convert the user's message into JSON:`;
  }

  /**
   * Get relative date from today
   * @param {number} days - Days to add
   * @returns {string} ISO date string
   */
  getRelativeDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  /**
   * Get next occurrence of a weekday
   * @param {number} targetDay - Day of week (0=Sunday, 1=Monday, etc.)
   * @returns {string} ISO date string
   */
  getNextWeekday(targetDay) {
    const date = new Date();
    const currentDay = date.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilTarget);
    return date.toISOString().split("T")[0];
  }

  /**
   * Get authentication token from localStorage
   * @returns {string} Auth token
   */
  getAuthToken() {
    return localStorage.getItem("flowpay_token") || "";
  }

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}

// Create global instance
window.flowPayAgent = new FlowPayAgent();

// Helper function for easy access
async function runAICommand(prompt) {
  return await window.flowPayAgent.runAICommand(prompt);
}
