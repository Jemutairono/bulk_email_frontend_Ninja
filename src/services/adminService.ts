// Quota & Alerts, User Administration, Roles & Permissions, System Status
// (§15, §16, §21).

import { mockDelay } from './apiClient';
import type {
  ManagedUser,
  Permission,
  QuotaMetric,
  RoleDefinition,
  StatusIncident,
  SystemStatusSnapshot,
  UserRole,
} from '../types';

const mockQuota: QuotaMetric[] = [
  { label: 'Sends this 24h window', used: 168400, limit: 250000 },
  { label: 'Contact records', used: 214300, limit: 350000 },
  { label: 'API calls (hourly)', used: 3120, limit: 10000 },
];

const mockUsers: ManagedUser[] = [
  { name: 'Jane Wanjiru', email: 'j.wanjiru@nca.ke', role: 'campaign_manager', status: 'granted' },
  { name: 'Peter Kamau', email: 'p.kamau@nca.ke', role: 'auditor', status: 'granted' },
  { name: 'System Administrator', email: 'admin@nca.ke', role: 'admin', status: 'granted' },
  { name: 'Levy System (integration)', email: 'levy-system@nca.ke', role: 'app_integrator', status: 'pending' },
];

export const PERMISSIONS: Permission[] = [
  { key: 'campaigns.create', label: 'Create & edit campaigns' },
  { key: 'campaigns.send', label: 'Schedule & send campaigns' },
  { key: 'contacts.manage', label: 'Manage contacts & lists' },
  { key: 'consent.manage', label: 'Manage consent & preferences' },
  { key: 'reports.export', label: 'Export reports & analytics' },
  { key: 'users.manage', label: 'Manage users & roles' },
  { key: 'audit.view', label: 'View audit log' },
];

const mockRoles: RoleDefinition[] = [
  { role: 'admin', label: 'Administrator', permissions: { 'campaigns.create': true, 'campaigns.send': true, 'contacts.manage': true, 'consent.manage': true, 'reports.export': true, 'users.manage': true, 'audit.view': true } },
  { role: 'campaign_manager', label: 'Campaign Manager', permissions: { 'campaigns.create': true, 'campaigns.send': true, 'contacts.manage': true, 'consent.manage': true, 'reports.export': true, 'users.manage': false, 'audit.view': false } },
  { role: 'auditor', label: 'Auditor', permissions: { 'campaigns.create': false, 'campaigns.send': false, 'contacts.manage': false, 'consent.manage': false, 'reports.export': true, 'users.manage': false, 'audit.view': true } },
  { role: 'app_integrator', label: 'Application Integrator', permissions: { 'campaigns.create': false, 'campaigns.send': true, 'contacts.manage': false, 'consent.manage': false, 'reports.export': false, 'users.manage': false, 'audit.view': false } },
];

const mockSystemStatus: SystemStatusSnapshot[] = [
  { service: 'Sending service', status: 'operational', detail: 'Queue depth normal, latency within target' },
  { service: 'REST API', status: 'operational', detail: 'p95 response time 180ms' },
  { service: 'Webhook delivery', status: 'degraded', detail: 'Elevated retry rate to one downstream endpoint' },
  { service: 'Contact import', status: 'operational', detail: 'No active jobs' },
];

const mockIncidents: StatusIncident[] = [
  { id: 'i1', title: 'Webhook retries elevated for click events', occurredAt: '2026-08-24T06:10:00+03:00', resolved: false },
  { id: 'i2', title: 'Brief API latency spike during batch send', occurredAt: '2026-08-19T14:02:00+03:00', resolved: true },
];

/** §15 Quota Flow — "Fetch usage"; the frontend only derives a percentage/band. */
export async function getQuota(): Promise<QuotaMetric[]> {
  // TODO: return apiClient.get<QuotaMetric[]>('/admin/quota');
  return mockDelay(mockQuota);
}

export async function listUsers(): Promise<ManagedUser[]> {
  // TODO: return apiClient.get<ManagedUser[]>('/admin/users');
  return mockDelay(mockUsers);
}

/** §16 "User administration" — enable/disable/assign role. */
export async function setUserRole(email: string, role: UserRole): Promise<ManagedUser> {
  // TODO: return apiClient.patch<ManagedUser>(`/admin/users/${email}`, { role });
  const existing = mockUsers.find((u) => u.email === email);
  if (!existing) throw new Error(`Unknown user ${email}`);
  return mockDelay({ ...existing, role });
}

export async function listRoles(): Promise<RoleDefinition[]> {
  // TODO: return apiClient.get<RoleDefinition[]>('/admin/roles');
  return mockDelay(mockRoles);
}

/** §16 "Role administration" — enable/disable permissions, then Save. */
export async function saveRolePermissions(
  role: UserRole,
  permissions: Record<string, boolean>
): Promise<RoleDefinition> {
  // TODO: return apiClient.put<RoleDefinition>(`/admin/roles/${role}`, { permissions });
  const existing = mockRoles.find((r) => r.role === role);
  if (!existing) throw new Error(`Unknown role ${role}`);
  return mockDelay({ ...existing, permissions });
}

/** §21 System Status Flow — read-only platform health, visible to every role. */
export async function getSystemStatus(): Promise<SystemStatusSnapshot[]> {
  // TODO: return apiClient.get<SystemStatusSnapshot[]>('/status');
  return mockDelay(mockSystemStatus);
}

export async function listIncidents(): Promise<StatusIncident[]> {
  // TODO: return apiClient.get<StatusIncident[]>('/status/incidents');
  return mockDelay(mockIncidents);
}
