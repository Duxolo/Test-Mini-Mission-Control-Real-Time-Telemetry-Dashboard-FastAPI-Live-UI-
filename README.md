# Mini Mission Control — Real-Time Telemetry Dashboard (FastAPI)

This project is a small “mission control” style telemetry system I built as a **testing/demo example**.  
It simulates a vehicle/subsystem streaming telemetry to a ground dashboard, with a focus on **real-time data flow**, **monitoring UI**, and **basic anomaly handling** — the kind of workflow you’d typically see around validation and integration testing.

The goal is simple: **generate telemetry → ingest it → visualize it live → inject faults → verify recovery**.

---

## What it does

- **Simulator (Python)** generates telemetry packets at a fixed rate and sends them to the backend.
- **Backend (FastAPI)** receives telemetry, stores the latest sample in RAM, and maintains a small event log.
- **Dashboard (HTML/CSS/JS)** displays:
  - Live values (pressure, vibration, status)
  - A temperature gauge (tachometer style)
  - A real-time chart (temperature + pressure)
  - An event log (faults / recovery)
  - A subtle aerospace-style background (rocket visuals), with micro “shake” driven by vibration telemetry
- **Fault injection** buttons toggle a simulated anomaly (e.g. `OVERTEMP`) and verify the UI/logic responds correctly.

This is intentionally lightweight and easy to run locally, so it can be used as a quick sandbox for UI + backend telemetry testing.

---

## What it simulates

The simulator produces a small set of typical “health monitoring” signals:

- **Pressure** (nominal around 8.0 bar with noise)
- **Temperature** (nominal around 45°C with noise)
- **Vibration** (nominal around 0.8 g with noise)
- **Status**
  - `OK` in nominal mode
  - `OVERTEMP` in fault mode (temperature forced high)

On the dashboard, `OVERTEMP` triggers red status and event logging. Reset returns to `OK`.

---

## Tech stack

**Backend**
- `fastapi` — HTTP API + dashboard endpoint
- `uvicorn` — ASGI server
- `pydantic` — telemetry schema validation

**Simulator**
- `requests` — sends telemetry packets to the backend

**Frontend**
- Vanilla **HTML/CSS/JavaScript**
- Canvas chart (no external chart libraries)

---

## Project structure

```

space/
server.py
simulator.py
dashboard.html
static/
styles.css
dashboard.js

````

---

## How to run (local)

### 1) Install dependencies
```bash
pip install fastapi uvicorn pydantic requests
````

### 2) Start the backend

From the project folder:

```bash
uvicorn server:app --reload
```

### 3) Open the dashboard

```text
http://127.0.0.1:8000/dashboard
```

### 4) Start the simulator (new terminal)

```bash
python simulator.py
```

Now you should see live telemetry updating on the dashboard.

---

## Fault injection (testing)

The UI includes two controls:

* **Inject Fault** → forces `OVERTEMP` (temperature rises and status becomes red)
* **Reset Fault** → returns to nominal `OK`

This is a simple pattern I use for testing: verify that:

* telemetry ingestion is continuous,
* the UI updates under normal conditions,
* faults are detected and logged,
* recovery is handled cleanly.


## Notes / design choices

* The backend keeps state **in RAM** on purpose (demo/testing focus).
  No database is required.
* The UI refreshes every ~300ms and is designed to remain readable and stable.
* The event log is meant to represent what you’d usually forward into a more structured logging pipeline during integration testing.


## Why this exists

I built this as a compact example of how I approach **telemetry streaming + monitoring** in a clean, testable way.
Even though it’s a small project, the structure maps well to real scenarios: simulated sources, ingestion endpoint, monitoring UI, anomaly injection, and recovery checks — a practical baseline for validation and integration workflows.


