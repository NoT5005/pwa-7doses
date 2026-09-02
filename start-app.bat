@echo off
title 7Doses (ยาเจ็ดเม็ด) - PWA Runner
echo ========================================================
echo   7Doses (ยาเจ็ดเม็ด) - บันทึกการปฏิบัติธรรม
echo ========================================================
echo กำลังเริ่มต้นระบบ...

:: Map subst drive if directory contains special characters
subst X: "%~dp0" >nul 2>&1
if exist X:\package.json (
    cd /d X:\
) else (
    cd /d "%~dp0"
)

:: Ensure Node is in PATH
set PATH=C:\Program Files\nodejs;%PATH%

echo กำลังเปิด Web Server ที่ http://localhost:3000 ...
start http://localhost:3000
npm run dev

pause
