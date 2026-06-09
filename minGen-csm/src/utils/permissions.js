/**
 * permissions.js — Client-side RBAC helpers
 *
 * These functions are used by frontend components to decide whether to
 * SHOW or HIDE UI elements (buttons, forms, nav items). They are NOT a
 * security boundary — the PHP backend enforces the same rules server-side
 * on every request. Changes here must be mirrored in the corresponding
 * PHP endpoint logic.
 *
 * Role hierarchy (highest → lowest):
 *   super_admin → admin → manager → office → provisioned → auditor (special)
 *
 * 'provisioned' users have no default access — everything is controlled by
 * their individual permission keys in user_permissions (managed in admin-management.jsx).
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  AUDITOR: 'auditor',
  MANAGER: 'manager',
  OFFICE: 'office',
};

export const canManageOffices = (role) => role === ROLES.SUPER_ADMIN;

export const canViewAllPlants = (role) => [ROLES.SUPER_ADMIN, ROLES.AUDITOR].includes(role);

export const canViewPlantData = (role) => [ROLES.SUPER_ADMIN, ROLES.AUDITOR, ROLES.MANAGER].includes(role);

// super_admin can CRUD any service; office can CRUD only their own

export const canCRUDServices = (role) => {
  // Only these roles can see the Add Form and Edit/Delete buttons
  const allowed = ['super_admin', 'office', 'manager'];
  return allowed.includes(role);
};

// Add this to ensure the Auditor/Manager logic in ArtaServices.jsx is clean
export const canViewAnyService = (role) => {
  return ['super_admin', 'auditor'].includes(role);
};