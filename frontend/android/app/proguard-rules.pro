# Capacitor core
-keep class com.getcapacitor.** { *; }
-keep class com.ttsvoxa.app.** { *; }
-keep class org.apache.cordova.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor community plugins
-keep class com.capacitorjs.community.** { *; }
-keep class ee.forgr.capacitor_community_sqlite.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Keep all Capacitor plugin annotations
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.Permission class * { *; }
-keep @com.getcapacitor.annotation.PermissionCallback class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# WebView JavaScript interfaces
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Preserve line number info for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# SQLCipher native library
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**

# AndroidX Room (used by capacitor-community-sqlite)
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-dontwarn androidx.room.**

# AndroidX Security Crypto
-dontwarn androidx.security.crypto.**

# AndroidX Biometric
-dontwarn androidx.biometric.**

# Suppress warnings for missing annotations
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.google.errorprone.annotations.CheckReturnValue
-dontwarn com.google.errorprone.annotations.Immutable
-dontwarn com.google.errorprone.annotations.RestrictedApi
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy
