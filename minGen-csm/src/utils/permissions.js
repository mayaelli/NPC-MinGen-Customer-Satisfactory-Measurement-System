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