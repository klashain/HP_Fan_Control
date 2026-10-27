; The backend (tcp_server.exe) is a child process that electron-builder's
; "app is running" check does not cover. If it is still running, its file is
; locked and the installer silently keeps the old backend. Stop it first.
!macro customInit
  nsExec::Exec 'taskkill /f /t /im tcp_server.exe'
  Sleep 500
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /f /t /im tcp_server.exe'
  Sleep 500
!macroend
