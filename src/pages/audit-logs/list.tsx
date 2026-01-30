import {
    DateField,
    List,
    useTable,
} from "@refinedev/antd";
import { Avatar, Card, Col, Row, Space, Table, Tag, Typography } from "antd";
import React from "react";
import type { IAuditLog } from "../../interfaces";

const { Text } = Typography;

export const AuditLogList: React.FC = () => {
  const { tableProps } = useTable<IAuditLog>({
    resource: "audit_logs",
    syncWithLocation: true,
    meta: {
      select: "*, operator:profiles(nickname, avatar_url)",
    },
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "green";
      case "UPDATE":
        return "blue";
      case "DELETE":
        return "red";
      default:
        return "default";
    }
  };

  return (
    <List>
      <Table 
        {...tableProps} 
        rowKey="id"
        expandable={{
          expandedRowRender: (record) => (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Previous Data" size="small">
                  <pre style={{ maxHeight: 300, overflow: "auto" }}>
                    {JSON.stringify(record.previous_data, null, 2)}
                  </pre>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="New Data" size="small">
                  <pre style={{ maxHeight: 300, overflow: "auto" }}>
                    {JSON.stringify(record.new_data, null, 2)}
                  </pre>
                </Card>
              </Col>
            </Row>
          ),
          rowExpandable: (record) => !!record.previous_data || !!record.new_data,
        }}
      >
        <Table.Column
          dataIndex="operator"
          title="Operator"
          render={(_, record: IAuditLog) => (
            <Space>
              <Avatar src={record.operator?.avatar_url} icon={!record.operator?.avatar_url && "U"} />
              <Text>{record.operator?.nickname || "Unknown"}</Text>
            </Space>
          )}
        />
        <Table.Column
          dataIndex="action"
          title="Action"
          render={(value) => (
            <Tag color={getActionColor(value)}>{value}</Tag>
          )}
        />
        <Table.Column dataIndex="resource" title="Resource" />
        <Table.Column dataIndex="target_id" title="Target ID" />
        <Table.Column
          dataIndex="created_at"
          title="Time"
          render={(value) => <DateField value={value} format="YYYY-MM-DD HH:mm:ss" />}
        />
      </Table>
    </List>
  );
};
