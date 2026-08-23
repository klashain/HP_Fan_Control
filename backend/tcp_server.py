import socket
import threading
import json
import time
from fan_control import FanController
from system_info import SystemInfo

class TCPServer:
    def __init__(self, host="127.0.0.1", port=9292):
        self.host = host
        self.port = port
        self.fan_ctrl = FanController()
        self.sys_info = SystemInfo()
        self.clients = []
        self.running = True

    def start(self):
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server.bind((self.host, self.port))
        self.server.listen(5)
        
        # Start broadcast thread
        threading.Thread(target=self._broadcast_loop, daemon=True).start()
        
        while self.running:
            try:
                client, addr = self.server.accept()
                self.clients.append(client)
                threading.Thread(target=self._handle_client, args=(client,), daemon=True).start()
            except Exception:
                pass

    def _broadcast_loop(self):
        tick_count = 0
        while self.running:
            time.sleep(0.1)
            tick_count += 1
            if not self.clients:
                continue
                
            try:
                temps = self.sys_info.get_temperatures()
                
                # Apply curve if in curve mode (throttled to every 0.5s)
                max_temp = max(temps["cpu"], temps["gpu"])
                if tick_count % 5 == 0:
                    self.fan_ctrl.apply_curve(max_temp)
                
                # Continuously enforce current modes to prevent OGH/BIOS overrides
                self.fan_ctrl.enforce_state(tick_count, max_temp)
                
                status = self.fan_ctrl.get_status()
                
                payload = json.dumps({
                    "type": "status_update",
                    "data": {
                        "fan": status,
                        "temperatures": temps
                    }
                }) + "\n"
                
                for c in list(self.clients):
                    try:
                        c.send(payload.encode('utf-8'))
                    except Exception:
                        self.clients.remove(c)
            except Exception as e:
                pass

    def _handle_client(self, client):
        buffer = ""
        while self.running:
            try:
                data = client.recv(4096)
                if not data:
                    break
                buffer += data.decode('utf-8')
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    if line.strip():
                        self._process_command(client, line.strip())
            except Exception:
                break
        if client in self.clients:
            self.clients.remove(client)
        client.close()

    def _process_command(self, client, line):
        try:
            req = json.loads(line)
            cmd = req.get("command")
            self.fan_ctrl.note_user_cmd()
            
            if cmd == "set_power_mode":
                res = self.fan_ctrl.set_power_mode(req.get("mode", "default"), req.get("cpu_limit", 99))
            elif cmd == "set_fan_mode":
                res = self.fan_ctrl.set_fan_mode(req.get("mode", "auto"))
            elif cmd == "set_manual":
                res = self.fan_ctrl.set_manual_speed(req.get("cpu", 50), req.get("gpu", 50))
            elif cmd == "set_curve":
                res = self.fan_ctrl.set_curve(req.get("points", []))
            elif cmd == "set_limits":
                res = self.fan_ctrl.set_limits(req.get("safe_max_rpm", 4000), req.get("ogh_max_rpm", 6490))
            elif cmd == "set_enabled":
                res = self.fan_ctrl.set_enabled(bool(req.get("enabled", True)))
            else:
                return

            client.send((json.dumps({"type": "response", "data": res}) + "\n").encode('utf-8'))
        except Exception:
            pass

if __name__ == "__main__":
    server = TCPServer()
    server.start()
