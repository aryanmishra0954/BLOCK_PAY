import json
import re
import os
import requests
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(backend_dir)

load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv()

class AIService:
    CANDIDATE_MODELS = [
        "openai/gpt-oss-120b",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
    ]

    def __init__(self):
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.configured_model = os.getenv("GROQ_MODEL", "")

    @property
    def api_key(self):
        key = os.getenv("GROQ_API_KEY", "").strip()
        if not key or key == "your_groq_api_key_here" or key == "gsk_YOUR_GROQ_API_KEY_HERE":
            return ""
        return key

    @staticmethod
    def _get_system_prompt():
        return (
            "You are a BlockPay AI assistant that converts natural language "
            "commands into structured JSON.\n\n"
            "Available actions:\n"
            "1. create_payment - parameters: vendor (name or 0x address), amount (number), currency (POL, ETH, MATIC, etc.), description\n"
            "2. show_pending_payments - parameters: none\n"
            "3. export_report - parameters: period ('all', 'month'), format ('csv')\n"
            "4. set_reminder - parameters: message, date ('YYYY-MM-DD')\n"
            "5. add_client - parameters: name\n"
            "6. check_balance_reminders - parameters: none\n\n"
            "RULES:\n"
            "- Always respond with VALID JSON only (no markdown fences, no explanatory text)\n"
            "- For payments, extract vendor and amount; never invent missing values\n"
            "- Default currency is POL only when a payment amount and recipient are present\n\n"
            "Response format:\n"
            '{\n  "action": "create_payment",\n  "parameters": {\n    "vendor": "Aryan",\n    "amount": 50,\n    "currency": "POL",\n    "description": "Payment to Aryan"\n  }\n}\n'
        )

    def _fallback_parse(self, prompt: str) -> dict:
        p = prompt.strip().lower()

        if any(w in p for w in ["pending", "unpaid", "due"]):
            return {"action": "show_pending_payments", "parameters": {}}

        if any(w in p for w in ["export", "report", "csv", "download"]):
            return {"action": "export_report", "parameters": {"period": "all", "format": "csv"}}

        if any(w in p for w in ["balance", "funds", "how much", "wallet"]):
            return {"action": "check_balance_reminders", "parameters": {}}

        if any(w in p for w in ["add client", "add contact", "new client", "new contact"]):
            name = re.sub(r'.*?(?:client|contact)\s+', '', prompt, flags=re.IGNORECASE).strip()
            return {
                "action": "add_client",
                "parameters": {
                    "name": name or "New Contact"
                }
            }

        if any(w in p for w in ["reminder", "remind"]):
            return {
                "action": "set_reminder",
                "parameters": {
                    "message": prompt,
                    "date": "2026-09-24"
                }
            }

        if not any(w in p for w in ["send", "pay", "transfer", "payment"]):
            return {"action": "unsupported", "parameters": {}, "message": "I can only process supported BlockPay commands."}

        amt = None
        amt_match = re.search(r'(?:\b(?:send|pay|transfer)\s+|\bof\s+|[$€£₹]\s*)(-?\d+(?:\.\d+)?)\b', prompt, re.IGNORECASE)
        if amt_match:
            try:
                amt = float(amt_match.group(1))
            except ValueError:
                amt = None

        curr = "POL"
        curr_match = re.search(r'\b(POL|MATIC|ETH|BTC|USD|EUR|INR)\b', prompt, re.IGNORECASE)
        if curr_match:
            curr = curr_match.group(1).upper()

        recipient = None
        to_match = re.search(r'(?:to|for)\s+([0-9a-zA-Z._-]+)', prompt, re.IGNORECASE)
        if to_match:
            recipient = to_match.group(1).strip()
        else:
            addr_match = re.search(r'(0x[a-fA-F0-9]{40})', prompt)
            if addr_match:
                recipient = addr_match.group(1)

        if amt is None or not recipient:
            return {"action": "create_payment", "parameters": {
                "vendor": recipient or "", "recipient": recipient or "", "amount": amt,
                "currency": curr, "description": ""
            }}

        return {
            "action": "create_payment",
            "parameters": {
                "vendor": recipient,
                "recipient": recipient,
                "amount": amt,
                "currency": curr,
                "description": f"Payment to {recipient}"
            }
        }

    def generate_command(self, prompt: str) -> dict:
        key = self.api_key
        if not key:
            print("[AI] No valid GROQ_API_KEY found. Using fast deterministic NLP fallback.")
            return self._fallback_parse(prompt)

        models_to_try = []
        if self.configured_model:
            models_to_try.append(self.configured_model)
        for m in self.CANDIDATE_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        for model_name in models_to_try:
            try:
                response = requests.post(
                    self.api_url,
                    json={
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": self._get_system_prompt()},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                        "max_tokens": 400,
                    },
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10,
                )

                if response.status_code == 200:
                    ai_text = response.json()["choices"][0]["message"]["content"]
                    parsed = self._clean_and_parse_json(ai_text)
                    print(f"[OK] AI Response ({model_name}): {parsed.get('action')}")
                    return parsed
                elif response.status_code in [400, 404]:
                    continue
                elif response.status_code == 429:
                    print("[AI] Rate limited on Groq. Using fallback parser.")
                    return self._fallback_parse(prompt)
                elif response.status_code == 401:
                    print("[AI] Invalid Groq API Key. Using fallback parser.")
                    return self._fallback_parse(prompt)
            except Exception as err:
                print(f"[AI] Model {model_name} attempt failed: {err}")
                continue

        print("[AI] All Groq model calls exhausted. Using robust NLP fallback.")
        return self._fallback_parse(prompt)

    @staticmethod
    def _clean_and_parse_json(text: str) -> dict:
        cleaned = re.sub(r"```json\s*", "", text)
        cleaned = re.sub(r"```\s*", "", cleaned)
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            cleaned = match.group(0)
        parsed = json.loads(cleaned)
        if "action" not in parsed:
            raise ValueError("Missing 'action' field in JSON")
        return parsed

ai_service = AIService()

