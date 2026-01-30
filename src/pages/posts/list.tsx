import {
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  GiftOutlined,
  GlobalOutlined,
  LikeOutlined,
  MessageOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StopOutlined
} from "@ant-design/icons";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  useTable
} from "@refinedev/antd";
import {
  type CrudFilters,
  type HttpError,
  useDeleteMany,
  useUpdate,
  useUpdateMany,
} from "@refinedev/core";
import {
  App,
  Badge,
  type BadgeProps,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip
} from "antd";
import type { Dayjs } from "dayjs";
import React, { useState } from "react";
import { GenericSearchForm } from "../../components/search/GenericSearchForm";
import { ExportButton } from "../../components/table/ExportButton";
import {
  type IPost,
  PostStatus,
  PostStatusLabels,
  PostType,
  PostTypeLabels,
} from "../../interfaces";
import { supabaseClient } from "../../utility/supabaseClient";

interface IPostSearchVariables {
  title: string;
  type: PostType;
  status: PostStatus;
  author_id: string;
  id: string;
  feature: string;
  divination_record_id: string;
  created_at?: [Dayjs, Dayjs];
}

// Extend IPost to include author from relation
interface PostWithAuthor extends IPost {
  author?: {
    nickname: string;
    avatar_url: string;
    reputation?: number;
  };
  method?: string; // Add method field matching DB
  bounty?: number;
}

export const PostList: React.FC = () => {
  const { message } = App.useApp();
  const { tableProps, searchFormProps, setFilters, filters } = useTable<
    PostWithAuthor,
    HttpError,
    IPostSearchVariables
  >({
    resource: "posts",
    syncWithLocation: true,
    meta: {
      select: "*, author:profiles(nickname, avatar_url)",
    },
    onSearch: (values) => {
      const filters: CrudFilters = [];
      if (values.title) {
        filters.push({
          field: "title",
          operator: "contains",
          value: values.title,
        });
      }
      if (values.feature) {
        if (values.feature === "sticky") {
          filters.push({
            field: "sticky_until",
            operator: "gt",
            value: new Date().toISOString(),
          });
        } else if (values.feature === "urgent") {
          filters.push({
            field: "is_urgent",
            operator: "eq",
            value: true,
          });
        } else if (values.feature === "bounty") {
          filters.push({
            field: "bounty",
            operator: "gt",
            value: 0,
          });
        }
      }
      if (values.type) {
        filters.push({
          field: "type",
          operator: "eq",
          value: values.type,
        });
      }
      if (values.status) {
        filters.push({
          field: "status",
          operator: "eq",
          value: values.status,
        });
      }
      if (values.id) {
        filters.push({
          field: "id",
          operator: "eq",
          value: values.id,
        });
      }
      // Author search could be complex if searching by name, but here we use exact ID from select
      // Or if we want to search by nickname, we might need a different approach or backend support
      // For now, let's assume specific author ID filter
      if (values.author_id) {
        filters.push({
          field: "user_id",
          operator: "eq",
          value: values.author_id,
        });
      }
      if (values.divination_record_id) {
        filters.push({
          field: "divination_record_id",
          operator: "eq",
          value: values.divination_record_id,
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
      return filters;
    },
  });

  const { mutate: updatePost } = useUpdate();
  const { mutate: updateManyPosts, isLoading: isBatchUpdating } = useUpdateMany();
  const { mutate: deleteManyPosts, isLoading: isBatchDeleting } = useDeleteMany();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Batch Actions
  const handleBatchApprove = () => {
    updateManyPosts({
      resource: "posts",
      ids: selectedRowKeys as string[],
      values: { status: PostStatus.PUBLISHED },
      successNotification: {
        message: "批量审核通过成功",
        type: "success",
      },
    }, {
      onSuccess: () => setSelectedRowKeys([]),
    });
  };

  const handleBatchArchive = () => {
    updateManyPosts({
      resource: "posts",
      ids: selectedRowKeys as string[],
      values: { status: PostStatus.ARCHIVED },
      successNotification: {
        message: "批量归档成功",
        type: "success",
      },
    }, {
      onSuccess: () => setSelectedRowKeys([]),
    });
  };

  const handleBatchDelete = () => {
    deleteManyPosts({
      resource: "posts",
      ids: selectedRowKeys as string[],
      successNotification: {
        message: "批量删除成功",
        type: "success",
      },
    }, {
      onSuccess: () => setSelectedRowKeys([]),
    });
  };

  // Tabs for Status
  const currentStatus =
    (filters.find((f) => "field" in f && f.field === "status")?.value as string) || "all";
  const [activeTab, setActiveTab] = useState<string>(currentStatus);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setFilters([
      {
        field: "status",
        operator: "eq",
        value: key === "all" ? undefined : key,
      },
    ]);
  };

  // Close Case Modal State
  const [isCloseCaseModalVisible, setIsCloseCaseModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [closeCaseForm] = Form.useForm();
  const [isSubmittingCloseCase, setIsSubmittingCloseCase] = useState(false);

  // Grant Points Modal State
  const [isGrantPointsModalVisible, setIsGrantPointsModalVisible] = useState(false);
  const [grantPointsForm] = Form.useForm();
  const [isSubmittingGrantPoints, setIsSubmittingGrantPoints] = useState(false);

  // Copy ID
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("ID copied");
  };

  // Custom Actions
  const handleArchive = (id: string) => {
    updatePost({
      resource: "posts",
      id,
      values: {
        status: PostStatus.ARCHIVED,
      },
      successNotification: {
        message: "已归档",
        type: "success",
      },
    });
  };

  const handlePreview = (id: string) => {
    // Assuming web runs on localhost:3000 in dev, or relative path in prod if same domain
    // Adjust base URL as needed
    const baseUrl = import.meta.env.VITE_WEB_URL || "http://localhost:3000";
    window.open(`${baseUrl}/community/${id}`, "_blank");
  };

  const handleGrantPoints = (record: PostWithAuthor) => {
    grantPointsForm.setFieldsValue({
      post_id: record.id,
      post_title: record.title,
      author_id: record.user_id,
      author_nickname: record.author?.nickname || 'Unknown',
      current_reputation: record.author?.reputation || 0,
      amount: 10,
      reason: '',
      related_type: 'post',
      related_id: record.id,
    });
    setIsGrantPointsModalVisible(true);
  };

  const handleGrantPointsSubmit = async () => {
    try {
      const values = await grantPointsForm.validateFields();
      setIsSubmittingGrantPoints(true);

      const { author_id, amount, reason, related_id } = values;

      // 1. Get current reputation fresh from DB
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('reputation')
        .eq('id', author_id)
        .single();

      if (profileError) throw profileError;
      
      const currentReputation = profile?.reputation || 0;
      const newReputation = Math.max(0, currentReputation + amount);

      // 2. Update profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ reputation: newReputation })
        .eq('id', author_id);

      if (updateError) throw updateError;

      // 3. Insert log
      const { error: logError } = await supabaseClient
        .from('reputation_logs')
        .insert({
          user_id: author_id,
          amount,
          reason,
          related_id, // Assuming 'related_id' column exists
          // related_type, // Skip if column doesn't exist, check schema later if needed
          reputation_before: currentReputation,
          reputation_after: newReputation,
        });
      
      if (logError) {
          console.error("Log error (non-fatal):", logError);
          // Don't throw, just log
      }

      message.success("授分成功");
      setIsGrantPointsModalVisible(false);
      // Refresh table to show updated data if needed (though reputation isn't in main table columns usually)
      if (tableProps.pagination && typeof tableProps.pagination !== "boolean") {
        tableProps.pagination.onChange?.(
          tableProps.pagination.current || 1,
          tableProps.pagination.pageSize || 10
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`授分失败: ${errorMessage}`);
    } finally {
      setIsSubmittingGrantPoints(false);
    }
  };

  // Close Case Logic
  const handleCloseCaseClick = (id: string) => {
    setSelectedPostId(id);
    setIsCloseCaseModalVisible(true);
    closeCaseForm.resetFields();
  };

  const handleCloseCaseSubmit = async () => {
    try {
      const values = await closeCaseForm.validateFields();
      setIsSubmittingCloseCase(true);

      // Save to case_metadata (or call RPC)
      // Assuming 'admin_close_case' RPC or direct insert
      // Let's try direct insert to case_metadata and update post status
      
      if (!selectedPostId) return;

      const { error: metadataError } = await supabaseClient
        .from("case_metadata")
        .upsert({
            post_id: selectedPostId,
            feedback_content: values.feedback_content,
            accuracy_rating: values.accuracy_rating,
            occurred_at: values.occurred_at?.toISOString(),
            archived_at: new Date().toISOString(),
        });

      if (metadataError) throw metadataError;

      // Update post status to archived (or resolved?)
      // Requirement says "Force Close Case", typically implies archiving or marking as resolved
      // Let's use updatePost logic via useUpdate or direct call
      // We'll update status to 'archived' as per "unarchive" route implication
      
      const { error: updateError } = await supabaseClient
        .from("posts")
        .update({ status: 'archived' }) // Or 'resolved' if that status existed, but PostStatus has 'archived'
        .eq('id', selectedPostId);

      if (updateError) throw updateError;

      message.success("结案成功");
      setIsCloseCaseModalVisible(false);
      // Refresh table
      if (tableProps.pagination && typeof tableProps.pagination !== "boolean") {
        tableProps.pagination.onChange?.(
          tableProps.pagination.current || 1,
          tableProps.pagination.pageSize || 10
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`结案失败: ${errorMessage}`);
    } finally {
      setIsSubmittingCloseCase(false);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 110,
      render: (value: string) => (
        <Space>
          <span style={{ fontSize: 12, color: "#999" }}>
            {value.slice(0, 8)}...
          </span>
          <CopyOutlined
            style={{ cursor: "pointer", color: "#1890ff" }}
            onClick={() => copyToClipboard(value)}
          />
        </Space>
      ),
    },
    {
      title: "标题",
      dataIndex: "title",
      width: 200,
      render: (value: string, record: PostWithAuthor) => (
         <Space direction="vertical" size={0}>
             <Space wrap size={4}>
               {record.sticky_until && new Date(record.sticky_until) > new Date() && (
                   <Tag color="red">置顶</Tag>
               )}
               {record.is_urgent && (
                   <Tag color="volcano">加急</Tag>
               )}
               <span style={{ fontWeight: 500 }}>{value}</span>
             </Space>
             {record.bounty && record.bounty > 0 && (
                 <Tag color="gold" style={{ marginTop: 4 }}>
                     💰 {record.bounty}
                 </Tag>
             )}
         </Space>
      ),
    },
    {
      title: "作者",
      dataIndex: "author",
      width: 100,
      render: (_value: unknown, record: PostWithAuthor) => (
        <Space>
          {record.author?.nickname || "Unknown"}
        </Space>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 100,
      render: (value: PostType) => <Tag>{PostTypeLabels[value] || value}</Tag>,
    },
    {
      title: "门派",
      dataIndex: "method", // Assuming 'method' column in DB
      width: 100,
      render: (value: string) => value || "-",
    },
    {
      title: "关联排盘",
      dataIndex: "divination_record_id",
      width: 120,
      render: (value: string) => {
        if (!value) return "-";
        return (
          <Space>
            <span style={{ fontSize: 12, color: "#999" }}>
              {value.slice(0, 8)}...
            </span>
            <CopyOutlined
              style={{ cursor: "pointer", color: "#1890ff" }}
              onClick={() => copyToClipboard(value)}
            />
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: PostStatus) => {
        let color: BadgeProps["status"] = "default";
        if (value === PostStatus.PUBLISHED) color = "success";
        if (value === PostStatus.PENDING) color = "processing";
        if (value === PostStatus.REJECTED) color = "error";
        if (value === PostStatus.HIDDEN) color = "warning";
        return <Badge status={color} text={PostStatusLabels[value] || value} />;
      },
    },
    {
      title: "数据",
      dataIndex: "view_count",
      width: 150,
      render: (_value: unknown, record: PostWithAuthor) => (
        <Space direction="vertical" size={0} style={{ fontSize: 12, color: '#666' }}>
           <span><EyeOutlined style={{ color: '#1890ff' }} /> {record.view_count || 0}</span>
           <span><LikeOutlined style={{ color: '#ff4d4f' }} /> {record.like_count || 0}</span>
           <span><MessageOutlined style={{ color: '#52c41a' }} /> {record.comment_count || 0}</span>
           <span><ShareAltOutlined style={{ color: '#faad14' }} /> {record.share_count || 0}</span>
        </Space>
      ),
    },
    {
        title: "创建时间",
        dataIndex: "created_at",
        width: 150,
        render: (value: string | Date) => <DateField value={value} format="YYYY-MM-DD HH:mm" />,
    },
    {
        title: "更新时间",
        dataIndex: "updated_at",
        width: 150,
        render: (value: string | Date) => <DateField value={value} format="YYYY-MM-DD HH:mm" />,
    },
    {
      title: "操作",
      dataIndex: "actions",
      fixed: "right" as const,
      width: 200,
      render: (_value: unknown, record: PostWithAuthor) => (
        <Space size="small" wrap>
          <Tooltip title="编辑">
            <span>
              <EditButton hideText size="small" recordItemId={record.id} />
            </span>
          </Tooltip>
          <DeleteButton hideText size="small" recordItemId={record.id} />
          <Tooltip title="预览">
            <Button
                icon={<GlobalOutlined />}
                size="small"
                onClick={() => handlePreview(record.id)}
            />
          </Tooltip>
          
          {record.status !== PostStatus.ARCHIVED && (
             <Tooltip title="归档">
                <Button
                    icon={<StopOutlined />}
                    danger
                    size="small"
                    onClick={() => handleArchive(record.id)}
                />
             </Tooltip>
          )}

          <Tooltip title="授分">
             <Button
                icon={<GiftOutlined />}
                size="small"
                onClick={() => handleGrantPoints(record)}
             />
          </Tooltip>

          {record.type === PostType.HELP && record.status !== PostStatus.ARCHIVED && (
            <Tooltip title="强制结案">
                <Button
                    icon={<CheckCircleOutlined />}
                    type="primary"
                    ghost
                    size="small"
                    onClick={() => handleCloseCaseClick(record.id)}
                />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <List>
      <GenericSearchForm
        searchFormProps={{
          ...searchFormProps,
          onValuesChange: () => {
              // Auto submit logic if needed, similar to TagList
          },
        }}
        fields={[
          {
            name: "title",
            label: "标题关键词",
            type: "input",
            style: { width: 200 },
            props: { prefix: <SearchOutlined /> },
          },
          {
            name: "feature",
            label: "特征",
            type: "select",
            style: { width: 120 },
            options: [
              { label: "全部", value: "all" },
              { label: "置顶", value: "sticky" },
              { label: "加急", value: "urgent" },
              { label: "悬赏", value: "bounty" },
            ],
          },
          {
            name: "type",
            label: "类型",
            type: "select",
            style: { width: 120 },
            options: Object.values(PostType).map((v) => ({
              label: PostTypeLabels[v],
              value: v,
            })),
          },
          {
            name: "id",
            label: "帖子ID",
            type: "input",
            style: { width: 150 },
          },
          {
            name: "divination_record_id",
            label: "排盘ID",
            type: "input",
            style: { width: 150 },
          },
          {
            name: "created_at",
            label: "创建时间",
            type: "dateRange",
            style: { width: 240 },
          },
        ]}
        onReset={() => {
            setFilters([], "replace");
            setActiveTab("all");
        }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { label: "全部", key: "all" },
          { label: "已发布", key: PostStatus.PUBLISHED },
          { label: "待审核", key: PostStatus.PENDING },
          { label: "草稿", key: PostStatus.DRAFT },
          { label: "已隐藏", key: PostStatus.HIDDEN },
          { label: "已拒绝", key: PostStatus.REJECTED },
          { label: "已归档", key: PostStatus.ARCHIVED },
        ]}
        style={{ marginBottom: 16 }}
        tabBarExtraContent={
          <Space>
             <ExportButton resource="posts" />
          </Space>
        }
      />

      {selectedRowKeys.length > 0 && (
        <Card bordered={false} style={{ marginBottom: 16 }} bodyStyle={{ padding: "12px 24px" }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Popconfirm
              title="确定要批量通过吗？"
              onConfirm={handleBatchApprove}
            >
              <Button type="primary" loading={isBatchUpdating}>
                批量审核通过
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确定要批量归档吗？"
              onConfirm={handleBatchArchive}
            >
              <Button danger loading={isBatchUpdating}>
                批量归档
              </Button>
            </Popconfirm>
             <Popconfirm
              title="确定要批量删除吗？此操作不可恢复！"
              onConfirm={handleBatchDelete}
            >
              <Button danger type="dashed" loading={isBatchDeleting}>
                批量删除
              </Button>
            </Popconfirm>
            <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
          </Space>
        </Card>
      )}

      <Table
        {...tableProps}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1200 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <Modal
        title="强制结案"
        open={isCloseCaseModalVisible}
        onOk={handleCloseCaseSubmit}
        onCancel={() => setIsCloseCaseModalVisible(false)}
        confirmLoading={isSubmittingCloseCase}
        forceRender
      >
        <Form form={closeCaseForm} layout="vertical">
          <Form.Item
            name="feedback_content"
            label="反馈内容"
            rules={[{ required: true, message: "请输入反馈内容" }]}
          >
            <Input.TextArea rows={4} placeholder="用户实际反馈..." />
          </Form.Item>
          <Form.Item
            name="accuracy_rating"
            label="准确度"
            rules={[{ required: true, message: "请选择准确度" }]}
          >
            <Select
              options={[
                { label: "准确", value: "accurate" },
                { label: "基本准确", value: "mostly_accurate" },
                { label: "不准", value: "inaccurate" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="occurred_at"
            label="应验时间"
            rules={[{ required: true, message: "请选择时间" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="授分 (Grant Points)"
        open={isGrantPointsModalVisible}
        onOk={handleGrantPointsSubmit}
        onCancel={() => setIsGrantPointsModalVisible(false)}
        confirmLoading={isSubmittingGrantPoints}
        width={600}
        forceRender
      >
        <Form form={grantPointsForm} layout="vertical">
            <Space style={{ display: 'flex', marginBottom: 8 }} align="start">
                <Form.Item name="post_id" label="帖子ID" style={{ width: 120 }}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="post_title" label="帖子标题" style={{ width: 300 }}>
                    <Input disabled />
                </Form.Item>
            </Space>
            <Space style={{ display: 'flex', marginBottom: 8 }} align="start">
                <Form.Item name="author_id" label="作者ID" style={{ width: 120 }}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="author_nickname" label="作者昵称" style={{ width: 150 }}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="current_reputation" label="当前声望" style={{ width: 100 }}>
                    <Input disabled />
                </Form.Item>
            </Space>
            
            <Form.Item 
                name="amount" 
                label="授分数量 (正数增加，负数扣除)" 
                rules={[{ required: true, message: "请输入数量" }]}
            >
                <InputNumber style={{ width: '100%' }} precision={0} />
            </Form.Item>
            
            <Form.Item 
                name="reason" 
                label="授分原因" 
                rules={[{ required: true, message: "请输入原因" }]}
            >
                <Input.TextArea rows={2} placeholder="例如：优质案例分享奖励" />
            </Form.Item>
            
            <Space style={{ display: 'flex' }} align="start">
                <Form.Item name="related_type" label="关联类型" style={{ width: 120 }}>
                    <Select options={[{ label: '帖子', value: 'post' }, { label: '评论', value: 'comment' }]} disabled />
                </Form.Item>
                <Form.Item name="related_id" label="关联ID" style={{ width: 300 }}>
                    <Input disabled />
                </Form.Item>
            </Space>
        </Form>
      </Modal>
    </List>
  );
};
