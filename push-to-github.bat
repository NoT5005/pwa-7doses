@echo off
title 7Doses - Push to GitHub
echo ========================================================
echo   7Doses (ยา 7 เม็ด) - เครื่องมือส่งโค้ดขึ้น GitHub
echo ========================================================
echo.

:: Set environment PATH for Git
set PATH=C:\Users\AnonP\AppData\Local\Programs\Git\cmd;C:\Program Files\nodejs;%PATH%

:: Ensure branch is main
git branch -M main

echo.
set /p REPO_URL="วาง GitHub Repository URL ของคุณที่นี่ (แล้วกด Enter): "

if "%REPO_URL%"=="" (
    echo ไม่ได้ระบุ URL ยกเลิกการทำงาน
    pause
    exit /b
)

:: Remove existing origin if any
git remote remove origin >nul 2>&1

:: Add origin and push
git remote add origin %REPO_URL%
echo.
echo กำลังส่งโค้ดขึ้น GitHub...
git push -u origin main

echo.
echo ========================================================
echo   เสร็จสิ้น! สามารถไปที่ vercel.com เพื่อ Deploy ต่อได้เลย
echo ========================================================
pause
