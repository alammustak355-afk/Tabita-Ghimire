# ConnectAI CRM Release ProGuard / R8 Rules
-keepattributes *Annotation*,SourceFile,LineNumberTable
-keep class com.connectai.crm.** { *; }
-dontwarn org.bouncycastle.**
