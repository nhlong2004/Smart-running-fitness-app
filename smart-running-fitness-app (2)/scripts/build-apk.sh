#!/bin/bash

echo "🚀 RunMate APK Builder"
echo "======================"

# Bước 1: Cài dependencies
echo ""
echo "📦 Bước 1: Cài đặt dependencies..."
npm install

# Bước 2: Cài Capacitor
echo ""
echo "📦 Bước 2: Cài đặt Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/geolocation @capacitor/local-notifications @capacitor/splash-screen @capacitor/status-bar

# Bước 3: Build web app
echo ""
echo "🔨 Bước 3: Build ứng dụng web..."
npm run build

# Bước 4: Khởi tạo Capacitor (nếu chưa có)
if [ ! -f "capacitor.config.ts" ] && [ ! -f "capacitor.config.json" ]; then
  echo ""
  echo "⚙️ Bước 4: Khởi tạo Capacitor..."
  npx cap init RunMate com.runmate.app --web-dir dist
fi

# Bước 5: Thêm Android platform
echo ""
echo "📱 Bước 5: Thêm Android platform..."
npx cap add android 2>/dev/null || echo "Android platform đã tồn tại"

# Bước 6: Sync code
echo ""
echo "🔄 Bước 6: Đồng bộ code..."
npx cap sync android

echo ""
echo "✅ Hoàn tất! Bây giờ chạy lệnh sau để mở Android Studio:"
echo ""
echo "   npx cap open android"
echo ""
echo "Trong Android Studio:"
echo "   1. Đợi Gradle sync xong"
echo "   2. Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo "   3. File APK sẽ ở: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
