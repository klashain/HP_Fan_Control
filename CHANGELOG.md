# Changelog

## 2.1.3

- Fixed: GPU temperature not shown with newer NVIDIA drivers (decimal values like `49.59` were rejected)
- `nvidia-smi.exe` is now also located outside PATH (System32, NVSMI, DriverStore)
- Temperatures show `--` instead of `0.0` when no reading is available

## 2.1.2

- Fixed: LOG console button not opening (duplicate click handler)
- Version label now reads from package.json instead of hardcoded "v1.0"
- First launch defaults to English; Turkish selectable in Settings
- Fan logo now shown on taskbar window icon and system tray
- App runs elevated via manifest (`requireAdministrator`) — fixes missing fan RPM data caused by WMI access denial
- Autostart migrated to Task Scheduler (elevated, no UAC at logon)

## 2.1.0

- Turkish / English interface with live switching
- NSIS installer with wizard, custom fan-hexagon logo
- Info popup explaining ±100 RPM EC granularity

## 1.0

- Initial release: temperature monitoring, fan modes (auto/max/manual/curve), power modes, safe RPM limit, tray, autostart
