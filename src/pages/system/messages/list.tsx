import { List, useTable } from "@refinedev/antd";
import { type BaseRecord, type CrudFilter, type HttpError } from "@refinedev/core";
import { Table, Tag, Typography } from "antd";
import { GenericSearchForm, type SearchField } from "../../../components/search/GenericSearchForm";

const TYPE_MAP: Record<string, string> = {
  comment: '评论',
  like: '点赞',
  reply: '回复',
  follow: '关注',
  system: '系统通知',
  report_resolved: '举报已处理',
  report_rejected: '举报已驳回',
};

const RELATED_TYPE_MAP: Record<string, string> = {
  post: '帖子',
  comment: '评论',
  user: '用户',
};

export const MessageList = () => {
  // We list notifications that are sent by admin.
  // We need to filter by metadata->sent_by_admin = true.
  // Refine's filter operator 'eq' works on columns.
  // For JSONB, Supabase supports arrow operators but Refine might need 'raw' filter or custom logic.
  // However, `customDataProvider` might just pass filters to Supabase.
  
  // The user requirement says "System Messages".
  // If we map this resource to "notifications", we can use filters.
  
  const { tableProps, searchFormProps, setFilters } = useTable<BaseRecord, HttpError, {
    user_nickname?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    created_at?: any[];
    type?: string;
    related_type?: string;
    related_id?: string;
    is_read?: boolean;
  }>({
    resource: "notifications",
    syncWithLocation: true,
    filters: {
      permanent: [
        {
          field: "type",
          operator: "eq",
          value: "system", 
        },
        // We might also want to filter by metadata->sent_by_admin, but 'type=system' might be enough
        // based on the previous context that system messages are type='system'.
      ],
    },
    meta: {
        select: "*, user:profiles!notifications_user_id_profiles_fkey(nickname, email), actor:profiles!notifications_actor_id_profiles_fkey(nickname)"
    },
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
    onSearch: (values) => {
      const filters: CrudFilter[] = [];
      const { user_nickname, created_at, type, related_type, related_id, is_read } = values;

      filters.push({
        field: "type",
        operator: "eq",
        value: "system", 
      });

      if (user_nickname) {
        filters.push({
          field: "user.nickname",
          operator: "contains",
          value: user_nickname,
        });
      }

      if (created_at && created_at.length === 2) {
        filters.push({
            field: "created_at",
            operator: "gte",
            value: created_at[0].startOf('day').toISOString(),
        });
        filters.push({
            field: "created_at",
            operator: "lte",
            value: created_at[1].endOf('day').toISOString(),
        });
      }

      if (type) {
        filters.push({
          field: "type",
          operator: "eq",
          value: type,
        });
      }

      if (related_type) {
        filters.push({
          field: "related_type",
          operator: "eq",
          value: related_type,
        });
      }

      if (related_id) {
        filters.push({
          field: "related_id",
          operator: "eq",
          value: related_id,
        });
      }

      if (typeof is_read === 'boolean') {
        filters.push({
          field: "is_read",
          operator: "eq",
          value: is_read,
        });
      }

      return filters;
    },
  });

  const searchFields: SearchField[] = [
    {
      name: "user_nickname",
      label: "接收者昵称",
      type: "input",
      style: { width: 150 },
    },
    {
        name: "created_at",
        label: "创建时间",
        type: "dateRange",
        style: { width: 240 },
    },
    {
        name: "type",
        label: "类型",
        type: "select",
        options: Object.entries(TYPE_MAP).map(([value, label]) => ({ label, value })),
        style: { width: 120 },
    },
    {
        name: "related_type",
        label: "关联类型",
        type: "select",
        options: Object.entries(RELATED_TYPE_MAP).map(([value, label]) => ({ label, value })),
        style: { width: 120 },
    },
    {
        name: "related_id",
        label: "关联ID",
        type: "input",
        style: { width: 200 },
    },
    {
        name: "is_read",
        label: "状态",
        type: "select",
        options: [
            { label: "已读", value: true },
            { label: "未读", value: false },
        ],
        style: { width: 100 },
    },
  ];

  return (
    <List>
      <GenericSearchForm
        searchFormProps={searchFormProps}
        fields={searchFields}
        onReset={() => setFilters([], "replace")}
      />
      <Table {...tableProps} rowKey="id">
        <Table.Column 
          dataIndex="id" 
          title="ID" 
          width={100} 
          render={(value) => <Typography.Text copyable ellipsis>{value}</Typography.Text>}
        />
        <Table.Column 
            dataIndex="content" 
            title="内容" 
            render={(value) => (
                <div style={{ maxWidth: 500, minWidth: 200, wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                    {value}
                </div>
            )}
        />
        <Table.Column 
            dataIndex="related_id" 
            title="关联ID" 
            width={100}
            minWidth={80}
            render={(value) => value ? <Typography.Text copyable ellipsis>{value}</Typography.Text> : '-'}
        />
        <Table.Column 
            dataIndex="type" 
            title="类型" 
            width={100} 
            minWidth={100}
            render={(value) => TYPE_MAP[value] || value}
        />
        <Table.Column 
            title="操作者昵称" 
            dataIndex={["actor", "nickname"]}
            width={150}
            minWidth={100}
            render={(value, record: { actor_id?: string }) => value || record.actor_id || '-'}
        />
        <Table.Column 
            dataIndex="related_type" 
            title="关联类型" 
            width={100} 
            minWidth={100}
            render={(value) => RELATED_TYPE_MAP[value] || value}
        />
        <Table.Column
            title="接收者"
            dataIndex={["user", "nickname"]}
            width={150}
            minWidth={100}
            render={(value, record: { user?: { email: string }; user_id: string }) =>
                value || record.user?.email || record.user_id
            }
        />
        <Table.Column
          dataIndex="is_read"
          title="状态"
          width={100}
          minWidth={100}
          render={(value) => (
            <Tag color={value ? "green" : "orange"}>
              {value ? "已读" : "未读"}
            </Tag>
          )}
        />
        <Table.Column
            dataIndex="created_at"
            title="发送时间"
            width={200}
            sorter
            render={(value) => new Date(value).toLocaleString()}
        />
      </Table>
    </List>
  );
};
