// RBAC identity, roles, and the permission matrix shape.
// Populated by services/authService.ts and services/adminService.ts (§0.1.1, §16).

export type UserRole = 'admin' | 'campaign_manager' | 'auditor' | 'app_integrator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mfaVerified: boolean;
}

export interface ManagedUser {
  name: string;
  email: string;
  role: UserRole;
  status: 'granted' | 'pending' | 'disabled';
}

export interface Permission {
  key: string;
  label: string;
}

export interface RoleDefinition {
  role: UserRole;
  label: string;
  permissions: Record<string, boolean>;
}
