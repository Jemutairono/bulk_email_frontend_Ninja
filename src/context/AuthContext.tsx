import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';
import {
  AuthError,
  invalidateSession,
  isSessionValid,
  loginWithPassword as loginWithPasswordRequest,
  requestOtp as requestOtpRequest,
  verifyOtp as verifyOtpRequest,
} from '../services/authService';
import { SESSION_TIMEOUT_MS } from '../config/constants';
import type { AuthUser, UserRole } from '../types';

export type LoginMethod = 'password' | 'otp';

interface AuthContextValue {
  user: AuthUser | null;
  /** Which login flow the person on the Login screen has selected. The API
   * doesn't advertise which a given account needs, so this is a manual choice. */
  loginMethod: LoginMethod;
  setLoginMethod: (method: LoginMethod) => void;
  /** True once an OTP has been requested and we're waiting on the code. */
  awaitingOtp: boolean;
  authError: string | null;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  requestOtp: (email: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cancelOtp: () => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  sessionExpiresInMs: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    setExpiresAt(Date.now() + SESSION_TIMEOUT_MS);
  }, []);

  const logout = useCallback(() => {
    invalidateSession();
    setUser(null);
    setPendingUserId(null);
    setExpiresAt(0);
  }, []);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        const authUser = await loginWithPasswordRequest(email, password);
        setUser(authUser);
        resetTimer();
      } catch (err) {
        setAuthError(err instanceof AuthError ? err.message : 'Unable to sign in. Please try again.');
        throw err;
      }
    },
    [resetTimer]
  );

  const requestOtp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { userId } = await requestOtpRequest(email, password);
      setPendingUserId(userId);
    } catch (err) {
      setAuthError(err instanceof AuthError ? err.message : 'Unable to sign in. Please try again.');
      throw err;
    }
  }, []);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (pendingUserId == null) return;
      setAuthError(null);
      try {
        const authUser = await verifyOtpRequest(pendingUserId, code);
        setUser(authUser);
        setPendingUserId(null);
        resetTimer();
      } catch (err) {
        setAuthError(err instanceof AuthError ? err.message : 'Verification failed. Please try again.');
        throw err;
      }
    },
    [pendingUserId, resetTimer]
  );

  const cancelOtp = useCallback(() => {
    setPendingUserId(null);
    setAuthError(null);
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => !!user && roles.includes(user.role), [user]);

  // §1 "Session expiry": reset the inactivity clock on user activity.
  useEffect(() => {
    if (!user) return;
    const activityEvents: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => resetTimer();
    activityEvents.forEach((evt) => window.addEventListener(evt, onActivity));
    return () => activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
  }, [user, resetTimer]);

  // Invalidate session → redirect to Login once the clock lapses.
  useEffect(() => {
    if (!user) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (!isSessionValid(expiresAt)) logout();
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [user, expiresAt, logout]);

  // Any apiClient call that comes back 401 forces the same redirect-to-login path.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
  }, [logout]);

  const sessionExpiresInMs = user ? Math.max(0, expiresAt - Date.now()) : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        loginMethod,
        setLoginMethod,
        awaitingOtp: pendingUserId != null,
        authError,
        loginWithPassword,
        requestOtp,
        verifyOtp,
        cancelOtp,
        logout,
        hasRole,
        sessionExpiresInMs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
