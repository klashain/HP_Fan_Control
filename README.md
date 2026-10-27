<p align="center">
  <img src="build/icon_256.png" width="110" alt="OMEN Fan Control icon">
</p>

<h1 align="center">OMEN Fan Control</h1>

<p align="center">
  <b>Lightweight, open-source fan control for HP OMEN laptops on Windows.</b><br>
  Custom fan curves · manual speed · power modes · live temps & RPM — a small alternative to OMEN Gaming Hub's fan settings.
</p>

<p align="center">
  <a href="https://github.com/klashain/HP_Fan_Control/releases/latest"><img src="https://img.shields.io/github/v/release/klashain/HP_Fan_Control?label=download&color=2ea44f" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white" alt="Windows 10 | 11">
  <img src="https://img.shields.io/badge/Electron-%2B%20Python-47848F?logo=electron&logoColor=white" alt="Electron + Python">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/klashain/HP_Fan_Control" alt="MIT license"></a>
  <a href="https://claude.ai"><img src="https://img.shields.io/badge/Built%20with-Claude-D97757?logo=claude&logoColor=white" alt="Built with Claude"></a>
</p>

<p align="center">
  <b>English</b> · <a href="README.tr.md">Türkçe</a>
</p>

> Not affiliated with HP. Use at your own risk.

## Features

- Real-time CPU / GPU temperature monitoring
- Fan RPM display (CPU & GPU fans)
- Fan modes: Auto / Max / Manual / Custom curve
- Editable temperature → speed curves with live graph
- Power modes (Default / Performance / Cool) via HP WMI
- Safe max RPM limit to protect your hardware
- System tray with quick actions, autostart support
- Turkish & English interface
- Built-in activity log console

## Requirements

| Requirement | Notes |
|---|---|
| Windows 10 / 11 (64-bit) | |
| HP OMEN laptop | Uses HP's `hpqBIntM` WMI interface exposed by the firmware. **HP Victus** and Pavilion Gaming models share this interface and *may* work partially or fully — untested, command IDs can differ between generations. Other machines run the app but cannot control/read fans. Test yours: `Get-CimInstance -Namespace root\wmi -ClassName hpqBIntM` in an elevated PowerShell. |
| Administrator rights | Required on every launch (Windows UAC prompt) — fan/EC access is privileged. |
| NVIDIA driver | Optional — only needed for GPU temperature. |

## Installation (prebuilt)

1. Grab `OMEN Fan Control Setup x.x.x.exe` from [Releases](../../releases).
2. Windows SmartScreen may warn about an unsigned app: click **More info → Run anyway**.
3. Approve the UAC prompt and follow the installer.
4. Launch the app from the Start Menu or Desktop shortcut and approve UAC once more.

The app installs per-machine (`C:\Program Files\OMEN Fan Control`). Autostart is managed through Task Scheduler with elevated privileges (no UAC at logon).

## Building from source

Prerequisites:
- [Node.js](https://nodejs.org) 18+
- [Python 3](https://python.org) with `pip`
- Windows 10/11

```bat
:: 1. Build the Python backend (single-file exe)
pip install pyinstaller
cd backend
pyinstaller tcp_server.spec
copy dist\tcp_server.exe tcp_server.exe
cd ..

:: 2. Install dependencies and build the installer
npm install
npm run dist
```

Output lands in `../release/installer` as an NSIS setup plus a portable `win-unpacked` folder.

### How it works

```
Electron UI (renderer.js)
   │  JSON lines over TCP 127.0.0.1:9292
   ▼
Python backend (tcp_server.py + fan_control.py)
   │  PowerShell / WMI (root\wmi, hpqBIntM)
   ▼
HP firmware EC (fan RPM, fan modes, thermal policy)
   ▲
nvidia-smi ──── GPU temperature
```

The backend broadcasts status updates (temps, RPM) every 100 ms and executes commands sent by the UI (`set_fan_mode`, `set_curve`, `set_power_mode`, …). A built-in enforcement loop re-applies the selected mode so BIOS/OGH overrides don't stick.

## Project layout

```
├── main.js            Electron main process (window, tray, backend lifecycle)
├── renderer.js        UI logic, i18n, TCP client
├── index.html         Single-page UI
├── styles.css
├── package.json       electron-builder config
├── backend/
│   ├── tcp_server.py      TCP server + command router
│   ├── fan_control.py     HP WMI bindings, modes, curves
│   ├── system_info.py     Temperature polling
│   └── tcp_server.spec    PyInstaller config
└── build/             App icons
```

## Troubleshooting

- **"Not connected" / no fan data** — make sure you launched the app as administrator and that your machine is an OMEN model exposing `hpqBIntM`. Test it: `Get-CimInstance -Namespace root\wmi -ClassName hpqBIntM` in an elevated PowerShell.
- **GPU temperature is 0** — NVIDIA driver not installed or `nvidia-smi` not in PATH.
- **Port 9292 already in use** — another instance of the backend is running; kill `tcp_server.exe` from Task Manager.

## Support

- Open a [GitHub Issue](../../issues) — preferred, helps other users too
- Or email: **klashain0@gmail.com**

## Contributing

Bug reports, model compatibility reports and pull requests are welcome.
If you own an **HP Victus / Pavilion Gaming** or an OMEN model that isn't listed, please open an issue with your model name and the output of the `hpqBIntM` test command above — that is the fastest way to grow device support.

If this tool helped you, a ⭐ on the repo helps other OMEN owners find it.

## Acknowledgements

Developed with the help of [Claude](https://claude.ai) by Anthropic.

## License

[MIT](LICENSE) © klashain
