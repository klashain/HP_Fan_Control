import subprocess
import logging
import math
import time
from typing import Dict, Any, Tuple, List, Optional
from system_info import wmi_lock

logger = logging.getLogger("omen_fan_control")

class HPWMICommands:
    COMMAND_ID = 0x20008
    CMD_SET_FAN_MODE = 0x1A
    CMD_SET_MAX_FAN = 0x27
    CMD_SET_FAN_LEVEL = 0x2E
    CMD_GET_FAN_LEVEL = 0x2D
    CMD_GET_FAN_RPM = 0x11

    MAX_FAN_ON = 0x01
    MAX_FAN_OFF = 0x00

    # Thermal policy values (source: HP.Omen.Core.Common.PowerControl.PerformanceMode)
    # NOTE: Default is 0x30, NOT 0x00. 0x00-0x04 are legacy values and are
    # rejected by modern firmware, which silently breaks returning to auto.
    MODE_DEFAULT = 0x30
    MODE_PERFORMANCE = 0x31
    MODE_COOL = 0x50

class HPWMIInterface:
    def __init__(self):
        self._wmi_available = self._check_wmi()

    def _check_wmi(self) -> bool:
        try:
            cmd = ['powershell', '-NoProfile', '-Command', 'Get-CimInstance -Namespace root\\wmi -ClassName hpqBIntM -ErrorAction Stop | Select-Object -First 1 | ForEach-Object { "OK" }']
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=5, creationflags=0x08000000)
            return "OK" in proc.stdout
        except Exception:
            return False

    def is_available(self) -> bool:
        return self._wmi_available

    def execute_bios_command(self, command_id: int, command_type: int, data: bytes = b"", output_size: str = '0') -> bytes | None:
        if not self._wmi_available:
            return None
            
        data_str = ",".join(str(b) for b in data) if data else "0"
        size_val = len(data) if data else 0
        
        ps_script = f"""
$ErrorActionPreference = 'Stop'
try {{
    if ({size_val} -eq 0) {{
        $inData = New-CimInstance -ClassName hpqBDataIn -Namespace root\\wmi -ClientOnly -Property @{{
            Sign = [byte[]](83,69,67,85)
            Command = [uint32]{command_id}
            CommandType = [uint32]{command_type}
            Size = [uint32]0
        }}
    }} else {{
        $inData = New-CimInstance -ClassName hpqBDataIn -Namespace root\\wmi -ClientOnly -Property @{{
            Sign = [byte[]](83,69,67,85)
            Command = [uint32]{command_id}
            CommandType = [uint32]{command_type}
            Size = [uint32]{size_val}
            hpqBData = [byte[]]({data_str})
        }}
    }}
    $hpq = Get-CimInstance -Namespace root\\wmi -ClassName hpqBIntM | Select-Object -First 1
    $result = Invoke-CimMethod -InputObject $hpq -MethodName hpqBIOSInt{output_size} -Arguments @{{ InData = $inData }}
    
    if ($result.OutData.rwReturnCode -ne 0) {{
        Write-Output "ERROR: $($result.OutData.rwReturnCode)"
    }} elseif ('{output_size}' -ne '0') {{
        if ($result.OutData.Data) {{
            Write-Output ($result.OutData.Data -join ' ')
        }} else {{
            Write-Output "NO_DATA"
        }}
    }} else {{
        Write-Output "OK"
    }}
}} catch {{
    Write-Output "EXCEPTION: $($_.Exception.Message)"
}}
"""
        try:
            with wmi_lock:
                proc = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=10, creationflags=0x08000000)
            out = proc.stdout.strip()
            
            if "ERROR:" in out or "EXCEPTION:" in out:
                return None
            if out == "OK" or out == "NO_DATA" or not out:
                return b""
                
            byte_list = [int(b) for b in out.split() if b.isdigit()]
            return bytes(byte_list)
        except Exception:
            return None

    def read_fan_rpm(self) -> Tuple[int, int]:
        # Real RPM query (0x11), one call per fan.
        # NOTE: 0x2D returns fan LEVELS (0..~58), not RPM.
        if not self._wmi_available:
            return (0, 0)
        cpu = self._read_single_fan_rpm(0x00)
        gpu = self._read_single_fan_rpm(0x01)
        if cpu == 0 and gpu == 0:
            # 0x11 unsupported/failed on this firmware; fall back to the
            # legacy level-based estimate so the UI doesn't flatline.
            est = self._read_level_estimate()
            return est
        return (cpu, gpu)

    def _read_single_fan_rpm(self, fan_index: int) -> int:
        try:
            res = self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_GET_FAN_RPM, bytes([fan_index, 0x00, 0x00, 0x00]), '128')
            if res and len(res) >= 4:
                return (res[2] << 8) | res[3]
        except Exception:
            pass
        return 0

    def _read_level_estimate(self) -> Tuple[int, int]:
        try:
            res = self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_GET_FAN_LEVEL, b"\x00\x00\x00\x00", '128')
            if res and len(res) >= 2:
                # Estimate must use the same curve as the cap logic,
                # otherwise the UI shows values off from the real ones.
                fc = FanController
                return (int(fc.level_to_rpm(fc, res[0])), int(fc.level_to_rpm(fc, res[1])))
        except Exception:
            pass
        return (0, 0)

    def set_fan_speed_percent(self, cpu_percent: int, gpu_percent: int) -> bool:
        cpu_level = int((cpu_percent / 100.0) * 58)
        gpu_level = int((gpu_percent / 100.0) * 58)
        return self.set_fan_levels(cpu_level, gpu_level)

    def set_fan_levels(self, cpu_level: int, gpu_level: int) -> bool:
        if not self._wmi_available:
            return False
        res = self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_SET_FAN_LEVEL, bytes([cpu_level, gpu_level, 0x00, 0x00]), '0')
        return res is not None

    def read_fan_levels(self) -> Optional[Tuple[int, int]]:
        # Single cheap call returning current EC level for BOTH fans
        if not self._wmi_available:
            return None
        try:
            res = self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_GET_FAN_LEVEL, b"\x00\x00\x00\x00", '128')
            if res and len(res) >= 2:
                return (res[0], res[1])
        except Exception:
            pass
        return None

    def set_thermal_policy(self, mode_name: str) -> bool:
        if not self._wmi_available:
            return False
        
        mode_name = mode_name.lower()
        if mode_name == "max":
            self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_SET_MAX_FAN, bytes([HPWMICommands.MAX_FAN_ON, 0x00, 0x00, 0x00]), '0')
            return True
            
        self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_SET_MAX_FAN, bytes([HPWMICommands.MAX_FAN_OFF, 0x00, 0x00, 0x00]), '0')
        
        policy = HPWMICommands.MODE_DEFAULT
        if mode_name == "performance":
            policy = HPWMICommands.MODE_PERFORMANCE
        elif mode_name == "cool":
            policy = HPWMICommands.MODE_COOL
        elif mode_name == "quiet":
            # Modern firmware has no dedicated quiet policy; use Default here,
            # quietness is achieved via the Windows CPU limit.
            policy = HPWMICommands.MODE_DEFAULT
            
        res = self.execute_bios_command(HPWMICommands.COMMAND_ID, HPWMICommands.CMD_SET_FAN_MODE, bytes([0xFF, policy, 0x00, 0x00]), '0')
        return res is not None

class FanController:
    # EC fan levels are 0..58. Linear fit from real measurements:
    #   L26 ~ 2600, L48 ~ 4800  =>  RPM ~= 100 * L
    MAX_LEVEL = 58
    FIT_M = 100.0
    FIT_B = 0.0

    def __init__(self):
        self.wmi = HPWMIInterface()
        self.power_mode = "default"
        self.fan_mode = "manual"
        self.cpu_limit = 99
        self.cpu_speed = 50
        self.gpu_speed = 50
        self.curve_points = [
            {"temp": 40, "speed": 30},
            {"temp": 60, "speed": 50},
            {"temp": 75, "speed": 75},
            {"temp": 90, "speed": 100}
        ]
        self.safe_max_rpm = 4000
        self.ogh_max_rpm = 6490   # kept for protocol compat; no longer used
        self.enabled = True
        self._last_user_cmd = 0.0
        self.max_allowed_level = None
        self._cap_base = None      # level from static calibration
        self.cap_trim = 0          # closed-loop fine adjustment
        self._last_trim_tick = 0
        self._update_allowed_level()
        self._cached_rpm = (0, 0)
        self._last_rpm_time = 0.0
        self._last_cpu_state = None

    def note_user_cmd(self):
        # Rapid mode changes: pause the enforcement loop briefly so it
        # never races against the command the user just sent.
        self._last_user_cmd = time.monotonic()

    def level_to_rpm(self, lvl: float) -> float:
        return self.FIT_M * lvl + self.FIT_B

    def rpm_to_level(self, rpm: float) -> int:
        lvl = (rpm - self.FIT_B) / self.FIT_M
        return max(0, min(self.MAX_LEVEL, int(round(lvl))))

    def cap_active(self) -> bool:
        # Cap is active unless the user sets a limit above the physical max
        return self.safe_max_rpm < int(round(self.level_to_rpm(self.MAX_LEVEL)))

    def set_enabled(self, enabled: bool):
        self.enabled = bool(enabled)
        if self.enabled:
            # Re-apply whatever mode was selected
            if self.fan_mode == "max":
                self._apply_speeds(100, 100)
            elif self.fan_mode == "manual":
                self._apply_speeds(self.cpu_speed, self.gpu_speed)
            elif self.fan_mode == "auto":
                self.wmi.set_thermal_policy(self.power_mode)
            # curve mode: broadcast loop re-applies on its own
        else:
            # Full release: hand everything back to the BIOS
            self.cap_trim = 0
            self._update_allowed_level()
            self.wmi.set_thermal_policy(self.power_mode)
        return self.get_status()

    def _update_allowed_level(self):
        if not self.cap_active():
            self._cap_base = None
            self.max_allowed_level = None
        else:
            self._cap_base = self.rpm_to_level(self.safe_max_rpm)
            self.max_allowed_level = max(1, min(
                self.MAX_LEVEL, self._cap_base + self.cap_trim))

    def _closed_loop_trim(self):
        # Nudge the cap level up/down so measured RPM matches the target.
        # Handles any nonlinearity / model-specific fan curve automatically.
        cpu_rpm, gpu_rpm = self._cached_rpm
        rpm = max(cpu_rpm, gpu_rpm)
        if rpm <= 0:
            return
        err = rpm - self.safe_max_rpm
        old_trim = self.cap_trim
        if err > 120 and self.cap_trim > -8:
            self.cap_trim -= 1
        elif err < -120 and self.cap_trim < 8:
            self.cap_trim += 1
        if self.cap_trim != old_trim:
            self._update_allowed_level()

    def _apply_speeds(self, cpu_pct: float, gpu_pct: float):
        # Percentages are relative to the USER'S safe max (100% == safe limit),
        # so manual/curve can never exceed the configured ceiling.
        top = self.max_allowed_level if self.cap_active() else self.MAX_LEVEL
        cl = min(int(round(cpu_pct / 100.0 * top)), top)
        gl = min(int(round(gpu_pct / 100.0 * top)), top)
        self.wmi.set_fan_levels(cl, gl)

    def set_limits(self, safe_max_rpm: int, ogh_max_rpm: int):
        self.safe_max_rpm = max(0, int(safe_max_rpm))
        self.ogh_max_rpm = max(1, int(ogh_max_rpm))
        self._update_allowed_level()
        # Apply the new cap immediately in every mode that respects it
        if self.fan_mode == "manual" or self.fan_mode == "curve":
            self._apply_speeds(self.cpu_speed, self.gpu_speed)
        return self.get_status()

    def _enforce_auto_cap(self):
        # Level-based ceiling: whenever BIOS drives either fan above the user
        # limit, push it back down. Does not depend on RPM readings.
        if not self.max_allowed_level:
            return
        lv = self.wmi.read_fan_levels()
        if lv is None:
            return
        cpu_lvl, gpu_lvl = lv
        if cpu_lvl > self.max_allowed_level or gpu_lvl > self.max_allowed_level:
            self.wmi.set_fan_levels(self.max_allowed_level, self.max_allowed_level)

    def enforce_state(self, tick_count: int, max_temp: Optional[float] = None):
        # Pasif modda uygulama tamamen cekilir; BIOS yonetir
        if not self.enabled:
            return

        # Yeni komut sonrasi 1 sn zorlama yapma (hizli gecislerde cakisma olmasin)
        if time.monotonic() - self._last_user_cmd < 1.0:
            return

        # Enforce Fan Mode periodically (EC drops it often).
        # Cadence kept low to avoid WMI congestion (responsive UI > brute force).
        if tick_count % 5 == 0:
            if self.fan_mode == "manual":
                self._apply_speeds(self.cpu_speed, self.gpu_speed)
            elif self.fan_mode == "max":
                # Capped full speed: pin levels at the user's ceiling instead
                # of the native MAX command (which ignores all limits).
                self._apply_speeds(100, 100)
            elif self.fan_mode == "auto":
                self._enforce_auto_cap()

        if tick_count % 50 == 0:
            if self.fan_mode == "auto":
                self.wmi.set_thermal_policy(self.power_mode)

        # Closed-loop calibration every ~2 s (always with a fresh reading)
        if self.cap_active() and self.fan_mode in ("auto", "max") \
                and tick_count - self._last_trim_tick >= 20:
            self._last_trim_tick = tick_count
            self._cached_rpm = self.wmi.read_fan_rpm()
            self._last_rpm_time = time.monotonic()
            self._closed_loop_trim()

        # Windows CPU limit only changes for quiet mode; avoid powercfg spam
        if tick_count % 100 == 0:
            wanted = self.cpu_limit if self.power_mode == "quiet" else 100
            if wanted != self._last_cpu_state:
                self.set_windows_cpu_state(wanted)
                self._last_cpu_state = wanted

    def get_status(self) -> Dict[str, Any]:
        now = time.monotonic()
        if self._last_rpm_time == 0.0 or (now - self._last_rpm_time) >= 2.0:
            self._cached_rpm = self.wmi.read_fan_rpm()
            self._last_rpm_time = now

        cpu_rpm, gpu_rpm = self._cached_rpm
        return {
            "power_mode": self.power_mode,
            "fan_mode": self.fan_mode,
            "enabled": self.enabled,
            "fanSpeeds": {"cpu": cpu_rpm, "gpu": gpu_rpm},
            "manualSettings": {"cpu": self.cpu_speed, "gpu": self.gpu_speed},
            "wmi_available": self.wmi.is_available()
        }

    def set_windows_cpu_state(self, max_percent: int):
        try:
            # CPU Power Management Group
            guid_sub = "54533251-82be-4824-96c1-47b60b740d00"
            # Maximum Processor State
            guid_set = "bc5038f7-23e0-4793-88fc-14c1114b6600"
            # Processor Performance Boost Mode
            guid_boost = "be337238-0d82-4146-a960-4f3749d470c7"
            
            subprocess.run(["powercfg", "/setacvalueindex", "SCHEME_CURRENT", guid_sub, guid_set, str(max_percent)], creationflags=0x08000000)
            subprocess.run(["powercfg", "/setdcvalueindex", "SCHEME_CURRENT", guid_sub, guid_set, str(max_percent)], creationflags=0x08000000)
            
            boost_mode = "0" if max_percent < 100 else "2"
            subprocess.run(["powercfg", "/setacvalueindex", "SCHEME_CURRENT", guid_sub, guid_boost, boost_mode], creationflags=0x08000000)
            subprocess.run(["powercfg", "/setdcvalueindex", "SCHEME_CURRENT", guid_sub, guid_boost, boost_mode], creationflags=0x08000000)
            
            subprocess.run(["powercfg", "/setactive", "SCHEME_CURRENT"], creationflags=0x08000000)
        except Exception:
            pass

    def set_power_mode(self, mode: str, cpu_limit: int = 99):
        self.power_mode = mode.lower()
        self.cpu_limit = cpu_limit
        self.wmi.set_thermal_policy(self.power_mode)
        
        # Apply Windows CPU Limit
        if self.power_mode == "quiet":
            self.set_windows_cpu_state(cpu_limit)
        else:
            # Restore 100% for Balanced and Performance
            self.set_windows_cpu_state(100)
            
        # If fan is in auto mode, BIOS takes over using the new thermal policy.
        # If fan is max, re-pin the capped full speed.
        if self.fan_mode == "max":
            self._apply_speeds(100, 100)
        return self.get_status()

    def set_fan_mode(self, mode: str):
        mode = mode.lower()
        if mode == self.fan_mode:
            return self.get_status()  # Ayni mod: islemi tekrarlama
        self.fan_mode = mode
        if self.fan_mode == "auto":
            # Hand control back to BIOS by re-applying the current power mode.
            # This is what releases the EC from a manual fan level override.
            self.wmi.set_thermal_policy(self.power_mode)
            # Immediately apply the cap so BIOS can't exceed it
            self._enforce_auto_cap()
        elif self.fan_mode == "max":
            # Capped full speed (native MAX would ignore the user's limit)
            self._apply_speeds(100, 100)
        elif self.fan_mode == "manual":
            # Send the manual speed immediately
            self._apply_speeds(self.cpu_speed, self.gpu_speed)
        return self.get_status()

    def set_manual_speed(self, cpu: int, gpu: int, force: bool = False):
        new_cpu = max(0, min(100, cpu))
        new_gpu = max(0, min(100, gpu))
        
        if not force and new_cpu == self.cpu_speed and new_gpu == self.gpu_speed:
            return self.get_status()
            
        self.cpu_speed = new_cpu
        self.gpu_speed = new_gpu
        
        if self.fan_mode in ("manual", "curve"):
            self._apply_speeds(self.cpu_speed, self.gpu_speed)
        return self.get_status()

    def set_curve(self, points: list):
        # expects list of dicts: [{"temp": x, "speed": y}, ...]
        self.curve_points = sorted(points, key=lambda p: p["temp"])
        return self.get_status()

    def apply_curve(self, current_temp: float):
        if self.fan_mode != "curve":
            return
            
        if not self.curve_points:
            return

        # Interpolation logic
        target_speed = self.curve_points[0]["speed"]
        for i in range(len(self.curve_points) - 1):
            p1 = self.curve_points[i]
            p2 = self.curve_points[i+1]
            if p1["temp"] <= current_temp <= p2["temp"]:
                ratio = (current_temp - p1["temp"]) / (p2["temp"] - p1["temp"])
                target_speed = p1["speed"] + (p2["speed"] - p1["speed"]) * ratio
                break
        
        if current_temp >= self.curve_points[-1]["temp"]:
            target_speed = self.curve_points[-1]["speed"]
            
        self.set_manual_speed(int(target_speed), int(target_speed))
