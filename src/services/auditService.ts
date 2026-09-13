// Audit Log — immutable trail of user and system actions (§17).

import { mockDelay } from './apiClient';
import type { AuditLogEntry } from '../types';

const mockAudit: AuditLogEntry[] = [
  { id: 'a1', timestamp: '2026-08-24T08:12:00+03:00', actor: 'j.wanjiru@nca.ke', action: 'Campaign scheduled', target: 'Contractor Registration Update' },
  { id: 'a2', timestamp: '2026-08-24T07:40:00+03:00', actor: 'system', action: 'Suppression applied (hard bounce)', target: 'm.wafula@example.co.ke' },
  { id: 'a3', timestamp: '2026-08-23T16:05:00+03:00', actor: 'admin@nca.ke', action: 'User role changed', target: 'p.kamau@nca.go.ke → auditor' },
  { id: 'a4', timestamp: '2026-08-23T11:22:00+03:00', actor: 'j.wanjiru@nca.ke', action: 'Contact list imported', target: 'Q3 vendor list (2,140 records)' },
];

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  // TODO: return apiClient.get<AuditLogEntry[]>('/audit');
  return mockDelay(mockAudit);
}

/** §17 "Download/export". */
export async function exportAuditLog(): Promise<{ downloadUrl: string }> {
  // TODO: return apiClient.get<{ downloadUrl: string }>('/audit/export');
  return mockDelay({ downloadUrl: '/mock-exports/audit-log.csv' });
}
