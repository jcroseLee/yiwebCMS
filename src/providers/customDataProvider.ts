import { type DataProvider } from "@refinedev/core";
import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import { supabaseClient } from "../utility/supabaseClient";

// Define locally if missing in interfaces
interface IComment {
  id: string;
  user_id: string;
  [key: string]: unknown;
}

interface IResourceItem {
  owner: string;
  [key: string]: unknown;
}

const baseDataProvider = supabaseDataProvider(supabaseClient);

export const customDataProvider: DataProvider = {
  ...baseDataProvider,
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    if (resource === "comments") {
      const response = await baseDataProvider.getList({ resource, pagination, filters, sorters, meta });
      
      const comments = response.data as unknown as IComment[];
      const userIds = comments.map((item) => item.user_id).filter((id) => id && id !== "null");
      
      if (userIds.length > 0) {
        const { data: profiles, error } = await supabaseClient
          .from("profiles")
          .select("id, nickname, avatar_url, email")
          .in("id", userIds);
          
        if (!error && profiles) {
          const profilesMap = new Map(profiles.map((p) => [p.id, p]));
          
          const dataWithAuthors = comments.map((item) => ({
            ...item,
            author: profilesMap.get(item.user_id) || { nickname: 'Unknown' },
          }));
          
          return {
            ...response,
            data: dataWithAuthors,
          };
        }
      }
      
      return response;
    }

    if (resource === "user_resources") {
      const response = await baseDataProvider.getList({ resource, pagination, filters, sorters, meta });
      
      const resources = response.data as Array<{ user_id: string } & Record<string, unknown>>;
      const userIds = resources.map((item) => item.user_id).filter((id) => id && id !== "null");
      
      if (userIds.length > 0) {
        const { data: profiles, error } = await supabaseClient
          .from("profiles")
          .select("id, nickname, avatar_url")
          .in("id", userIds);
          
        if (!error && profiles) {
          const profilesMap = new Map(profiles.map((p) => [p.id, p]));
          
          const dataWithProfiles = resources.map((item) => ({
            ...item,
            nickname: profilesMap.get(item.user_id)?.nickname || 'Unknown',
            avatar_url: profilesMap.get(item.user_id)?.avatar_url,
          }));
          
          return {
            ...response,
            data: dataWithProfiles,
          };
        }
      }
      
      return response;
    }

    if (resource === "tags") {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      const current = pagination?.current || 1;
      const pageSize = pagination?.pageSize || 20;
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", current.toString());
      queryParams.append("pageSize", pageSize.toString());

      // Handle filters
      if (filters) {
        filters.forEach((filter) => {
          if ("field" in filter) {
            if (filter.field === "name" && (filter.operator === "contains" || filter.operator === "eq")) {
              queryParams.append("search", filter.value);
            }
            if (filter.field === "category" && (filter.operator === "eq" || filter.operator === "in")) {
               const val = Array.isArray(filter.value) ? filter.value[0] : filter.value;
               if (val) queryParams.append("category", val);
            }
            if (filter.field === "scope" && (filter.operator === "eq" || filter.operator === "in")) {
               const val = Array.isArray(filter.value) ? filter.value[0] : filter.value;
               if (val) queryParams.append("scope", val);
            }
          }
        });
      }

      const response = await fetch(`/api/admin/tags?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();

      return {
        data: data.tags,
        total: data.total,
      };
    }

    if (resource === "coin_transactions") {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      const current = pagination?.current || 1;
      const pageSize = pagination?.pageSize || 20;
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", current.toString());
      queryParams.append("pageSize", pageSize.toString());

      if (filters) {
        filters.forEach((filter) => {
          if ("field" in filter) {
             // Handle user.nickname search
             // refine-antd maps dataIndex=['user', 'nickname'] to field='user.nickname'
             if (filter.field === "user.nickname") {
                 queryParams.append("search", filter.value);
             }
             
             // transaction_type
             if (filter.field === "transaction_type") {
                 const values = Array.isArray(filter.value) ? filter.value : [filter.value];
                 values.forEach((v: string) => queryParams.append("transaction_type", v));
             }

             // balance_type
             if (filter.field === "balance_type") {
                 queryParams.append("balance_type", filter.value);
             }

             // created_at
             if (filter.field === "created_at") {
                 // RangePicker value usually comes as [start, end] strings
                 if (Array.isArray(filter.value) && filter.value.length === 2) {
                     if (filter.value[0]) queryParams.append("start_at", filter.value[0]);
                     if (filter.value[1]) queryParams.append("end_at", filter.value[1]);
                 }
             }
          }
        });
      }

      const response = await fetch(`/api/admin/coin-transactions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();

      return {
        data: data.data,
        total: data.total,
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
      };
    }

    if (resource === "resources") {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      const current = pagination?.current || 1;
      const pageSize = pagination?.pageSize || 20;
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", current.toString());
      queryParams.append("pageSize", pageSize.toString());

      if (filters) {
        filters.forEach((filter) => {
          if ("field" in filter) {
             if (filter.field === "owner" && filter.operator === "eq") {
               queryParams.append("owner", filter.value);
             }
          }
        });
      }

      const response = await fetch(`/api/admin/resources?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();
      
      const objects = data.data as IResourceItem[];
      const userIds = [...new Set(objects.map((item) => item.owner).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id, nickname, avatar_url")
          .in("id", userIds as string[]);
          
        if (profiles) {
           const profilesMap = new Map(profiles.map((p) => [p.id, p]));
           data.data = objects.map((item) => ({
             ...item,
             uploader: profilesMap.get(item.owner) || { nickname: 'Unknown' },
           }));
        }
      }

      return {
        data: data.data,
        total: data.total,
      };
    }
    
    if (resource === "wiki_revisions") {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      const current = pagination?.current || 1;
      const pageSize = pagination?.pageSize || 20;
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", current.toString());
      queryParams.append("pageSize", pageSize.toString());

      if (filters) {
        filters.forEach((filter) => {
          if ("field" in filter) {
             if (filter.field === "status") {
                 // Explicitly ignore "all" if it somehow gets passed, though undefined usually handles it.
                 // Also ensure unique values if it's an array.
                 if (Array.isArray(filter.value)) {
                     const uniqueValues = [...new Set(filter.value)];
                     uniqueValues.forEach((v: string) => {
                       if (v) queryParams.append("status", v);
                     });
                 } else {
                     if (filter.value) queryParams.append("status", filter.value as string);
                 }
             }
             if (filter.field === "article_id") {
                 queryParams.append("article_id", filter.value as string);
             }
          }
        });
      }

      const response = await fetch(`/api/admin/wikis/revisions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();

      return {
        data: data.data,
        total: data.total,
      };
    }
    
    return baseDataProvider.getList({ resource, pagination, filters, sorters, meta });
  },

  deleteMany: async ({ resource, ids, variables, meta }) => {
    if (resource === "resources") {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      const response = await fetch(`/api/admin/resources`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }
      
      return { data: [] };
    }
    
     
    return baseDataProvider.deleteMany!({ resource, ids, variables, meta });
  },

  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    if (url.startsWith("/api")) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return Promise.reject(new Error("No active session"));
      }

      let requestUrl = url;
      if (query) {
        const queryParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });
        const separator = requestUrl.includes("?") ? "&" : "?";
        requestUrl += `${separator}${queryParams.toString()}`;
      }

      const response = await fetch(requestUrl, {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
      }

      const data = await response.json();

      return {
        data,
      };
    }

    if (baseDataProvider.custom) {
        return baseDataProvider.custom({ url, method, filters, sorters, payload, query, headers });
    }
    
    throw new Error("Custom method not implemented in base data provider");
  },
};
