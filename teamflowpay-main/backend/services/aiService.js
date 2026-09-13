const axios = require("axios");

class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    this.model = "llama-3.3-70b-versatile";
  }

  getSystemPrompt() {
    return `You are a FlowPay AI assistant that converts natural language commands into structured JSON.

Available actions:
1. create_payment - Create a new payment
2. show_pending_payments - Show all pending payments
3. export_report - Export payment reports
4. set_reminder - Set a reminder
5. add_client - Add a new client
6. check_balance_reminders - Check upcoming payments and warn if balance is low

RULES:
- Always respond with VALID JSON only (no markdown, no code blocks)
- Use the exact action names listed above
- For dates: convert relative dates (tomorrow, Monday, next week) to ISO format
- For amounts: extract numeric values and currency
- Include all relevant parameters based on the action

Response format:
{
  "action": "action_name",
  "parameters": { ... }
}

Examples:
Input: "Create a payment for ₹12,000 to Ditre Italia due Monday"
Output: {"action":"create_payment","parameters":{"amount":12000,"currency":"INR","recipient":"Ditre Italia","dueDate":"2025-12-02T00:00:00.000Z","description":"Payment to Ditre Italia"}}

Input: "Show me all pending payments"
Output: {"action":"show_pending_payments","parameters":{}}

Input: "Check if I have enough balance for tomorrow's payments"
Output: {"action":"check_balance_reminders","parameters":{}}`;
  }

  async generateCommand(prompt) {
    if (!this.apiKey || this.apiKey === "gsk_YOUR_GROQ_API_KEY_HERE") {
      throw new Error(
        "GROQ_API_KEY not configured. Please set it in backend/.env file. Get free key at: https://console.groq.com/keys"
      );
    }

    try {
      console.log("🤖 Calling Groq AI...");

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content: this.getSystemPrompt(),
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      console.log("✅ AI Response:", aiResponse);

      const jsonCommand = this.cleanAndParseJSON(aiResponse);
      return jsonCommand;
    } catch (error) {
      console.error("❌ AI Service Error:", error.message);

      if (error.response) {
        throw new Error(
          `Groq API error: ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error("AI request timeout - please try again");
      } else {
        throw new Error(`AI service error: ${error.message}`);
      }
    }
  }

  cleanAndParseJSON(text) {
    try {
      let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      if (!parsed.action) {
        throw new Error("Missing 'action' field in JSON");
      }

      return parsed;
    } catch (error) {
      console.error("JSON Parse Error:", error.message);
      console.error("Raw text:", text);
      throw new Error(`Invalid JSON response from AI: ${error.message}`);
    }
  }
}

module.exports = new AIService();
