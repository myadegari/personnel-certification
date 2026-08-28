export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
};

export const ASSIGNABLE_ROLES = [ROLES.USER, ROLES.ADMIN, ROLES.SUPERADMIN];
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.SUPERADMIN];

export const ROLE_LABELS_FA = {
  [ROLES.USER]: "کاربر",
  [ROLES.ADMIN]: "مدیر",
  [ROLES.SUPERADMIN]: "سوپرادمین",
};

export function isValidRole(role) {
  return ASSIGNABLE_ROLES.includes(role);
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isSuperAdmin(role) {
  return role === ROLES.SUPERADMIN;
}

export function canManageUser(actorRole, targetRole) {
  if (!isStaffRole(actorRole)) return false;
  if (isSuperAdmin(actorRole)) return true;
  return targetRole === ROLES.USER;
}

export function canAssignRole(actorRole, targetRole) {
  if (!isStaffRole(actorRole) || !isValidRole(targetRole)) return false;
  if (isSuperAdmin(actorRole)) return true;
  return targetRole === ROLES.USER;
}
