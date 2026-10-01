import os
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")

def get_ai_diagnosis(rpm: float, speed: int, dtc: str) -> str:
    # යතුර ලබා දී නොමැති නම් කේතය ක්‍රියාත්මක වීම වැළැක්වීම
    if not GEMINI_API_KEY.startswith("AIza"):
        return "ERROR: A valid GOOGLE_API_KEY environment variable is required."

    try:
        # නව GenAI SDK වින්‍යාසය
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        prompt = f"""
        You are a highly skilled, strictly analytical automotive diagnostic AI. 
        Analyze the following real-time telemetry data received from a vehicle:
        - Engine RPM: {rpm}
        - Vehicle Speed: {speed} km/h
        - DTC (Diagnostic Trouble Code): {dtc}
        
        Provide a concise, highly technical mechanical diagnosis. Identify potential faults, logical inconsistencies between RPM and Speed, and recommend immediate actions. Keep the output under 4 sentences. Strictly output in Sinhala.
        """
        
        # දත්ත විශ්ලේෂණය
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
        )
        return response.text.strip()
        
    except Exception as e:
        return f"AI Processing Error: {str(e)}"