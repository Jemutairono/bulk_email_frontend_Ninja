import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import './Login.css';

export function Login() {
  const { awaitingMfa, authError, submitCredentials, verifyMfaCode, cancelMfa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('campaign_manager');
  const [mfaCode, setMfaCode] = useState('');

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await submitCredentials({ email, password, role });
    } catch {
      // authError already set by AuthContext; nothing further to do here.
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await verifyMfaCode(mfaCode);
    } catch {
      // authError already set by AuthContext.
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <span className="login__brand-mark">NCA</span>
        <h1 className="login__title">Bulk Email Console</h1>
        <p className="login__sub">Ninja Cats Association — mail.nca.ke</p>

        {!awaitingMfa ? (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                placeholder="j.wanjiru@nca.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="role">Access profile (demo only)</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="admin">Administrator</option>
                <option value="campaign_manager">Campaign Manager</option>
                <option value="auditor">Auditor</option>
                <option value="app_integrator">Application Integrator</option>
              </select>
            </div>
            {authError && <p className="login__error">{authError}</p>}
            <button className="btn btn--primary login__submit" type="submit">
              Continue to verification
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit}>
            <div className="field">
              <label htmlFor="mfa">Enter your 6-digit code</label>
              <input
                id="mfa"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            {authError && <p className="login__error">{authError}</p>}
            <button className="btn btn--primary login__submit" type="submit">
              Verify &amp; sign in
            </button>
            <button className="btn login__submit" type="button" onClick={cancelMfa} style={{ marginTop: 8 }}>
              Back
            </button>
          </form>
        )}

        <p className="login__mfa-note">
          A one-time code will be requested on your registered device (MFA) before access is
          granted, per NCA's tenant security policy.
        </p>
      </div>
    </div>
  );
}
