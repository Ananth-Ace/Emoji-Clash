@echo off
title Emoji Clash - Android Setup
color 0B

echo.
echo  ==========================================
echo    EMOJI CLASH  --  Android Setup
echo  ==========================================
echo.

:: ── Check Node.js ─────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found!
    echo  Download it from: https://nodejs.org  (LTS version)
    echo  Then re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODEVER=%%i
echo  [OK] Node.js %NODEVER% found

:: ── Check npm ──────────────────────────────────────────────────────────
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] npm not found. Reinstall Node.js.
    pause
    exit /b 1
)
echo  [OK] npm found
echo.

:: ── Step 1: Download Phaser locally ───────────────────────────────────
echo  [1/5] Downloading Phaser locally (for offline APK)...
curl -sL "https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js" -o "js\phaser.min.js"
if %errorlevel% neq 0 (
    echo  [WARN] Could not download Phaser. The app will use CDN (needs internet).
    echo         You can manually download phaser.min.js later.
) else (
    echo  [OK] Phaser downloaded to js\phaser.min.js
)
echo.

:: ── Step 2: Install npm packages ──────────────────────────────────────
echo  [2/5] Installing Capacitor packages...
call npm install
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo  [OK] Packages installed
echo.

:: ── Step 3: Add Android platform ──────────────────────────────────────
echo  [3/5] Adding Android platform...
call npx cap add android
if %errorlevel% neq 0 (
    echo  [WARN] 'cap add android' had issues.
    echo         If Android Studio is not installed yet, do that first,
    echo         then run:  npx cap add android
) else (
    echo  [OK] Android platform added
)
echo.

:: ── Step 4: Copy splash screen placeholder ─────────────────────────────
echo  [4/5] Setting up splash screen...
if exist "android\app\src\main\res\drawable" (
    copy /Y "icon\splash_placeholder.xml" "android\app\src\main\res\drawable\splash.xml" >nul 2>&1
)
echo  [OK] Done
echo.

:: ── Step 5: Sync web files to Android ──────────────────────────────────
echo  [5/5] Syncing game files to Android project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo  [WARN] Sync had issues. Try again after Android Studio is set up.
) else (
    echo  [OK] Sync complete
)

echo.
echo  ==========================================
echo    Setup Complete!
echo  ==========================================
echo.
echo  NEXT STEPS:
echo.
echo  1. Open Android Studio:
echo        npx cap open android
echo.
echo  2. Wait for Gradle to finish syncing (bottom progress bar)
echo.
echo  3. Add your icons:
echo        Open  icon\generate-icon.html  in a browser
echo        Download all icon sizes
echo        Place them in android\app\src\main\res\mipmap-*\
echo.
echo  4. Build your APK / AAB:
echo        Build  ->  Generate Signed Bundle / APK
echo        Choose AAB for Play Store, APK for direct install
echo.
echo  5. To test on your phone (USB debugging ON):
echo        Run  ->  Run 'app'  (green play button)
echo.
pause
