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
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
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
      Alert.alert("Google 登录失败", "未获取到访问令牌。");
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
        Alert.alert("Google 登录失败", "无法读取用户信息。");
      } finally {
        setBusyKey(null);
      }
    })();
  }, [googleResponse, router, signInWithGoogle]);

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
        "Google OAuth 未配置",
        "请先在 .env.local 配置 EXPO_PUBLIC_GOOGLE_*_CLIENT_ID。"
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
      Alert.alert("Google 登录失败", "请稍后重试。");
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios" || !isAppleAvailable) {
      Alert.alert("当前不可用", "Apple 登录仅在 iOS 真机或支持环境可用。");
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
        Alert.alert("Apple 登录失败", "请稍后重试。");
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
      Alert.alert("验证码已发送", "请输入短信验证码完成登录。");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "发送失败";
      Alert.alert("发送失败", msg);
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
      const msg = error instanceof Error ? error.message : "验证码校验失败";
      Alert.alert("登录失败", msg);
    } finally {
      setBusyKey(null);
    }
  };

  const otpTimeText = otpExpiresAt
    ? `验证码有效期至 ${new Date(otpExpiresAt).toLocaleTimeString()}`
    : "输入手机号获取验证码";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandCard}>
          <View style={styles.logoCircle}>
            <Ionicons name="planet" size={24} color="#15803d" />
          </View>
          <Text style={styles.title}>Welcome to AgentTown</Text>
          <Text style={styles.subtitle}>Sign in once, sync iOS / Android / Web</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>OAuth 登录</Text>

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
            <Text style={styles.oauthBtnText}>Continue with Google</Text>
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
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>手机号验证码</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+86 13800138000"
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
            <Text style={styles.secondaryBtnText}>Send Code</Text>
          </Pressable>

          <TextInput
            style={styles.input}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="6-digit code"
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.primaryBtn, busyKey !== null && styles.btnDisabled]}
            disabled={busyKey !== null}
            onPress={handleVerifyCode}
          >
            <Ionicons name="log-in-outline" size={16} color="white" />
            <Text style={styles.primaryBtnText}>Verify and Sign In</Text>
          </Pressable>
          <Text style={styles.helperText}>{otpTimeText}</Text>
          {__DEV__ && devOtpHint ? (
            <Text style={styles.devHint}>DEV CODE: {devOtpHint}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>快速体验</Text>
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
            <Text style={styles.secondaryBtnText}>Continue as Guest</Text>
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
