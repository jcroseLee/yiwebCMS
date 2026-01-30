import {
  List,
  useTable,
} from "@refinedev/antd";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useMany } from "@refinedev/core";
import { Space, Spin, Table, Tabs, Tag, Typography } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";

const { Text } = Typography;

export const ReportList = () => {
  const [activeTab, setActiveTab] = useState<string>("pending");

  const { tableProps, setFilters } = useTable<BaseRecord, HttpError>({
    resource: "reports",
    syncWithLocation: true,
    filters: {
      initial: [
        {
          field: "status",
          operator: "eq",
          value: "pending",
        },
      ],
    },
  });

  const { data: userData, isLoading: userLoading } = useMany({
    resource: "profiles",
    ids: tableProps.dataSource?.map((item) => item.reporter_id).filter(Boolean) || [],
    queryOptions: {
      enabled: !!tableProps.dataSource,
    },
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setFilters(
      key === "all"
        ? []
        : [
            {
              field: "status",
              operator: "eq",
              value: key,
            },
          ],
      "replace" // Replace existing filters
    );
  };

  const reasonMap: Record<string, string> = {
    compliance: "违法违规",
    superstition: "封建迷信",
    scam: "广告诈骗",
    attack: "人身攻击",
    spam: "垃圾内容",
  };

  const targetTypeMap: Record<string, string> = {
    post: "帖子",
    comment: "评论",
    user: "用户",
  };

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: "orange", text: "待处理" },
    resolved: { color: "green", text: "已处理" },
    rejected: { color: "red", text: "已驳回" },
  };

  return (
    <List>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { label: "待处理", key: "pending" },
          { label: "已处理", key: "resolved" },
          { label: "已驳回", key: "rejected" },
          { label: "全部", key: "all" },
        ]}
      />
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="reporter_id"
          title="举报人id"
          render={(value: string) => <Text>{value || "Unknown"}</Text>}
        />
        <Table.Column
          dataIndex="reporter_id"
          title="举报人昵称"
          render={(value: string) => {
            if (userLoading) return <Spin size="small" />;
            const user = userData?.data.find((u) => u.id === value);
            return <Text>{user?.nickname || value || "Unknown"}</Text>;
          }}
        />
        <Table.Column
          dataIndex="target_type"
          title="目标类型"
          render={(value: string) => <Tag>{targetTypeMap[value] || value}</Tag>}
        />
        <Table.Column
          dataIndex="reason_category"
          title="原因"
          render={(value: string) => reasonMap[value] || value}
        />
        <Table.Column
          dataIndex="status"
          title="状态"
          render={(value: string) => {
            const status = statusMap[value] || { color: "default", text: value };
            return <Tag color={status.color}>{status.text}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="created_at"
          title="举报时间"
          render={(value: string) => <Text>{new Date(value).toLocaleString()}</Text>}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <Link to={`/reports/show/${record.id}`}>查看详情</Link>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
