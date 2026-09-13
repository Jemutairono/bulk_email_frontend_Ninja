// Message Log — per-recipient event timelines (§14).

import { mockDelay } from './apiClient';
import type { MessageLogEntry } from '../types';

const mockMessages: MessageLogEntry[] = [
  { id: 'm1', recipient: 'j.mwangi@example.co.ke', campaignName: 'Licence Renewal Reminder — Q3', status: 'opened', timestamp: '2026-08-20T09:14:00+03:00' },
  { id: 'm2', recipient: 'a.otieno@example.co.ke', campaignName: 'Licence Renewal Reminder — Q3', status: 'clicked', timestamp: '2026-08-20T09:20:00+03:00' },
  { id: 'm3', recipient: 'p.kamau@example.co.ke', campaignName: 'Licence Renewal Reminder — Q3', status: 'bounced', timestamp: '2026-08-20T09:05:00+03:00' },
  { id: 'm4', recipient: 'm.wafula@example.co.ke', campaignName: 'Levy Payment Acknowledgement Batch', status: 'failed', timestamp: '2026-08-24T07:41:00+03:00', failureReason: 'Mailbox does not exist (550 5.1.1)' },
  { id: 'm5', recipient: 'd.kiptoo@example.co.ke', campaignName: 'Levy Payment Acknowledgement Batch', status: 'delivered', timestamp: '2026-08-24T07:41:20+03:00' },
];

export async function listMessages(): Promise<MessageLogEntry[]> {
  // TODO: return apiClient.get<MessageLogEntry[]>('/messages');
  return mockDelay(mockMessages);
}

/** §14 "Select message" → message timeline / failure details. */
export async function getMessage(messageId: string): Promise<MessageLogEntry | undefined> {
  // TODO: return apiClient.get<MessageLogEntry>(`/messages/${messageId}`);
  return mockDelay(mockMessages.find((m) => m.id === messageId));
}
