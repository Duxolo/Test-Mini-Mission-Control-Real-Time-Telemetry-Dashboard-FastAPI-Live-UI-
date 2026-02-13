from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import time
from pathlib import Path


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Stato in RAM (per demo)
latest = {"ts": 0, "pressure": 0, "temp": 0, "vib": 0, "status": "INIT"}
events = []

last_status = "INIT"

fault_mode = False


class Telemetry(BaseModel):
    pressure: float
    temp: float
    vib: float
    status: str = "OK"

@app.get("/dashboard")
def dashboard():
    html = Path("dashboard.html").read_text(encoding="utf-8")
    return HTMLResponse(html)

@app.post("/ingest")
def ingest(t: Telemetry):
    global latest, events, last_status
    latest = {"ts": time.time(), **t.model_dump()}

    # Log solo su transizione (non spam)
    if t.status != last_status:
        if t.status != "OK":
            events.append({"ts": latest["ts"], "msg": f"FAULT: {t.status}"})
        else:
            events.append({"ts": latest["ts"], "msg": "RECOVERED: OK"})
        events = events[-50:]
        last_status = t.status

    return {"ok": True}


@app.get("/latest")
def get_latest():
    return JSONResponse(latest)

@app.get("/events")
def get_events():
    return JSONResponse(events)

@app.post("/fault/on")
def fault_on():
    global fault_mode
    fault_mode = True
    return {"fault_mode": fault_mode}

@app.post("/fault/off")
def fault_off():
    global fault_mode
    fault_mode = False
    return {"fault_mode": fault_mode}

@app.get("/fault")
def fault_state():
    return {"fault_mode": fault_mode}

