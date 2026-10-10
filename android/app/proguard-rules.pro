# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── 오구톡 ─────────────────────────────────────────────────────
# Crashlytics 스택트레이스를 읽을 수 있게 줄번호를 남긴다 (매핑 파일은 Play 에 자동 업로드됨)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor 플러그인(@CapacitorPlugin / Plugin 상속)은 capacitor-android 의 consumer 룰이
# 이미 보존한다 — AudioFocus·UsageStats·Calendar 플러그인도 그 규칙에 걸린다. 중복 선언하지 않는다.
