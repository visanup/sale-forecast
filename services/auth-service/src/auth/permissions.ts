export const PERMISSIONS = {
  ADMIN: {
    canManageUsers: true,
    canViewAllForecasts: true,
    canTriggerRebuilds: true
  },
  USER: {
    canManageUsers: false,
    canViewAllForecasts: false, // maybe only own org in future
    canTriggerRebuilds: false
  }
} as const;

