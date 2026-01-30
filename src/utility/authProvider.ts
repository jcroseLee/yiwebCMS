import type { AuthProvider } from "@refinedev/core";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseClient } from "./supabaseClient";

const adminRoles = new Set(["admin", "super_admin"]);

interface IAdminProfile {
  id: string;
  role: string;
  nickname: string;
  avatar_url: string;
  email: string;
}

// Cache for permissions and profiles
const permissionsCache = new Map<string, { permissions: string[], timestamp: number }>();
const profileCache = new Map<string, { profile: IAdminProfile, timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

// Realtime subscription
let permissionSubscription: RealtimeChannel | null = null;

const setupRealtimeSubscription = (userId: string) => {
  // Check if subscription exists and is healthy
  if (permissionSubscription) {
    const state = permissionSubscription.state;
    if (state === 'joined' || state === 'joining') {
      return;
    }
    // If closed or errored, clean up to allow reconnection
    console.warn(`[Auth] Subscription in state '${state}', reconnecting...`);
    cleanupSubscription();
  }

  console.log("[Auth] Setting up realtime permission sync for user:", userId);

  const channel = supabaseClient.channel('permissions-sync');
  permissionSubscription = channel;

  channel
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT/DELETE/UPDATE for robustness
        schema: 'public',
        table: 'cms_role_permissions',
      },
      (payload) => {
        console.log('[Auth] Permission change detected (cms_role_permissions):', payload);
        invalidatePermissionsCache(userId);
        window.dispatchEvent(new Event('permissions-updated'));
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE', // Listen specifically for profile updates (e.g. role change)
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Auth] Profile change detected:', payload);
        invalidatePermissionsCache(userId);
        window.dispatchEvent(new Event('permissions-updated'));
      }
    )
    .subscribe((status) => {
      // Check if this channel is still the active one
      if (permissionSubscription !== channel) {
          return;
      }

      if (status === 'SUBSCRIBED') {
        console.log('[Auth] Realtime subscription active');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error(`[Auth] Realtime subscription error: ${status}`);
        // Attempt to reconnect after a delay
        setTimeout(() => {
          // Check again if we are still tracking this channel (user might have logged out)
          if (permissionSubscription !== channel) return;

          console.log('[Auth] Attempting to reconnect subscription...');
          cleanupSubscription();
          setupRealtimeSubscription(userId);
        }, 5000);
      }
    });
};

const cleanupSubscription = () => {
  if (permissionSubscription) {
    console.log("[Auth] Cleaning up realtime subscription");
    const channel = permissionSubscription;
    permissionSubscription = null;
    channel.unsubscribe();
  }
};

const fetchProfileByUserId = async (userId: string) => {
  const now = Date.now();
  const cached = profileCache.get(userId);

  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.profile;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, role, nickname, avatar_url, email")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const profile = data as IAdminProfile;
  profileCache.set(userId, {
    profile,
    timestamp: now,
  });
  
  return profile;
};

const ensureAdminRole = async (userId: string) => {
  const profile = await fetchProfileByUserId(userId);
  const role = profile?.role ?? null;

  if (!role || !adminRoles.has(role)) {
    console.error(`[AccessDenied] User ${userId} has role '${role}' which is not in adminRoles:`, [...adminRoles]);
    await supabaseClient.auth.signOut();
    throw new Error("非管理员禁止访问");
  }

  console.log(`[Auth] User ${userId} authenticated with role: ${role}`);
  return { role, profile };
};

export const invalidatePermissionsCache = (userId: string) => {
  permissionsCache.delete(userId);
  profileCache.delete(userId);
  console.log(`[Auth] Cache invalidated for user ${userId}`);
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: "LoginError",
        },
      };
    }

    const userId = data.user?.id ?? data.session?.user?.id;
    if (!userId) {
      return {
        success: false,
        error: {
          message: "登录失败",
          name: "LoginError",
        },
      };
    }

    try {
      await ensureAdminRole(userId);
      setupRealtimeSubscription(userId);
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: {
          message: err.message,
          name: "LoginError",
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  register: async ({ email, password }) => {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: "RegisterError",
        },
      };
    }

    return {
      success: true,
      redirectTo: "/login",
    };
  },
  logout: async () => {
    // Clear cache for current user
    const { data } = await supabaseClient.auth.getSession();
    const userId = data.session?.user?.id;
    if (userId) {
      permissionsCache.delete(userId);
      profileCache.delete(userId);
    }

    cleanupSubscription();

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      return {
        success: false,
        error,
      };
    }
    return {
      success: true,
      redirectTo: "/login",
    };
  },
  check: async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    const session = data.session;

    if (error || !session) {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    if (session.expires_at && Date.now() >= session.expires_at * 1000) {
      await supabaseClient.auth.signOut();
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      await supabaseClient.auth.signOut();
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    // Ensure userId matches session and permissions/profile are valid for THIS user
    try {
      await ensureAdminRole(userData.user.id);
      setupRealtimeSubscription(userData.user.id);
    } catch {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    return {
      authenticated: true,
    };
  },
  onError: async (error) => {
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 401 || status === 403) {
      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }
    return { error };
  },
  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const userId = data.session?.user?.id;

    if (!userId) {
      return [];
    }

    // Check cache
    const now = Date.now();
    const cached = permissionsCache.get(userId);

    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
      return cached.permissions;
    }

    try {
      const { data: permissions, error } = await supabaseClient.rpc("app_get_my_permission_codes");
      
      if (error) {
        console.error("[Auth] Failed to fetch permissions:", error);

        // Handle 401/403: Force logout
        const status = (error as { status?: number })?.status;
        if (error.code === '401' || error.code === '403' || status === 401 || status === 403) {
             await supabaseClient.auth.signOut();
             window.location.href = '/login'; 
             return [];
        }

        // Network error or other non-auth error: try to return stale cache
        if (cached) {
            console.warn("[Auth] Returning stale cache due to fetch error");
            return cached.permissions;
        }

        return [];
      }

      // Update cache
      permissionsCache.set(userId, {
        permissions: permissions as string[],
        timestamp: now,
      });

      return permissions as string[];
    } catch (error) {
      console.error("[Auth] Unexpected error fetching permissions:", error);
      
      // Try to return stale cache
      if (cached) {
          console.warn("[Auth] Returning stale cache due to unexpected error");
          return cached.permissions;
      }

      return [];
    }
  },
  getIdentity: async () => {
    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData.user;

    if (!user) {
      return null;
    }

    try {
      const profile = await fetchProfileByUserId(user.id);
      return {
        id: user.id,
        name: profile?.nickname || user.email || user.id,
        avatar: profile?.avatar_url,
        email: profile?.email || user.email,
      };
    } catch {
      return {
        id: user.id,
        name: user.email || user.id,
        avatar: undefined,
        email: user.email,
      };
    }
  },
};
