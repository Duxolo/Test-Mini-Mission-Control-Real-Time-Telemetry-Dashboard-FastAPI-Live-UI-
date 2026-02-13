import time
import random
import requests

SERVER = "http://127.0.0.1:8000"

def get_fault_mode():
    try:
        r = requests.get(f"{SERVER}/fault", timeout=1.0)
        return bool(r.json().get("fault_mode", False))
    except Exception:
        return False

def gen_packet(fault_mode: bool):
    pressure = 8.0 + random.uniform(-0.3, 0.3)
    temp = 45.0 + random.uniform(-1.5, 1.5)
    vib = 0.8 + random.uniform(-0.2, 0.2)
    status = "OK"

    if fault_mode:
        temp = 95.0 + random.uniform(-2, 2)
        status = "OVERTEMP"

    return {"pressure": pressure, "temp": temp, "vib": vib, "status": status}

if __name__ == "__main__":
    print("SIM start. Ctrl+C to stop.")
    while True:
        fault = get_fault_mode()
        pkt = gen_packet(fault)
        try:
            requests.post(f"{SERVER}/ingest", json=pkt, timeout=1.0)
        except Exception as e:
            print("Send error:", e)
        time.sleep(0.1)
