import { BookOutlined, CloudServerOutlined, DashboardOutlined, FileSearchOutlined, FileTextOutlined, MessageOutlined, PayCircleOutlined, SafetyCertificateOutlined, TagsOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { ErrorComponent, RefineThemes, ThemedLayoutV2, ThemedTitleV2, useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import { Authenticated, CanAccess, Refine, type ResourceProps } from "@refinedev/core";
import routerBindings, { CatchAllNavigate, DocumentTitleHandler, NavigateToResource, UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { App as AntdApp, ConfigProvider } from "antd";
import { useEffect, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { CustomHeader } from "./components/layout/header";
import { CustomSider } from "./components/layout/sider";
import { AuditLogList } from "./pages/audit-logs";
import { ForgotPasswordPage, LoginPage, RegisterPage, UpdatePasswordPage } from "./pages/auth";
import { CaseOpsEdit, CaseOpsList } from "./pages/case-ops";
import { CommentEdit, CommentList } from "./pages/comments";
import { DashboardPage } from "./pages/dashboard";
import { BookReviewPage, LibraryBookCreate, LibraryBookEdit, LibraryBookList } from "./pages/library-books";
import { PostEdit, PostList } from "./pages/posts";
import { RechargeOptionList } from "./pages/recharge-options";
import { RechargeRecordList } from "./pages/recharge-records";
import { ReportList, ReportShow } from "./pages/reports";
import { MessageCreate, MessageList } from "./pages/system/messages";
import { RoleCreate, RoleEdit, RoleList } from "./pages/system/roles";
import { TagList } from "./pages/tags";
import { ResourceList } from "./pages/user-resources";
import { UserEdit, UserList } from "./pages/users";
import { WikiCreate, WikiEdit, WikiList } from "./pages/wikis";
import { authProvider } from "./utility/authProvider";


import { accessControlProvider } from "./providers/accessControlProvider";
import { customDataProvider } from "./providers/customDataProvider";
import { supabaseClient } from "./utility/supabaseClient";

import { PERMISSIONS } from "./constants/permissions";

// Placeholder components for new resources
const PlaceholderList = () => <div>List Page</div>;
const PlaceholderEdit = () => <div>Edit Page</div>;
const PlaceholderCreate = () => <div>Create Page</div>;
const PlaceholderShow = () => <div>Show Page</div>;

const RESOURCE_CONFIGS: Record<string, {
  icon?: React.ReactNode;
  listPath?: string;
  create?: boolean;
  edit?: boolean;
  show?: boolean;
  listComponent?: React.ComponentType;
  createComponent?: React.ComponentType;
  editComponent?: React.ComponentType;
  showComponent?: React.ComponentType;
  reviewComponent?: React.ComponentType;
  resource?: string;
}> = {
  [PERMISSIONS.DASHBOARD]: {
    icon: <DashboardOutlined />,
    listPath: "/",
    listComponent: DashboardPage,
  },
  [PERMISSIONS.REPORTS]: {
    icon: <SafetyCertificateOutlined />,
    show: true,
    resource: "reports",
    listComponent: ReportList,
    showComponent: ReportShow,
  },
  [PERMISSIONS.POSTS]: {
    icon: <FileTextOutlined />,
    create: true,
    edit: true,
    show: true,
    resource: "posts",
    listComponent: PostList,
    editComponent: PostEdit,
  },
  [PERMISSIONS.COMMENTS]: {
    icon: <MessageOutlined />,
    edit: true,
    listComponent: CommentList,
    editComponent: CommentEdit,
    resource: "comments",
  },
  [PERMISSIONS.USERS]: {
    icon: <UserOutlined />,
    edit: true,
    resource: "profiles",
    listComponent: UserList,
    editComponent: UserEdit,
  },
  [PERMISSIONS.USER_RESOURCES]: {
    icon: <CloudServerOutlined />,
    listComponent: ResourceList,
    resource: "user_resources",
  },
  [PERMISSIONS.RECHARGE_RECORDS]: {
    icon: <PayCircleOutlined />,
    listComponent: RechargeRecordList,
    resource: "coin_transactions",
  },
  [PERMISSIONS.RECHARGE_OPTIONS]: {
    icon: <WalletOutlined />,
    listComponent: RechargeOptionList,
    resource: "recharge_options",
    create: true,
    edit: true,
  },
  [PERMISSIONS.CASE_OPS]: {
    icon: <SafetyCertificateOutlined />,
    listComponent: CaseOpsList,
    editComponent: CaseOpsEdit,
    edit: true,
    resource: "case_metadata",
  },
  [PERMISSIONS.TAGS]: {
    icon: <TagsOutlined />,
    listComponent: TagList,
    resource: "tags",
  },
  [PERMISSIONS.WIKI]: {
    icon: <BookOutlined />,
    create: true,
    edit: true,
    show: true,
    resource: "wiki_articles",
    listComponent: WikiList,
    createComponent: WikiCreate,
    editComponent: WikiEdit,
  },
  [PERMISSIONS.SYSTEM_ROLES]: {
    icon: <SafetyCertificateOutlined />,
    create: true,
    edit: true,
    resource: "cms_roles",
    listComponent: RoleList,
    createComponent: RoleCreate,
    editComponent: RoleEdit,
  },
  [PERMISSIONS.SYSTEM_MESSAGES]: {
    icon: <MessageOutlined />,
    create: true,
    resource: "cms_notifications",
    listComponent: MessageList,
    createComponent: MessageCreate,
  },
  [PERMISSIONS.AUDIT_LOGS]: {
    icon: <FileSearchOutlined />,
    resource: "audit_logs",
    listComponent: AuditLogList,
  },
  [PERMISSIONS.LIBRARY_BOOKS]: {
    icon: <BookOutlined />,
    create: true,
    edit: true,
    resource: "library_books",
    listComponent: LibraryBookList,
    createComponent: LibraryBookCreate,
    editComponent: LibraryBookEdit,
    reviewComponent: BookReviewPage,
  },
  [PERMISSIONS.LIBRARY_BOOK_CONTENTS]: {
    resource: "library_book_contents",
  },
};

import { useNotification } from "@refinedev/core";
import { invalidatePermissionsCache } from "./utility/authProvider";

const PermissionListener = () => {
  const { open } = useNotification();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      // Get user's CMS role ID
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("cms_role_id")
        .eq("id", user.id)
        .single();

      if (!profile?.cms_role_id) return;

      const roleId = profile.cms_role_id;

      channel = supabaseClient
        .channel('public:cms_role_permissions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cms_role_permissions',
            filter: `role_id=eq.${roleId}`,
          },
          (payload) => {
            console.log('[PermissionListener] Permission changed:', payload);
            invalidatePermissionsCache(user.id);
            
            open?.({
              type: "progress",
              message: "权限已更新",
              description: "您的权限已变更，正在刷新...",
              key: "permission-update",
            });
            
            // Optionally force a reload or re-fetch resources
            // window.location.reload(); 
            // Better to just let the cache invalidation handle the next check
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [open]);

  return null;
};

function App() {
  const [resources, setResources] = useState<ResourceProps[]>([]);

  useEffect(() => {
    const fetchResources = async () => {
      // 1. Fetch DB permissions (primary source for labels)
      const { data: dbData } = await supabaseClient
        .from("cms_permissions")
        .select("*")
        .like("code", "/%")
        .order("id");

      const dbPermissionsMap = new Map(dbData?.map(p => [p.code, p]) || []);

      // 2. Check for Super Admin (Wildcard Access)
      const userPermissionsRaw = (await authProvider.getPermissions?.()) ?? [];
      const userPermissions = Array.isArray(userPermissionsRaw)
        ? (userPermissionsRaw as string[])
        : [];
      const isSuperAdmin = userPermissions.includes("*");

      // 3. Determine which codes to process
      // If Super Admin, include ALL codes from RESOURCE_CONFIGS to ensure menu visibility
      // even if missing from DB.
      let codesToProcess: string[] = [];
      
      if (dbData) {
        codesToProcess = dbData.map(p => p.code);
      }

      if (isSuperAdmin) {
        const configCodes = Object.keys(RESOURCE_CONFIGS);
        // Add any config codes that aren't in DB list
        configCodes.forEach(code => {
          if (!dbPermissionsMap.has(code)) {
            codesToProcess.push(code);
          }
        });
      }

      const generatedResources: ResourceProps[] = codesToProcess.map((code) => {
        const dbItem = dbPermissionsMap.get(code);
        const config = RESOURCE_CONFIGS[code] || {};
        
        // If not in DB, use config.resource or derive from code
        const name = config.resource || (dbItem ? dbItem.code.substring(1) : code.substring(1));
        
        // Fallback label for missing DB items
        const label = dbItem?.name || code; 

        return {
          name: code === PERMISSIONS.DASHBOARD ? "dashboard" : name,
          list: config.listPath || code,
          create: config.create ? `${code}/create` : undefined,
          edit: config.edit ? `${code}/edit/:id` : undefined,
          show: config.show ? `${code}/show/:id` : undefined,
          meta: {
            label: label,
            icon: config.icon,
            originalCode: code,
          },
        };
      });

      // Filter out duplicates if any (though map keys should prevent it)
      // and ensure unique names? 
      // Actually, ResourceProps 'name' must be unique.
      
      // Manual overrides (keep these for now if needed, but the logic above should cover most)
      // The logic above covers everything in RESOURCE_CONFIGS, so if manual overrides
      // were just adding missing items, they might be redundant for Super Admin,
      // but let's keep them for normal users or specific overrides.
      
      // ... (We can remove manual overrides if we are confident, but let's leave them for safety or clean them up)
      // Actually, looking at previous code, manual overrides provided specific 'meta.label'.
      // My logic uses 'code' as label if DB is missing.
      // So manual overrides are still useful for better labels on missing DB items.
      
      // Let's keep the manual overrides but ensure they don't duplicate.
      const existingNames = new Set(generatedResources.map(r => r.name));

      // Manual override for audit-logs
      if (!existingNames.has('audit_logs') && RESOURCE_CONFIGS[PERMISSIONS.AUDIT_LOGS]) {
         generatedResources.push({
           name: 'audit_logs',
           list: PERMISSIONS.AUDIT_LOGS,
           meta: {
             label: 'Audit Logs',
             icon: RESOURCE_CONFIGS[PERMISSIONS.AUDIT_LOGS].icon,
             originalCode: PERMISSIONS.AUDIT_LOGS,
           }
         });
         existingNames.add('audit_logs');
      }

      // Manual override for library-books
      if (!existingNames.has('library_books') && RESOURCE_CONFIGS[PERMISSIONS.LIBRARY_BOOKS]) {
         generatedResources.push({
           name: 'library_books',
           list: PERMISSIONS.LIBRARY_BOOKS,
           create: `${PERMISSIONS.LIBRARY_BOOKS}/create`,
           edit: `${PERMISSIONS.LIBRARY_BOOKS}/edit/:id`,
           meta: {
             label: 'Library Books',
             icon: RESOURCE_CONFIGS[PERMISSIONS.LIBRARY_BOOKS].icon,
             originalCode: PERMISSIONS.LIBRARY_BOOKS,
           }
         });
         existingNames.add('library_books');
      }

      // Manual override for recharge-options
      if (!existingNames.has('recharge_options') && RESOURCE_CONFIGS[PERMISSIONS.RECHARGE_OPTIONS]) {
         generatedResources.push({
           name: 'recharge_options',
           list: PERMISSIONS.RECHARGE_OPTIONS,
           create: `${PERMISSIONS.RECHARGE_OPTIONS}/create`,
           edit: `${PERMISSIONS.RECHARGE_OPTIONS}/edit/:id`,
           meta: {
             label: '充值配置',
             icon: RESOURCE_CONFIGS[PERMISSIONS.RECHARGE_OPTIONS].icon,
             originalCode: PERMISSIONS.RECHARGE_OPTIONS,
           }
         });
         existingNames.add('recharge_options');
      }

      setResources(generatedResources);
    };

    fetchResources();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchResources();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ConfigProvider theme={RefineThemes?.Blue}>
        <AntdApp>
          <Refine
            notificationProvider={useNotificationProvider}
            routerProvider={routerBindings}
            dataProvider={customDataProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            resources={resources}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated-inner"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <ThemedLayoutV2
                      Title={({ collapsed }) => <ThemedTitleV2 collapsed={collapsed} text="WebCMS" />}
                      Sider={CustomSider}
                      Header={CustomHeader}
                    >
                      <PermissionListener />
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                {resources.map((resource) => {
                  const config = RESOURCE_CONFIGS[resource.meta?.originalCode] || {};
                  const isDashboard = resource.name === "dashboard";
                  const ListComp = config.listComponent || PlaceholderList;
                  const CreateComp = config.createComponent || PlaceholderCreate;
                  const EditComp = config.editComponent || PlaceholderEdit;
                  const ShowComp = config.showComponent || PlaceholderShow;
                  const ReviewComp = config.reviewComponent;
                  
                  // Use original permission code for access check to ensure it matches DB permissions
                  const permissionCode = resource.meta?.originalCode || resource.name;

                  if (isDashboard) {
                    return (
                      <Route 
                        key={resource.name} 
                        index 
                        element={
                          <CanAccess resource={permissionCode} action="list" fallback={<ErrorComponent />}>
                            <ListComp />
                          </CanAccess>
                        } 
                      />
                    );
                  }

                  return (
                    <Route key={resource.name} path={resource.list as string}>
                      <Route 
                        index 
                        element={
                          <CanAccess resource={permissionCode} action="list" fallback={<ErrorComponent />}>
                            <ListComp />
                          </CanAccess>
                        } 
                      />
                      {resource.create && (
                        <Route 
                          path="create" 
                          element={
                            <CanAccess resource={permissionCode} action="create" fallback={<ErrorComponent />}>
                              <CreateComp />
                            </CanAccess>
                          } 
                        />
                      )}
                      {resource.edit && (
                        <Route 
                          path="edit/:id" 
                          element={
                            <CanAccess resource={permissionCode} action="edit" fallback={<ErrorComponent />}>
                              <EditComp />
                            </CanAccess>
                          } 
                        />
                      )}
                      {resource.show && (
                        <Route 
                          path="show/:id" 
                          element={
                            <CanAccess resource={permissionCode} action="show" fallback={<ErrorComponent />}>
                              <ShowComp />
                            </CanAccess>
                          } 
                        />
                      )}
                      {ReviewComp && (
                        <Route 
                          path="review/:id" 
                          element={
                            <CanAccess resource={permissionCode} action="edit" fallback={<ErrorComponent />}>
                              <ReviewComp />
                            </CanAccess>
                          } 
                        />
                      )}
                    </Route>
                  );
                })}
                <Route path="*" element={<ErrorComponent />} />
              </Route>
              <Route
                element={
                  <Authenticated
                    key="authenticated-outer"
                    fallback={<Outlet />}
                  >
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
