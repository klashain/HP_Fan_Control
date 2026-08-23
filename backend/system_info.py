import subprocess
import threading
import time
from typing import Dict, Any

# Global lock to prevent concurrent WMI powershell calls which can crash the WMI provider
wmi_lock = threading.Lock()

class SystemInfo:
    def __init__(self):
        self.cpu_temp = 0.0
        self.gpu_temp = 0.0
        self.running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()
        
    def _poll_loop(self):
        # We use powershell because wmic is removed in newer Windows 11 builds
        ps_script = 'Get-CimInstance -Namespace root\\wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentTemperature'
        
        while self.running:
            try:
                with wmi_lock:
                    proc = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=5, creationflags=0x08000000)
                if proc.stdout.strip().isdigit():
                    self.cpu_temp = (int(proc.stdout.strip()) - 2732) / 10.0
            except Exception:
                pass
                
            try:
                proc = subprocess.run(["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"], capture_output=True, text=True, timeout=5, creationflags=0x08000000)
                if proc.stdout.strip().isdigit():
                    self.gpu_temp = float(proc.stdout.strip())
            except Exception:
                pass
                
            time.sleep(1.0)

    def get_temperatures(self) -> Dict[str, float]:
        return {"cpu": self.cpu_temp, "gpu": self.gpu_temp}

