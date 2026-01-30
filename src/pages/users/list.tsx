import { EyeOutlined } from "@ant-design/icons";
import {
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import type { BaseRecord, CrudFilters, HttpError } from "@refinedev/core";
import { useUpdateMany } from "@refinedev/core";
import { Avatar, Button, Card, Form, Input, Modal, Space, Table, Tag, Typography } from "antd";
import type dayjs from "dayjs";
import { useState } from "react";
import { GenericSearchForm } from "../../components/search/GenericSearchForm";
import { ExportButton } from "../../components/table/ExportButton";
import { UserDetailModal } from "./UserDetailModal";

const { Text } = Typography;

const TITLE_LEVEL_MAP: Record<number, string> = {
  1: "白身",
  2: "学人",
  3: "术士",
  4: "方家",
  5: "先生",
  6: "国手",
};

interface IUserSearch {
    nickname?: string;
    created_at?: [dayjs.Dayjs, dayjs.Dayjs];
    balance_range?: [number, number];
}

interface IProfile extends BaseRecord {
    nickname: string;
    avatar_url?: string;
    role: string;
    cms_role_id?: number;
    cms_role?: {
      name: string;
    };
    contribution_score: number;
    is_banned: boolean;
    ban_reason?: string;
    coin_paid?: number;
    email?: string;
    phone?: string;
    coin_free?: number;
    title_level?: number;
}

export const UserList = () => {
  const { tableProps, searchFormProps, setFilters } = useTable<IProfile, HttpError, IUserSearch>({
    resource: "profiles",
    syncWithLocation: true,
    meta: {
      select: "*, cms_role:cms_roles(name)",
    },
    onSearch: (params: unknown) => {
        const values = params as IUserSearch;
        const filters: CrudFilters = [];
        if (values.nickname) {
            filters.push({
                field: "nickname",
                operator: "contains",
                value: values.nickname,
            });
        }
        if (values.created_at && values.created_at.length === 2) {
            filters.push({
                field: "created_at",
                operator: "gte",
                value: values.created_at[0].startOf("day").toISOString(),
            });
            filters.push({
                field: "created_at",
                operator: "lte",
                value: values.created_at[1].endOf("day").toISOString(),
            });
        }
        if (values.balance_range && values.balance_range.length === 2) {
            filters.push({
                field: "coin_paid",
                operator: "gte",
                value: values.balance_range[0],
            });
            filters.push({
                field: "coin_paid",
                operator: "lte",
                value: values.balance_range[1],
            });
        }
        return filters;
    },
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Batch Operations
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { mutate: updateManyProfiles, isLoading: isBatchUpdating } = useUpdateMany();
  
  // Ban Modal
  const [isBanModalVisible, setIsBanModalVisible] = useState(false);
  const [banForm] = Form.useForm();

  const handleView = (id: string) => {
    setSelectedUserId(id);
    setIsModalVisible(true);
  };

  const handleBatchBanClick = () => {
      setIsBanModalVisible(true);
      banForm.resetFields();
  };

  const handleBatchBanSubmit = async () => {
      const values = await banForm.validateFields();
      updateManyProfiles({
          resource: "profiles",
          ids: selectedRowKeys as string[],
          values: { 
              is_banned: true,
              ban_reason: values.reason 
          },
          successNotification: {
              message: "批量封禁成功",
              type: "success",
          }
      }, {
          onSuccess: () => {
              setIsBanModalVisible(false);
              setSelectedRowKeys([]);
          }
      });
  };

  return (
    <List>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <GenericSearchForm
            searchFormProps={searchFormProps}
            fields={[
                {
                    name: "nickname",
                    label: "昵称",
                    type: "input",
                    style: { width: 150 },
                },
                {
                    name: "created_at",
                    label: "注册时间",
                    type: "dateRange",
                    style: { width: 240 },
                },

            ]}
            onReset={() => {
                setFilters([], "replace");
            }}
        />
        <ExportButton resource="profiles" />
      </div>

      {selectedRowKeys.length > 0 && (
        <Card bordered={false} style={{ marginBottom: 16 }} bodyStyle={{ padding: "12px 24px" }}>
            <Space>
                <span>已选择 {selectedRowKeys.length} 项</span>
                <Button danger type="primary" onClick={handleBatchBanClick} loading={isBatchUpdating}>
                    批量封禁
                </Button>
                <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
        </Card>
      )}

      <Table 
        {...tableProps} 
        rowKey="id"
        rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
        }}
      >
        <Table.Column
          dataIndex="nickname"
          title="用户"
          render={(value, record: IProfile) => (
            <Space>
              <Avatar src={record.avatar_url} />
              <Text>
                {value || "Unknown"}
                {record.title_level && (
                   <Tag color="gold" style={{ marginLeft: 8 }}>
                     Lv.{record.title_level} {TITLE_LEVEL_MAP[record.title_level] || ""}
                   </Tag>
                )}
              </Text>
            </Space>
          )}
        />
        <Table.Column
          dataIndex="email"
          title="邮箱"
        />
        <Table.Column
          dataIndex="phone"
          title="手机号"
        />
        <Table.Column
          title="易币总余额"
          width={120}
          render={(_, record: IProfile) => (
            <Text>{(record.coin_paid || 0) + (record.coin_free || 0)}</Text>
          )}
        />
        <Table.Column
          dataIndex="role"
          title="角色"
          render={(value, record: IProfile) => {
            if (record.cms_role?.name) {
              return <Tag color="purple">{record.cms_role.name}</Tag>;
            }
            return <Tag color={value === "admin" ? "red" : "blue"}>{value}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="contribution_score"
          title="积分"
        />
        <Table.Column
          dataIndex="is_banned"
          title="状态"
          render={(value: boolean) => (
            <Tag color={value ? "red" : "green"}>{value ? "已封禁" : "正常"}</Tag>
          )}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleView(record.id as string)}
              />
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
      <UserDetailModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        userId={selectedUserId}
      />
      <Modal
        title="批量封禁"
        open={isBanModalVisible}
        onOk={handleBatchBanSubmit}
        onCancel={() => setIsBanModalVisible(false)}
        confirmLoading={isBatchUpdating}
      >
        <Form form={banForm} layout="vertical">
            <Form.Item
                name="reason"
                label="封禁原因"
                rules={[{ required: true, message: "请输入封禁原因" }]}
            >
                <Input.TextArea rows={4} placeholder="请输入统一的封禁原因" />
            </Form.Item>
        </Form>
      </Modal>
    </List>
  );
};
