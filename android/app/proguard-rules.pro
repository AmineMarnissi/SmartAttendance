# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# VisionCamera and Worklets JSI rules
-keep class com.mrousavy.camera.** { *; }
-keep class com.margelo.worklets.** { *; }
-keepclassmembers class * { @com.margelo.worklets.annotation.Worklet <methods>; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.jsi.** { *; }

# Reanimated and Native methods
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**
-keep class com.google.mlkit.** { *; }
-keep class com.github.dudigumberg.vcfd.** { *; }
