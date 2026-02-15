import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type AuthMethod = "guest" | "google" | "apple" | "phone";

export interface AuthUser {
  id: string;
  provider: AuthMethod;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

interface PhoneOtpState {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface AuthContextValue {
  isHydrated: boolean;
  user: AuthUser | null;
  isSignedIn: boolean;
  signInAsGuest: () => Promise<void>;
  signInWithGoogle: (input: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  }) => Promise<void>;
  signInWithApple: (input: {
    id: string;
    name?: string | null;
    email?: string | null;
  }) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<{ expiresAt: number; devCode?: string }>;
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = "agenttown.auth.session.v1";
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const AuthContext = createContext<AuthContextValue | null>(null);

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizePhone(phone: string) {
  const value = phone.trim().replace(/[^\d+]/g, "");
  if (!value || value.length < 7) {
    throw new Error("请输入有效手机号");
  }
  return value;
}

export function displayNameFromEmail(email?: string | null) {
  if (!email) return null;
  const [local] = email.split("@");
  return local || null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const otpMapRef = useRef<Map<string, PhoneOtpState>>(new Map());

  const persistUser = useCallback(async (nextUser: AuthUser | null) => {
    if (nextUser) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
      return;
    }
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw || !alive) return;
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        if (!parsed?.id || !parsed?.provider || !parsed?.displayName) return;
        setUser({
          id: parsed.id,
          provider: parsed.provider,
          displayName: parsed.displayName,
          email: parsed.email,
          phone: parsed.phone,
          avatar: parsed.avatar,
          createdAt: parsed.createdAt || new Date().toISOString(),
        });
      } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        if (alive) setIsHydrated(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const signInAsGuest = useCallback(async () => {
    const nextUser: AuthUser = {
      id: randomId("guest"),
      provider: "guest",
      displayName: "Guest Explorer",
      createdAt: new Date().toISOString(),
    };
    setUser(nextUser);
    await persistUser(nextUser);
  }, [persistUser]);

  const signInWithGoogle = useCallback<AuthContextValue["signInWithGoogle"]>(
    async (input) => {
      const nextUser: AuthUser = {
        id: input.id || randomId("google"),
        provider: "google",
        displayName:
          input.name?.trim() ||
          displayNameFromEmail(input.email) ||
          "Google User",
        email: input.email || undefined,
        avatar: input.avatar || undefined,
        createdAt: new Date().toISOString(),
      };
      setUser(nextUser);
      await persistUser(nextUser);
    },
    [persistUser]
  );

  const signInWithApple = useCallback<AuthContextValue["signInWithApple"]>(
    async (input) => {
      const nextUser: AuthUser = {
        id: input.id || randomId("apple"),
        provider: "apple",
        displayName:
          input.name?.trim() ||
          displayNameFromEmail(input.email) ||
          "Apple User",
        email: input.email || undefined,
        createdAt: new Date().toISOString(),
      };
      setUser(nextUser);
      await persistUser(nextUser);
    },
    [persistUser]
  );

  const sendPhoneCode = useCallback<AuthContextValue["sendPhoneCode"]>(async (phone) => {
    const normalizedPhone = normalizePhone(phone);
    const nextCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = Date.now() + OTP_TTL_MS;

    otpMapRef.current.set(normalizedPhone, {
      code: nextCode,
      expiresAt,
      attempts: 0,
    });

    return {
      expiresAt,
      devCode: __DEV__ ? nextCode : undefined,
    };
  }, []);

  const verifyPhoneCode = useCallback<AuthContextValue["verifyPhoneCode"]>(
    async (phone, code) => {
      const normalizedPhone = normalizePhone(phone);
      const normalizedCode = code.trim();
      const record = otpMapRef.current.get(normalizedPhone);
      if (!record) {
        throw new Error("验证码已失效，请重新发送");
      }
      if (Date.now() > record.expiresAt) {
        otpMapRef.current.delete(normalizedPhone);
        throw new Error("验证码已过期，请重新发送");
      }
      if (normalizedCode !== record.code) {
        record.attempts += 1;
        if (record.attempts >= OTP_MAX_ATTEMPTS) {
          otpMapRef.current.delete(normalizedPhone);
        } else {
          otpMapRef.current.set(normalizedPhone, record);
        }
        throw new Error("验证码错误");
      }

      otpMapRef.current.delete(normalizedPhone);
      const nextUser: AuthUser = {
        id: normalizedPhone,
        provider: "phone",
        displayName: `User-${normalizedPhone.slice(-4)}`,
        phone: normalizedPhone,
        createdAt: new Date().toISOString(),
      };
      setUser(nextUser);
      await persistUser(nextUser);
    },
    [persistUser]
  );

  const signOut = useCallback(async () => {
    setUser(null);
    await persistUser(null);
  }, [persistUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      user,
      isSignedIn: Boolean(user),
      signInAsGuest,
      signInWithGoogle,
      signInWithApple,
      sendPhoneCode,
      verifyPhoneCode,
      signOut,
    }),
    [
      isHydrated,
      sendPhoneCode,
      signInAsGuest,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
      verifyPhoneCode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
