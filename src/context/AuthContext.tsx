import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient';
import {
  AuthError,
  invalidateSession,
  isSessionValid,
  submitCredentials as submitCredentialsRequest,
  verifyMfaCode as verifyMfaCodeRequest,
} from '../services/authService';
import type { Credentials } from '../services/authService';
import { SESSION_TIMEOUT_MS } from '../config/constants';
import type { AuthUser, UserRole } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  /** Set once §1's credentials step succeeds and MFA is pending. */
  awaitingMfa: boolean;
  authError: string | null;
  submitCredentials: (credentials: Credentials) => Promise<void>;
  verifyMfaCode: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  sessionExpiresInMs: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingAuth, setPendingAuth] = useState<Credentials | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    setExpiresAt(Date.now() + SESSION_TIMEOUT_MS);
  }, []);

  const logout = useCallback(() => {
    invalidateSession();
    setUser(null);
    setPendingAuth(null);
    setExpiresAt(0);
  }, []);

  // §1 "Authentication failure" → display error, allow retry.
  const submitCredentials = useCallback(async (credentials: Credentials) => {
    setAuthError(null);
    try {
      const result = await submitCredentialsRequest(credentials);
      setPendingAuth(result.mfaRequired ? credentials : null);
      if (!result.mfaRequired) {
        // Backend may skip MFA for some flows; not exercised by the mock.
      }
    } catch (err) {
      setAuthError(err instanceof AuthError ? err.message : 'Unable to sign in. Please try again.');
      throw err;
    }
  }, []);

  const verifyMfaCode = useCallback(
    async (code: string) => {
      if (!pendingAuth) return;
      setAuthError(null);
      try {
        const authUser = await verifyMfaCodeRequest(pendingAuth, code);
        setUser(authUser);
        setPendingAuth(null);
        resetTimer();
      } catch (err) {
        setAuthError(err instanceof AuthError ? err.message : 'Verification failed. Please try again.');
        throw err;
      }
    },
    [pendingAuth, resetTimer]
  );

  const cancelMfa = useCallback(() => {
    setPendingAuth(null);
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
        awaitingMfa: !!pendingAuth,
        authError,
        submitCredentials,
        verifyMfaCode,
        cancelMfa,
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
