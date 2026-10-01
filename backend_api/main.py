from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import datetime
from ai_engine import get_ai_diagnosis

app = FastAPI()

# අවසන් වරට ලැබුණු දත්ත සහ AI විශ්ලේෂණය ගබඩා කිරීමට
latest_data = {
    "rpm": 0.0,
    "speed": 0,
    "dtc": "NONE",
    "ai_diagnosis": "Waiting for data...",
    "last_updated": "N/A"
}

class TelemetryData(BaseModel):
    rpm: float
    speed: int
    dtc: Optional[str] = "NONE"

# ESP-32 මගින් දත්ත එවන ස්ථානය (POST)
@app.post("/diagnose/")
async def receive_telemetry(data: TelemetryData):
    current_time = datetime.datetime.now().strftime("%H:%M:%S")
    
    print(f"\n[{current_time}] [SYSTEM] Aggregated Data Received:")
    print(f" -> RPM: {data.rpm} | Speed: {data.speed} km/h | DTC: {data.dtc}")
    print("[SYSTEM] Requesting AI Diagnosis from Gemini API...")
    
    ai_result = get_ai_diagnosis(rpm=data.rpm, speed=data.speed, dtc=data.dtc)
    
    print("[SYSTEM] AI Diagnosis Result:")
    print("=" * 40)
    print(ai_result)
    print("=" * 40)
    
    # නවතම දත්ත ගබඩා කිරීම
    latest_data["rpm"] = data.rpm
    latest_data["speed"] = data.speed
    latest_data["dtc"] = data.dtc
    latest_data["ai_diagnosis"] = ai_result
    latest_data["last_updated"] = current_time
    
    return {"status": "success", "ai_diagnosis": ai_result}

# Streamlit මගින් දත්ත ලබාගන්නා ස්ථානය (GET)
@app.get("/get_latest_data/")
async def get_latest_data():
    return latest_data