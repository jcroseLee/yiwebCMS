import { useForm } from "@refinedev/antd";
import { useList, useNavigation, usePermissions } from "@refinedev/core";
import { Button, Card, Form, Input, Space, Spin, Tree, message } from "antd";
import type { DataNode } from "antd/es/tree";
import React, { useEffect, useMemo, useState } from "react";
import { isSuperAdmin } from "../../../utility/helpers";
import { supabaseClient } from "../../../utility/supabaseClient";

interface RoleFormProps {
  action: "create" | "edit";
}

type RoleFormValues = {
  name: string;
  description?: string;
};

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
}

export const RoleForm: React.FC<RoleFormProps> = ({ action }) => {
  const { list } = useNavigation();
  const { formProps, queryResult, formLoading } = useForm({
    resource: "cms_roles",
    action,
    redirect: "list",
  });

  const roleData = queryResult?.data?.data;
  const { data: permissions } = usePermissions<string[]>();
  const isSuper = isSuperAdmin(permissions);
  const isDisabled = Boolean(roleData?.is_system) && !isSuper;
  const canEdit = !isDisabled;

  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Fetch all permissions using Refine's useList
  const { data: permissionsData, isLoading: isLoadingPermissions } = useList<Permission>({
    resource: "cms_permissions",
    pagination: { mode: "off" },
    sorters: [
      {
        field: "code",
        order: "asc",
      },
    ],
  });

  // Build tree structure dynamically based on code hierarchy
  const treeData = useMemo(() => {
    const permissions = permissionsData?.data || [];
    if (!permissions.length) return [];

    const nodeMap = new Map<string, DataNode & { children: DataNode[] }>();

    // 1. Create nodes
    permissions.forEach((p) => {
      nodeMap.set(p.code, {
        title: `${p.name} ${p.description ? `(${p.description})` : ""}`,
        key: p.code,
        children: [],
      });
    });

    const rootNodes: DataNode[] = [];

    // 2. Build hierarchy
    permissions.forEach((p) => {
      const node = nodeMap.get(p.code)!;
      let parentFound = false;

      // Try to find parent by path (e.g. /system/roles -> /system)
      if (p.code.includes("/")) {
        const lastSlash = p.code.lastIndexOf("/");
        if (lastSlash > 0) {
          const parentCode = p.code.substring(0, lastSlash);
          if (nodeMap.has(parentCode)) {
            nodeMap.get(parentCode)!.children.push(node);
            parentFound = true;
          }
        }
      }

      if (!parentFound) {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [permissionsData]);

  // Fetch current role's permissions
  useEffect(() => {
    const fetchRolePermissions = async () => {
      if (!roleData?.id) return;

      setLoadingPermissions(true);
      const { data, error } = await supabaseClient
        .from("cms_role_permissions")
        .select("permission_id, cms_permissions(code)")
        .eq("role_id", roleData.id);

      if (error) {
        console.error("Error fetching role permissions:", error);
      } else {
        const rolePermissions = data ?? [];
        const codes = rolePermissions
          .flatMap((item: { cms_permissions?: { code?: string } | { code?: string }[] | null }) => {
            const perms = item.cms_permissions;
            if (Array.isArray(perms)) {
              return perms.map((perm) => perm.code).filter((code): code is string => Boolean(code));
            }
            if (perms?.code) {
              return [perms.code];
            }
            return [];
          })
          .filter((code): code is string => Boolean(code));
        setCheckedKeys(codes);
      }
      setLoadingPermissions(false);
    };

    if (action === "edit" && roleData?.id) {
      fetchRolePermissions();
    }
  }, [action, roleData?.id]);

  // Handle Tree Check
  const onCheck = (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    if (isDisabled) return;

    const keys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedKeys(keys);
  };

  const onFinish = async (values: RoleFormValues) => {
    try {
        if (isDisabled) return;

        const rolePayload = {
            name: values.name,
            description: values.description,
        };

        let roleId = roleData?.id;

        if (action === "create") {
            const { data, error } = await supabaseClient
                .from("cms_roles")
                .insert(rolePayload)
                .select()
                .single();
            
            if (error) throw error;
            roleId = data.id;
        } else {
            const { error } = await supabaseClient
                .from("cms_roles")
                .update(rolePayload)
                .eq("id", roleId);
            if (error) throw error;
        }

        // Update Permissions
        if (roleId && !isDisabled) {
             // 1. Delete old permissions
             await supabaseClient
                .from("cms_role_permissions")
                .delete()
                .eq("role_id", roleId);

             // 2. Insert new permissions
             const allPerms = permissionsData?.data || [];
             
             const permissionRecords = checkedKeys.reduce<Array<{ role_id: number; permission_id: number }>>(
               (acc, code) => {
                 const perm = allPerms.find((p) => p.code === code);
                 if (perm) {
                   acc.push({ role_id: roleId as number, permission_id: perm.id });
                 }
                 return acc;
               },
               []
             );
             
             if (permissionRecords.length > 0) {
                 const { error: permError } = await supabaseClient
                    .from("cms_role_permissions")
                    .insert(permissionRecords);
                 if (permError) throw permError;
             }
        }
        
        message.success("Role saved successfully");
        list("cms_roles");
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(error);
        message.error("Error saving role: " + errorMessage);
    }
  };

  const handleSave = async () => {
      try {
        const values = await formProps.form?.validateFields();
        if (!values) return;
        await onFinish(values as RoleFormValues);
      } catch {
        return;
      }
  };

  return (
    <Card title={action === "create" ? "Create Role" : "Edit Role"}>
      <Form {...formProps} layout="vertical" onFinish={undefined}>
        <Form.Item
          label="Role Name"
          name="name"
          rules={[{ required: true, message: "Please enter role name" }]}
        >
          <Input disabled={!canEdit} />
        </Form.Item>
        <Form.Item
          label="Description"
          name="description"
        >
          <Input.TextArea rows={2} disabled={!canEdit} />
        </Form.Item>

        <Form.Item label="Permissions">
            {isLoadingPermissions || loadingPermissions ? (
                <Spin />
            ) : (
                <Tree
                    checkable
                    defaultExpandAll
                    checkedKeys={checkedKeys}
                    onCheck={onCheck}
                    treeData={treeData}
                    disabled={!canEdit}
                />
            )}
        </Form.Item>
      </Form>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Space size={8}>
          <Button onClick={() => list("cms_roles")}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={formLoading || isLoadingPermissions || loadingPermissions}
            disabled={!canEdit}
          >
            Save
          </Button>
        </Space>
      </div>
    </Card>
  );
};
