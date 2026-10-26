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
  },
  admin: {
    canCreateDirect: false,
    canApprove: false,
    canDelete: true,
    canRestore: true,
    canHardDelete: true,
    canEditSettings: true,
    canSubmitForApproval: true,
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

/**
 * Returns a human-readable label for the role.
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'founder': return 'Founder';
    case 'admin': return 'Admin';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
