// Template Library, Template Editor, and the device/email-client preview
// matrix (process flow §2). No endpoint for this exists in the Tmail API
// Postman collection, so this feature stays on mock data — same pattern as
// Quota, Roles & Permissions, and System Status in adminService.ts.

export type TemplateCategory = 'Notices' | 'Newsletters' | 'Reminders' | 'Campaigns';

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  updatedAt: string;
  subjectPreview: string;
  bodyPreview: string;
  /** Merge fields present in the body, e.g. '{{first_name}}'. */
  mergeFields: string[];
}

export interface TemplateDraft {
  name: string;
  category: TemplateCategory;
  subjectPreview: string;
  bodyPreview: string;
  mergeFields: string[];
}

export interface TemplateValidationIssue {
  field: 'name' | 'subjectPreview' | 'bodyPreview' | 'mergeFields';
  message: string;
}

/** One row of the device/email-client rendering matrix (§2, §7). */
export interface RenderPreviewTarget {
  label: string;
  widthPx: number;
}
