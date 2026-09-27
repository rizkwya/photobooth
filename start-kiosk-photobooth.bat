@echo off
echo ========================================================
echo   MENJALANKAN MULTIMEDIA SMAVEN x IT CLUB SMAVEN PHOTOBOOTH
echo ========================================================
echo.
echo Mode: Cetak Otomatis Tanpa Dialog / Setting Popup
echo.

:: Try Chrome first, then Edge fallback
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:5173/camera
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:5173/camera
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=http://localhost:5173/camera
) else (
    start http://localhost:5173/camera
)

exit
