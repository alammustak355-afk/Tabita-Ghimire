# ConnectAI CRM Release ProGuard / R8 Rules
-keepattributes *Annotation*,SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod

# Keep ConnectAI CRM model & network classes
-keep class com.connectai.crm.** { *; }

# Keep AndroidX Security Crypto & Google Tink reflection classes
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.bouncycastle.**
