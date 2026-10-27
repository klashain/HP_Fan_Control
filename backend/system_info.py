import os
import shutil
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
        self.nvidia_smi = self._find_nvidia_smi()
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
                
            self._poll_gpu()
                
            time.sleep(1.0)

    @staticmethod
    def _find_nvidia_smi():
        """Locate nvidia-smi.exe. PATH lookup alone fails in some cases (e.g. a
        32-bit Python build, where System32 is redirected to SysWOW64)."""
        candidates = [shutil.which("nvidia-smi")]
        windir = os.environ.get("SystemRoot", r"C:\Windows")
        candidates += [
            os.path.join(windir, "Sysnative", "nvidia-smi.exe"),
            os.path.join(windir, "System32", "nvidia-smi.exe"),
            os.path.join(os.environ.get("ProgramW6432", r"C:\Program Files"),
                         "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe"),
        ]
        # DCH drivers also ship a copy inside the driver store
        store = os.path.join(windir, "System32", "DriverStore", "FileRepository")
        try:
            for d in os.listdir(store):
                if d.lower().startswith("nv"):
                    candidates.append(os.path.join(store, d, "nvidia-smi.exe"))
        except OSError:
            pass
        for c in candidates:
            if c and os.path.isfile(c):
                return c
        return None

    def _poll_gpu(self):
        if not self.nvidia_smi:
            return
        try:
            proc = subprocess.run(
                [self.nvidia_smi, "--query-gpu=temperature.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5, creationflags=0x08000000)
            # Take the first numeric line; ignore "[N/A]", blank lines and \r
            for line in proc.stdout.splitlines():
                line = line.strip()
                try:
                    self.gpu_temp = float(line)
                    break
                except ValueError:
                    continue
        except Exception:
            pass

    def get_temperatures(self) -> Dict[str, float]:
        return {"cpu": self.cpu_temp, "gpu": self.gpu_temp}

