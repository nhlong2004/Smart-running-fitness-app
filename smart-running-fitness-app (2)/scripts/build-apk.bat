@echo off
chcp 65001 >nul
echo.
echo 🚀 RunMate APK Builder (Windows)
echo ==================================

REM Bước 1: Cài dependencies
echo.
echo 📦 Bước 1: Cài đặt dependencies...
call npm install

REM Bước 2: Cài Capacitor
echo.
echo 📦 Bước 2: Cài đặt Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android
call npm install @capacitor/geolocation @capacitor/local-notifications @capacitor/splash-screen @capacitor/status-bar

REM Bước 3: Build web app
echo.
echo 🔨 Bước 3: Build ứng dụng web...
call npm run build

REM Bước 4: Thêm Android platform
echo.
echo 📱 Bước 4: Thêm Android platform...
call npx cap add android 2>nul

REM Bước 5: Sync code
echo.
echo 🔄 Bước 5: Đồng bộ code...
call npx cap sync android

echo.
echo ✅ Hoàn tất! Bây giờ chạy lệnh sau để mở Android Studio:
echo.
echo    npx cap open android
echo.
echo Trong Android Studio:
echo    1. Đợi Gradle sync xong (góc dưới phải)
echo    2. Build → Build Bundle(s) / APK(s) → Build APK(s)
echo    3. File APK sẽ ở: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
