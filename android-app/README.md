# ConnectAI CRM — Native Android Project (`com.connectai.crm.mobile`)

Native Android application built with **Kotlin 2.0**, **Jetpack Compose (Material 3)**, **AndroidX Security Crypto (`EncryptedSharedPreferences`)**, and **Coroutines REST Client**.

## Project Specifications
- **Application ID (Play Console)**: `com.connectai.crm.mobile`
- **Kotlin Namespace**: `com.connectai.crm`
- **Version**: `1.0.0` (`versionCode = 1`)
- **SDK Levels**: `minSdk = 26` (Android 8.0+), `targetSdk = 35` (Android 15), `compileSdk = 35`
- **Gradle / AGP**: Gradle `8.10.2` / Android Gradle Plugin `8.7.2`
- **Permissions**: `android.permission.INTERNET`, `android.permission.ACCESS_NETWORK_STATE`
- **Privacy Policy URL**: `https://ais-pre-23awl6srmfqwmf4tftm5ii-46650627537.europe-west2.run.app/privacy`

## Included Directory Structure
- `.github/workflows/android-release.yml` — Automated GitHub Actions workflow producing `app-debug.apk` and `app-release.aab`.
- `android-app/settings.gradle.kts` & `android-app/build.gradle.kts` — Root Gradle configuration.
- `android-app/gradle.properties` — AndroidX & JVM memory flags.
- `android-app/gradlew`, `android-app/gradlew.bat`, `android-app/gradle/wrapper/` — Official Gradle 8.10.2 wrapper & JAR.
- `android-app/app/build.gradle.kts` & `android-app/app/proguard-rules.pro` — App module configuration & R8 rules.
- `android-app/app/src/main/AndroidManifest.xml` — App manifest with minimal permissions.
- `android-app/app/src/main/res/` — Adaptive launcher icons (`mipmap-anydpi-v26`, `drawable`) and `values/strings.xml`.
- `android-app/app/src/main/java/com/connectai/crm/` — Complete Kotlin + Jetpack Compose source code (12 CRM modules).

## GitHub Actions Build (Mobile Browser Setup)
1. Push this repository (or use the **Android APK / Play** modal → **Tab 4: Build APK/AAB** → **Push to GitHub & Start Build** inside the ConnectAI CRM web app).
2. In your GitHub repository, open the **Actions** tab → **Build ConnectAI CRM Android APK & Play Store AAB** → tap **Run workflow**.
3. When the run completes, download:
   - `connectai-crm-debug-apk` (`app-debug.apk`) to install directly on your Android phone.
   - `connectai-crm-release-aab` (`app-release.aab`) to upload to **Google Play Console → Testing → Internal testing**.

## Optional Release Signing Secrets (For Play Console Upload)
In GitHub → **Settings → Secrets and variables → Actions**, add:
- `ANDROID_KEYSTORE_BASE64` (Base64-encoded `.jks` upload keystore)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
