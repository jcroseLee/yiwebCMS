export const PERMISSIONS = {
  DASHBOARD: '/dashboard',
  REPORTS: '/reports',
  POSTS: '/content/posts',
  COMMENTS: '/content/comments',
  USERS: '/users',
  USER_RESOURCES: '/user-resources',
  RECHARGE_RECORDS: '/recharge-records',
  RECHARGE_OPTIONS: '/recharge-options',
  CASE_OPS: '/case-ops',
  TAGS: '/tags',
  WIKI: '/wiki',
  SYSTEM_ROLES: '/system/roles',
  SYSTEM_MESSAGES: '/system/messages',
  AUDIT_LOGS: '/audit-logs',
  LIBRARY_BOOKS: '/library-books',
  LIBRARY_BOOK_CONTENTS: '/library-book-contents',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];
