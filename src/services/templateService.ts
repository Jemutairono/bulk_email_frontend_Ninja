// Template Library / Template Editor (process flow §2). No endpoint for
// this exists in the Tmail API collection, so everything here runs against
// mock data via mockDelay, mirroring adminService.ts's still-mocked
// sections. Swap the TODOs for real apiClient calls once a templates
// endpoint exists.

import { mockDelay } from './apiClient';
import type {
  EmailTemplate,
  RenderPreviewTarget,
  TemplateCategory,
  TemplateDraft,
  TemplateValidationIssue,
} from '../types';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Notices', 'Newsletters', 'Reminders', 'Campaigns'];

/** §2 "Device / Email-client Preview" — same rendering matrix used in
 * Campaign Pre-Flight (§7/§8 of the process flow). */
export const PREVIEW_TARGETS: RenderPreviewTarget[] = [
  { label: 'Desktop — Outlook', widthPx: 680 },
  { label: 'Desktop — Gmail', widthPx: 680 },
  { label: 'Mobile — Gmail (Android)', widthPx: 360 },
  { label: 'Mobile — Mail (iOS)', widthPx: 360 },
];

let mockTemplates: EmailTemplate[] = [
  {
    id: 't1',
    name: 'NCA Public Notice',
    category: 'Notices',
    updatedAt: '2026-08-20T09:00:00+03:00',
    subjectPreview: 'Public notice from the National Construction Authority',
    bodyPreview: 'Dear {{first_name}}, this is a public notice regarding {{notice_subject}}...',
    mergeFields: ['{{first_name}}', '{{notice_subject}}'],
  },
  {
    id: 't2',
    name: 'Licence Reminder',
    category: 'Reminders',
    updatedAt: '2026-08-18T11:30:00+03:00',
    subjectPreview: 'Your NCA licence renewal is due',
    bodyPreview: 'Dear {{first_name}}, your licence {{licence_number}} expires on {{expiry_date}}...',
    mergeFields: ['{{first_name}}', '{{licence_number}}', '{{expiry_date}}'],
  },
  {
    id: 't3',
    name: 'Newsletter — Two Column',
    category: 'Newsletters',
    updatedAt: '2026-08-12T14:00:00+03:00',
    subjectPreview: 'NCA Monthly Update — {{month}}',
    bodyPreview: 'This month at NCA: {{headline_1}} and {{headline_2}}...',
    mergeFields: ['{{month}}', '{{headline_1}}', '{{headline_2}}'],
  },
  {
    id: 't4',
    name: 'Plain Text Advisory',
    category: 'Campaigns',
    updatedAt: '2026-08-05T08:15:00+03:00',
    subjectPreview: 'Advisory: {{advisory_title}}',
    bodyPreview: 'Dear {{first_name}}, please note the following advisory...',
    mergeFields: ['{{first_name}}', '{{advisory_title}}'],
  },
];

export async function listTemplates(): Promise<EmailTemplate[]> {
  // TODO: return apiClient.get<EmailTemplate[]>('/templates');
  return mockDelay([...mockTemplates]);
}

export async function getTemplate(id: string): Promise<EmailTemplate> {
  // TODO: return apiClient.get<EmailTemplate>(`/templates/${id}`);
  const existing = mockTemplates.find((t) => t.id === id);
  if (!existing) throw new Error(`Unknown template ${id}`);
  return mockDelay(existing);
}

export async function createTemplate(draft: TemplateDraft): Promise<EmailTemplate> {
  // TODO: return apiClient.post<EmailTemplate>('/templates', draft);
  const created: EmailTemplate = { id: crypto.randomUUID(), updatedAt: new Date().toISOString(), ...draft };
  mockTemplates = [created, ...mockTemplates];
  return mockDelay(created);
}

export async function updateTemplate(id: string, draft: TemplateDraft): Promise<EmailTemplate> {
  // TODO: return apiClient.put<EmailTemplate>(`/templates/${id}`, draft);
  const updated: EmailTemplate = { id, updatedAt: new Date().toISOString(), ...draft };
  mockTemplates = mockTemplates.map((t) => (t.id === id ? updated : t));
  return mockDelay(updated);
}

export async function duplicateTemplate(id: string): Promise<EmailTemplate> {
  // TODO: return apiClient.post<EmailTemplate>(`/templates/${id}/duplicate`);
  const existing = mockTemplates.find((t) => t.id === id);
  if (!existing) throw new Error(`Unknown template ${id}`);
  const copy: EmailTemplate = {
    ...existing,
    id: crypto.randomUUID(),
    name: `${existing.name} (copy)`,
    updatedAt: new Date().toISOString(),
  };
  mockTemplates = [copy, ...mockTemplates];
  return mockDelay(copy);
}

export async function deleteTemplate(id: string): Promise<void> {
  // TODO: return apiClient.delete<void>(`/templates/${id}`);
  mockTemplates = mockTemplates.filter((t) => t.id !== id);
  return mockDelay(undefined);
}

/** §2 "Validate" — lightweight client-side checks; a real integration would
 * likely also validate server-side (e.g. brand-guideline / merge-field
 * existence checks owned by the design/approval team per the RACI). */
export function validateTemplate(draft: TemplateDraft): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  if (!draft.name.trim()) issues.push({ field: 'name', message: 'Give the template a name.' });
  if (!draft.subjectPreview.trim()) issues.push({ field: 'subjectPreview', message: 'Add a subject line.' });
  if (!draft.bodyPreview.trim()) issues.push({ field: 'bodyPreview', message: 'The template body is empty.' });

  const openBraces = (draft.bodyPreview.match(/{{/g) ?? []).length;
  const closeBraces = (draft.bodyPreview.match(/}}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    issues.push({ field: 'mergeFields', message: 'A merge field looks unbalanced — check for a missing {{ or }}.' });
  }
  return issues;
}
