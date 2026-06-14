# Mobile (Android via Capacitor)

BothLingo ships as an installable PWA and as a Capacitor-wrapped Android app.
The native `android/` project is generated and git-ignored; regenerate it from
`capacitor.config.ts` whenever needed.

## Prerequisites
- Android SDK (this machine: `/home/both-stacks/android-sdk`, build-tools 34/35, platforms android-34/35)
- JDK 21 (Capacitor 8 requires it: `/usr/lib/jvm/java-21-openjdk-amd64`)
- A device with USB/wireless debugging and **Developer Options → "Install via USB" / "Install apps via ADB" enabled** (the install fails with `INSTALL_FAILED_USER_RESTRICTED` otherwise)

## Build the debug APK
```bash
export ANDROID_HOME=/home/both-stacks/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH:$ANDROID_HOME/platform-tools"

npm run build                 # produce dist/
npx cap add android           # first time only (generates android/)
npx cap sync android          # copy web build + plugins into the native project
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Install on a connected device
```bash
adb devices                   # confirm the device is listed
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p dev.bothstacks.lingo -c android.intent.category.LAUNCHER 1
```

## Notes
- App id: `dev.bothstacks.lingo`. Web assets are bundled from `dist/`.
- The Gemini tutor (`/api/*`) needs the backend server; in a purely bundled
  build those calls fail gracefully. Point `capacitor.config.ts` `server.url`
  at a reachable backend for full tutor functionality on-device.
- `capacitor.config.ts` now sets `server.url` to the live Cloud Run deployment
  (https://bothlingo-831930974109.australia-southeast1.run.app), so the installed
  app loads the current production site (facelift + working voice tutor) with no
  rebuild needed for future web deploys. Note: with `server.url` set, the WebView
  loads the remote URL and does NOT automatically fall back to the bundled `dist/`
  when offline (you would see a load error); `cap sync` still bundles `dist/`, but
  a true offline fallback would require configuring `server.errorPath`.
