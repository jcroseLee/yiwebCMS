import type { CanParams, CanReturnType } from "@refinedev/core";
import type { ResourceLike, UserPermission } from "../interfaces";
import { authProvider } from "../utility/authProvider";
import { isSuperAdmin } from "../utility/helpers";

// Helper: 规范化资源名称
// Fix Bug #3: 确保资源名称始终以 / 开头，统一格式
// Fix Bug #6: Added defensive checks for null/undefined/empty string
const normalizeResource = (resource?: string | null): string => {
  if (!resource || typeof resource !== "string" || resource.trim() === "") {
    return ""; // 返回空字符串，后续逻辑应直接拒绝
  }
  const trimmed = resource.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const RESOURCE_TO_PERMISSION_MAP: Record<string, string> = {
  'coin_transactions': '/recharge-records',
  'recharge_options': '/recharge-options',
  'case_metadata': '/case-ops',
  'library_books': '/library-books',
  'user_resources': '/user-resources',
  'profiles': '/users',
  'wiki_articles': '/wiki',
  'cms_roles': '/system/roles',
  'audit_logs': '/audit-logs',
  'cms_notifications': '/system/messages',
};

// Mapping Refine actions to permission suffixes for fine-grained control
const ACTION_TO_SUFFIX_MAP: Record<string, string[]> = {
  list: ['read'],
  show: ['read'],
  export: ['read'],
  create: ['write'],
  edit: ['write'],
  clone: ['write'],
  import: ['write'],
  delete: ['delete', 'write'], // 'write' implies delete capability unless :delete is explicitly separated
};

export const accessControlProvider = {
  can: async (params: CanParams): Promise<CanReturnType> => {
    const { action, resource } = params;
    
    // 1. 获取用户权限列表
    const permissions = (await authProvider.getPermissions?.()) as UserPermission[] ?? [];

    // 2. 超级管理员检查 (拥有所有权限)
    if (isSuperAdmin(permissions)) {
      return {
        can: true,
        reason: "Super Admin has full access",
      };
    }

    // 3. 获取并规范化资源名称
    const resourceInfo = resource as ResourceLike | string | undefined;
    
    const rawResourceName =
      typeof resourceInfo === "string"
        ? resourceInfo
        : resourceInfo?.name || resourceInfo?.meta?.originalCode || "";

    // Fix Bug: 映射资源名到权限代码
    // 1. 获取映射后的权限代码，如果没有映射则使用原名
    const targetPermission = RESOURCE_TO_PERMISSION_MAP[rawResourceName] || rawResourceName;

    // 2. 规范化处理 (确保以 / 开头)
    const resourceName = normalizeResource(targetPermission);

    // Fix Bug #6: 处理空资源名
    if (!resourceName) {
      return {
        can: false,
        reason: "Invalid resource",
      };
    }

    // Debug Log
    console.log(`Checking permission for resource: ${rawResourceName} mapped to: ${resourceName}, action: ${action}, User has:`, permissions);

    // Fix Bug #2: Refactored AccessControl
    // Removed hardcoded denials for SYSTEM_ROLES.
    // Access is now fully driven by DB permissions returned in step 1.

    // 4. Special Check: Hard Delete Protection
    if (action === "delete") {
      const extraParams = params.params as { meta?: { hardDelete?: boolean } } | undefined;
      const isHardDelete = extraParams?.meta?.hardDelete === true;

      if (isHardDelete) {
        // 普通管理员不允许执行物理删除，只有超级管理员(上面已返回)可以
        return {
          can: false,
          reason: "普通管理员无法执行物理删除",
        };
      }
    }

    // Fix: Allow Dashboard access for all authenticated admins
    // Dashboard (/dashboard) is the default landing page. If it's not explicitly in the permission list
    // (e.g. missing from DB), users get 404 on login. We allow it by default for any admin.
    if (resourceName === "/dashboard") {
      return {
        can: true,
        reason: "Default access to Dashboard",
      };
    }

    // 5. 核心权限检查
    
    // 5.1 Exact match (Backward compatibility for existing /users style)
    if (permissions.includes(resourceName)) {
      return {
        can: true,
      };
    }

    // 5.2 Granular match (resource:action)
    // Check if user has specific permission like /users:read or /users:write
    const requiredSuffixes = ACTION_TO_SUFFIX_MAP[action] || [action];
    
    for (const suffix of requiredSuffixes) {
      const granularPermission = `${resourceName}:${suffix}`;
      if (permissions.includes(granularPermission)) {
        return {
          can: true,
        };
      }
    }

    return {
      can: false,
      reason: "Access Denied",
    };
  },
};
