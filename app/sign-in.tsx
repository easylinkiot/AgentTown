import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { tx } from "@/src/i18n/translate";
import { useAgentTown } from "@/src/state/agenttown-context";
import { useAuth } from "@/src/state/auth-context";

WebBrowser.maybeCompleteAuthSession();

interface GoogleProfile {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Google profile request failed");
  }
  const payload = (await response.json()) as GoogleProfile;
  return payload;
}

export default function SignInScreen() {
  const router = useRouter();
  const { language, updateLanguage } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const {
    isHydrated,
    user,
    signInAsGuest,
    signInWithApple,
    signInWithGoogle,
    sendPhoneCode,
    verifyPhoneCode,
  } = useAuth();

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<"google" | "apple" | "phone" | "guest" | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  const googleConfigMissing = useMemo(() => {
    const hasAny =
      Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ||
      Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ||
      Boolean(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    return !hasAny;
  }, []);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "agenttown",
        path: "oauth2redirect/google",
      }),
    []
  );

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    scopes: ["openid", "profile", "email"],
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      "missing-google-web-client-id",
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      "missing-google-ios-client-id",
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      "missing-google-android-client-id",
    redirectUri,
  });

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable).catch(() => {
      setIsAppleAvailable(false);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated || !user) return;
    router.replace("/");
  }, [isHydrated, router, user]);

  useEffect(() => {
    if (!googleResponse || googleResponse.type !== "success") return;
    const accessToken =
      googleResponse.authentication?.accessToken ||
      (typeof googleResponse.params?.access_token === "string"
        ? googleResponse.params.access_token
        : null);

    if (!accessToken) {
      Alert.alert(
        tx(language, "Google 登录失败", "Google Sign-In Failed"),
        tx(language, "未获取到访问令牌。", "No access token returned.")
      );
      setBusyKey(null);
      return;
    }

    (async () => {
      try {
        const profile = await fetchGoogleProfile(accessToken);
        await signInWithGoogle({
          id: profile.sub || `google_${Date.now()}`,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture,
        });
        router.replace("/");
      } catch {
        Alert.alert(
          tx(language, "Google 登录失败", "Google Sign-In Failed"),
          tx(language, "无法读取用户信息。", "Cannot read user profile.")
        );
      } finally {
        setBusyKey(null);
      }
    })();
  }, [googleResponse, language, router, signInWithGoogle]);

  const handleGuestSignIn = async () => {
    try {
      setBusyKey("guest");
      await signInAsGuest();
      router.replace("/");
    } finally {
      setBusyKey(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleConfigMissing) {
      Alert.alert(
        tr("Google OAuth 未配置", "Google OAuth Not Configured"),
        tr(
          "请先在 .env.local 配置 EXPO_PUBLIC_GOOGLE_*_CLIENT_ID。",
          "Please set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in .env.local first."
        )
      );
      return;
    }

    try {
      setBusyKey("google");
      const result = await googlePromptAsync();
      if (result.type === "dismiss" || result.type === "cancel") {
        setBusyKey(null);
      }
    } catch {
      setBusyKey(null);
      Alert.alert(tr("Google 登录失败", "Google Sign-In Failed"), tr("请稍后重试。", "Please try again later."));
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios" || !isAppleAvailable) {
      Alert.alert(
        tr("当前不可用", "Not Available"),
        tr("Apple 登录仅在 iOS 真机或支持环境可用。", "Apple Sign-In is available only on supported iOS environments.")
      );
      return;
    }

    try {
      setBusyKey("apple");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      await signInWithApple({
        id: credential.user,
        name: fullName || null,
        email: credential.email,
      });
      router.replace("/");
    } catch (error) {
      const knownCode = (error as { code?: string })?.code;
      if (knownCode !== "ERR_REQUEST_CANCELED") {
        Alert.alert(tr("Apple 登录失败", "Apple Sign-In Failed"), tr("请稍后重试。", "Please try again later."));
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleSendCode = async () => {
    try {
      setBusyKey("phone");
      const result = await sendPhoneCode(phone);
      setOtpExpiresAt(result.expiresAt);
      setDevOtpHint(result.devCode || null);
      Alert.alert(
        tr("验证码已发送", "Code Sent"),
        tr("请输入短信验证码完成登录。", "Enter the SMS code to finish sign-in.")
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : tr("发送失败", "Failed to send");
      Alert.alert(tr("发送失败", "Failed to Send"), msg);
    } finally {
      setBusyKey(null);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setBusyKey("phone");
      await verifyPhoneCode(phone, otpCode);
      router.replace("/");
    } catch (error) {
      const msg = error instanceof Error ? error.message : tr("验证码校验失败", "Code verification failed");
      Alert.alert(tr("登录失败", "Sign-In Failed"), msg);
    } finally {
      setBusyKey(null);
    }
  };

  const otpTimeText = otpExpiresAt
    ? `${tr("验证码有效期至", "Code valid until")} ${new Date(otpExpiresAt).toLocaleTimeString()}`
    : tr("输入手机号获取验证码", "Enter phone number to request code");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandCard}>
          <View style={styles.logoCircle}>
            <Ionicons name="planet" size={24} color="#15803d" />
          </View>
          <Text style={styles.title}>{tr("欢迎来到 AgentTown", "Welcome to AgentTown")}</Text>
          <Text style={styles.subtitle}>{tr("一次登录，同步 iOS / Android / Web", "Sign in once, sync iOS / Android / Web")}</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langBtn, language === "zh" && styles.langBtnActive]}
              onPress={() => updateLanguage("zh")}
            >
              <Text style={[styles.langBtnText, language === "zh" && styles.langBtnTextActive]}>
                中文
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, language === "en" && styles.langBtnActive]}
              onPress={() => updateLanguage("en")}
            >
              <Text style={[styles.langBtnText, language === "en" && styles.langBtnTextActive]}>
                English
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr("OAuth 登录", "OAuth Sign-In")}</Text>

          <Pressable
            style={[styles.oauthBtn, styles.googleBtn]}
            disabled={busyKey !== null || !googleRequest}
            onPress={handleGoogleSignIn}
          >
            {busyKey === "google" ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <Ionicons name="logo-google" size={16} color="#111827" />
            )}
            <Text style={styles.oauthBtnText}>{tr("使用 Google 继续", "Continue with Google")}</Text>
          </Pressable>

          <Pressable
            style={[styles.oauthBtn, styles.appleBtn]}
            disabled={busyKey !== null}
            onPress={handleAppleSignIn}
          >
            {busyKey === "apple" ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="logo-apple" size={16} color="white" />
            )}
            <Text style={styles.appleBtnText}>{tr("使用 Apple 继续", "Continue with Apple")}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr("手机号验证码", "Phone Verification")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={language === "zh" ? "+86 13800138000" : "+1 415 555 0123"}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.secondaryBtn, busyKey !== null && styles.btnDisabled]}
            disabled={busyKey !== null}
            onPress={handleSendCode}
          >
            {busyKey === "phone" ? (
              <ActivityIndicator size="small" color="#1f2937" />
            ) : (
              <Ionicons name="chatbox-ellipses-outline" size={16} color="#1f2937" />
            )}
            <Text style={styles.secondaryBtnText}>{tr("发送验证码", "Send Code")}</Text>
          </Pressable>

          <TextInput
            style={styles.input}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder={tr("6 位验证码", "6-digit code")}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.primaryBtn, busyKey !== null && styles.btnDisabled]}
            disabled={busyKey !== null}
            onPress={handleVerifyCode}
          >
            <Ionicons name="log-in-outline" size={16} color="white" />
            <Text style={styles.primaryBtnText}>{tr("验证并登录", "Verify and Sign In")}</Text>
          </Pressable>
          <Text style={styles.helperText}>{otpTimeText}</Text>
          {__DEV__ && devOtpHint ? (
            <Text style={styles.devHint}>{tr("开发验证码", "DEV CODE")}: {devOtpHint}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr("快速体验", "Quick Start")}</Text>
          <Pressable
            style={[styles.secondaryBtn, busyKey !== null && styles.btnDisabled]}
            disabled={busyKey !== null}
            onPress={handleGuestSignIn}
          >
            {busyKey === "guest" ? (
              <ActivityIndicator size="small" color="#1f2937" />
            ) : (
              <Ionicons name="walk-outline" size={16} color="#1f2937" />
            )}
            <Text style={styles.secondaryBtnText}>{tr("游客模式继续", "Continue as Guest")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eff6ff",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  brandCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    gap: 6,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
  },
  langRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 10,
    minHeight: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  langBtnText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  langBtnTextActive: {
    color: "white",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  oauthBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  googleBtn: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  appleBtn: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  oauthBtnText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  appleBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    backgroundColor: "white",
    fontSize: 14,
    color: "#111827",
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtn: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    color: "#1f2937",
    fontWeight: "700",
    fontSize: 13,
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
  },
  devHint: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
