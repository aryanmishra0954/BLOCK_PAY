"""
Groq AI integration for BlockPay.
Converts natural-language prompts into structured JSON commands
using the Groq API (LLaMA 3.3-70B-versatile).
"""

import json
import re
import os
from dotenv import load_dotenv

import requests

load_dotenv()

class AIService:
    """Calls Groq's chat-completion API and parses the JSON response."""

    def __init__(self):
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    @property
    def api_key(self):
        return os.getenv("GROQ_API_KEY", "")

    @staticmethod
    def _get_system_prompt():
        return (
            "You are a BlockPay AI assistant that converts natural language "
            "commands into structured JSON.\n\n"
            "Available actions:\n"
            "1. create_payment - Create a new payment\n"
            "2. show_pending_payments - Show all pending payments\n"
            "3. export_report - Export payment reports\n"
            "4. set_reminder - Set a reminder\n"
            "5. add_client - Add a new client\n"
            "6. check_balance_reminders - Check upcoming payments and warn "
            "if balance is low\n\n"
            "RULES:\n"
            "- Always respond with VALID JSON only (no markdown, no code blocks)\n"
            "- Use the exact action names listed above\n"
            "- For dates: convert relative dates (tomorrow, Monday, next week) "
            "to ISO format\n"
            "- For amounts: extract numeric values and currency\n"
            "- Include all relevant parameters based on the action\n\n"
            "Response format:\n"
            '{\n  "action": "action_name",\n  "parameters": { ... }\n}\n\n'
            "Examples:\n"
            'Input: "Create a payment for ₹12,000 to Ditre Italia due Monday"\n'
            'Output: {"action":"create_payment","parameters":{"amount":12000,'
            '"currency":"INR","recipient":"Ditre Italia",'
            '"dueDate":"2025-12-02T00:00:00.000Z",'
            '"description":"Payment to Ditre Italia"}}\n\n'
            'Input: "Show me all pending payments"\n'
            'Output: {"action":"show_pending_payments","parameters":{}}\n\n'
            "Input: \"Check if I have enough balance for tomorrow's payments\"\n"
            'Output: {"action":"check_balance_reminders","parameters":{}}'
        )

    def generate_command(self, prompt: str) -> dict:
        """Send *prompt* to Groq and return the parsed JSON command."""

        if not self.api_key or self.api_key == "gsk_YOUR_GROQ_API_KEY_HERE":
            raise RuntimeError(
                "GROQ_API_KEY not configured. Please set it in backend_flask/.env "
                "file. Get free key at: https://console.groq.com/keys"
            )

        try:
            print("[AI] Calling Groq AI...")

            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )

            if response.status_code != 200:
                error_body = response.json()
                error_msg = (
                    error_body.get("error", {}).get("message")
                    or response.reason
                )
                raise RuntimeError(f"Groq API error: {error_msg}")

            ai_text = response.json()["choices"][0]["message"]["content"]
            print(f"[OK] AI Response: {ai_text}")

            return self._clean_and_parse_json(ai_text)

        except requests.exceptions.Timeout:
            raise RuntimeError("AI request timeout - please try again")
        except requests.exceptions.ConnectionError:
            raise RuntimeError("Cannot reach Groq API - check your network")
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(f"AI service error: {exc}") from exc

    @staticmethod
    def _clean_and_parse_json(text: str) -> dict:
        """Strip markdown fences, extract the JSON object, and parse it."""

        try:
            cleaned = re.sub(r"```json\s*", "", text)
            cleaned = re.sub(r"```\s*", "", cleaned)

            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                cleaned = match.group(0)

            parsed = json.loads(cleaned)

            if "action" not in parsed:
                raise ValueError("Missing 'action' field in JSON")

            return parsed

        except (json.JSONDecodeError, ValueError) as exc:
            print(f"JSON Parse Error: {exc}")
            print(f"Raw text: {text}")
            raise RuntimeError(
                f"Invalid JSON response from AI: {exc}"
            ) from exc

ai_service = AIService()
