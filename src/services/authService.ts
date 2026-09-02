// Login, MFA verification and session validity checks (§1 Authentication Flow).
//
// This is a demo/mock implementation: `submitCredentials` accepts any
// non-empty email/password and always requires MFA; `verifyMfaCode` accepts
// any 6-digit code. Swap the two `mockDelay(...)` bodies for
// `apiClient.post(...)` calls once the backend is connected — the function
// signatures already match the shape the real endpoints are expected to take.

import { mockDelay, setAuthToken } from './apiClient';
import type { AuthUser, UserRole } from '../types';

export interface Credentials {
  email: string;
  password: string;
  /** Role picker only exists in this demo build in place of a real backend
   * assigning RBAC roles server-side; drop this field once connected. */
  role: UserRole;
}

export interface CredentialsResult {
  /** Opaque handle passed to verifyMfaCode; a real backend would return a
   * short-lived pending-auth token instead of echoing the credentials. */
  pendingAuth: Credentials;
  mfaRequired: boolean;
}

export class AuthError extends Error {}

/** Step 1 of §1: username/email + password. */
export async function submitCredentials(credentials: Credentials): Promise<CredentialsResult> {
  if (!credentials.email.trim() || !credentials.password.trim()) {
    throw new AuthError('Enter your work email and password to continue.');
  }
  // TODO: return apiClient.post<CredentialsResult>('/auth/login', credentials);
  return mockDelay({ pendingAuth: credentials, mfaRequired: true });
}

/** Step 2 of §1: MFA code, then "load user profile + RBAC permissions". */
export async function verifyMfaCode(pendingAuth: Credentials, code: string): Promise<AuthUser> {
  if (!/^\d{6}$/.test(code)) {
    throw new AuthError('Enter the 6-digit code sent to your registered device.');
  }
  // TODO: return apiClient.post<AuthUser>('/auth/mfa/verify', { ...pendingAuth, code });
  const user: AuthUser = {
    id: crypto.randomUUID(),
    name: pendingAuth.email.split('@')[0],
    email: pendingAuth.email,
    role: pendingAuth.role,
    mfaVerified: true,
  };
  setAuthToken(`mock-token-${user.id}`);
  return mockDelay(user);
}

export function invalidateSession(): void {
  setAuthToken(null);
}

/** §1 "Check session validity" — true while the session clock hasn't lapsed. */
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() < expiresAt;
}
