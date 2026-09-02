import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './features/auth/Login';
import { Dashboard } from './features/dashboard/Dashboard';
import { CampaignStudio } from './features/campaigns/CampaignStudio';
import { Scheduler } from './features/campaigns/Scheduler';
import { Deliverability } from './features/campaigns/Deliverability';
import { Contacts } from './features/audience/Contacts';
import { Consent } from './features/audience/Consent';
import { DataHygiene } from './features/audience/DataHygiene';
import { Analytics } from './features/insight/Analytics';
import { Quota } from './features/administration/Quota';
import { Users } from './features/administration/Users';
import { AuditLog } from './features/administration/AuditLog';
import { Messages } from './features/message-log/Messages';
import { Reports } from './features/reports/Reports';
import { Roles } from './features/administration/Roles';
import { SystemStatus } from './features/administration/SystemStatus';
import type { UserRole } from './types';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaign Studio',
  '/scheduler': 'Scheduler',
  '/deliverability': 'Deliverability Testing',
  '/contacts': 'Contacts & Lists',
  '/consent': 'Consent Centre',
  '/hygiene': 'Data Hygiene',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/messages': 'Message Log',
  '/quota': 'Quota & Alerts',
  '/users': 'User Administration',
  '/roles': 'Roles & Permissions',
  '/audit': 'Audit Log',
  '/status': 'System Status',
};

function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) {
    return (
      <div className="empty-state">
        You don't have access to this area. Contact your NCA system administrator if you believe
        this is incorrect.
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Login />;

  const title = TITLES[location.pathname] ?? 'NCA Bulk Email Console';

  return (
    <AppLayout title={title}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/campaigns"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <CampaignStudio />
            </RequireRole>
          }
        />
        <Route
          path="/scheduler"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <Scheduler />
            </RequireRole>
          }
        />
        <Route
          path="/deliverability"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <Deliverability />
            </RequireRole>
          }
        />
        <Route
          path="/contacts"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <Contacts />
            </RequireRole>
          }
        />
        <Route path="/consent" element={<Consent />} />
        <Route path="/hygiene" element={<DataHygiene />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route
          path="/reports"
          element={
            <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/messages"
          element={
            <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
              <Messages />
            </RequireRole>
          }
        />
        <Route path="/quota" element={<Quota />} />
        <Route
          path="/users"
          element={
            <RequireRole roles={['admin']}>
              <Users />
            </RequireRole>
          }
        />
        <Route
          path="/roles"
          element={
            <RequireRole roles={['admin']}>
              <Roles />
            </RequireRole>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireRole roles={['admin', 'auditor']}>
              <AuditLog />
            </RequireRole>
          }
        />
        <Route path="/status" element={<SystemStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
