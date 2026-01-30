import { DeleteButton, EditButton, List, useTable } from "@refinedev/antd";
import { type BaseRecord, usePermissions } from "@refinedev/core";
import { Space, Table, Tag } from "antd";
import { isSuperAdmin } from "../../../utility/helpers";

export const RoleList = () => {
  const { data: permissions } = usePermissions<string[]>();
  const isSuper = isSuperAdmin(permissions);
  const { tableProps } = useTable({
    resource: "cms_roles", // Matches resource name in App.tsx
    syncWithLocation: true,
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" width={80} />
        <Table.Column dataIndex="name" title="Role Name" />
        <Table.Column 
            dataIndex="description" 
            title="Description" 
            render={(value) => value || '-'}
        />
        <Table.Column
          dataIndex="is_system"
          title="System Role"
          render={(value) => (
            <Tag color={value ? "red" : "green"}>
              {value ? "System" : "Custom"}
            </Tag>
          )}
        />
        <Table.Column
            dataIndex="created_at"
            title="Created At"
            render={(value) => new Date(value).toLocaleString()}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space size={8}>
              <EditButton hideText size="small" recordItemId={record.id} />
              {(!record.is_system || isSuper) && <DeleteButton hideText size="small" recordItemId={record.id} />}
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
