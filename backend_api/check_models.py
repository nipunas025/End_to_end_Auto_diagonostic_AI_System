import os

from google import genai

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")

try:
    if not GEMINI_API_KEY.startswith("AIza"):
        raise ValueError("Set GOOGLE_API_KEY before running this script.")

    client = genai.Client(api_key=GEMINI_API_KEY)
    print("\n[SYSTEM] Fetching available models for your API key...")
    
    # පවතින සියලුම ආකෘති ලැයිස්තුගත කිරීම
    for model in client.models.list():
        print(f" -> {model.name}")
        
except Exception as e:
    print(f"[SYSTEM] Error fetching models: {e}")