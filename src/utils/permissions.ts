/**
 * Role-permissions lookup map.
 * Adding a third role = one config entry, not scattered inline checks.
 */
interface RolePermissions {
  canCreateDirect: boolean;   // write directly to collections (bypass queue)
  canApprove: boolean;        // approve/reject change requests
  canDelete: boolean;         // soft-delete, restore, hard-delete
  canRestore: boolean;        // restore from recycle bin
  canHardDelete: boolean;     // permanently remove a record
  canEditSettings: boolean;   // manage configurable option lists
  canSubmitForApproval: boolean; // submit to change request queue
  canManageTeam: boolean;
}

const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  founder: {
    canCreateDirect: true,
    canApprove: true,
    canDelete: false,
    canRestore: false,
    canHardDelete: false,
    canEditSettings: true,
    canSubmitForApproval: false,
    canManageTeam: false,
  },
  founder_ceo: {
    canCreateDirect: true,
    canApprove: true,
    canDelete: false,
    canRestore: false,
    canHardDelete: false,
    canEditSettings: true,
    canSubmitForApproval: false,
    canManageTeam: false,
  },
  founder_coo: {
    canCreateDirect: true,
    canApprove: true,
    canDelete: false,
    canRestore: false,
    canHardDelete: false,
    canEditSettings: true,
    canSubmitForApproval: false,
    canManageTeam: false,
  },
  admin: {
    canCreateDirect: false,
    canApprove: false,
    canDelete: true,
    canRestore: true,
    canHardDelete: true,
    canEditSettings: true,
    canSubmitForApproval: true,
    canManageTeam: true,
  },
  social_media_manager: {
    canCreateDirect: false,
    canApprove: false,
    canDelete: false,
    canRestore: false,
    canHardDelete: false,
    canEditSettings: false,
    canSubmitForApproval: true,
    canManageTeam: false,
  },
};

const DEFAULT_PERMISSIONS: RolePermissions = {
  canCreateDirect: false,
  canApprove: false,
  canDelete: false,
  canRestore: false,
  canHardDelete: false,
  canEditSettings: false,
  canSubmitForApproval: false,
  canManageTeam: false,
};

function getPermissions(role: string): RolePermissions {
  return ROLE_PERMISSIONS[role] || DEFAULT_PERMISSIONS;
}

export function canCreateDirect(role: string): boolean {
  return getPermissions(role).canCreateDirect;
}

export function canApprove(role: string): boolean {
  return getPermissions(role).canApprove;
}

export function canDelete(role: string): boolean {
  return getPermissions(role).canDelete;
}

export function canRestore(role: string): boolean {
  return getPermissions(role).canRestore;
}

export function canHardDelete(role: string): boolean {
  return getPermissions(role).canHardDelete;
}

export function canEditSettings(role: string): boolean {
  return getPermissions(role).canEditSettings;
}

export function canSubmitForApproval(role: string): boolean {
  return getPermissions(role).canSubmitForApproval;
}

export function canSubmitCollectionForApproval(role: string, collection: string): boolean {
  if (!canSubmitForApproval(role)) return false;
  return role !== 'social_media_manager' || collection === 'clients' || collection === 'shoots';
}

export function canManageTeam(role: string): boolean {
  return getPermissions(role).canManageTeam;
}

export function isFounderRole(role: string): boolean {
  return ['founder', 'founder_ceo', 'founder_coo'].includes(role);
}

export function canEditBusinessProfile(role: string): boolean {
  return isFounderRole(role);
}

export function canAccessRoute(role: string, route: string): boolean {
  if (role !== 'social_media_manager') return true;
  return [
    '/',
    '/clients',
    '/shoots',
    '/schedule',
    '/approvals',
    '/settings',
  ].some(base => route === base || route.startsWith(`${base}/`));
}

export const ASSIGNABLE_ROLES = [
  { value: 'admin', label: 'Admin / Manager' },
  { value: 'founder_ceo', label: 'Founder / CEO' },
  { value: 'founder_coo', label: 'Founder / COO' },
  { value: 'social_media_manager', label: 'Social Media Manager' },
] as const;

/**
 * Returns a human-readable label for the role.
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'founder': return 'Founder';
    case 'founder_ceo': return 'Founder / CEO';
    case 'founder_coo': return 'Founder / COO';
    case 'admin': return 'Admin / Manager';
    case 'social_media_manager': return 'Social Media Manager';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
