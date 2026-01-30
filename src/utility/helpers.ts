/**
 * Checks if a user is a Super Admin based on permissions.
 * 
 * @param permissions - The list of permissions for the user.
 * @returns True if the user is a Super Admin, false otherwise.
 */
export const isSuperAdmin = (permissions: string[] | undefined): boolean => {
  return permissions?.includes('*') || false;
};
