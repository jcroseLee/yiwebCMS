import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord, type HttpError, useDelete, useDeleteMany, useUpdate } from "@refinedev/core";
import { Button, Form, Image, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { supabaseClient } from "../../utility/supabaseClient";

interface IResource extends BaseRecord {
  id: string;
  user_id: string;
  nickname?: string;
  avatar_url?: string;
  file_name: string;
  file_type: 'pdf' | 'image';
  file_size: number;
  file_url: string;
  storage_path: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ResourceList = () => {
  const { tableProps, searchFormProps } = useTable<IResource, HttpError, { user_id?: string }>({
    resource: "user_resources",
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
    onSearch: (params) => {
      const filters = [];
      if (params.user_id) {
        filters.push({
          field: "user_id",
          operator: "eq" as const,
          value: params.user_id,
        });
      }
      return filters;
    },
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { mutate: deleteMany, isLoading: isDeleting } = useDeleteMany();
  const { mutate: deleteOne } = useDelete();
  const { mutate: update } = useUpdate();

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [currentRecord, setCurrentRecord] = useState<IResource | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBatchDelete = () => {
    deleteMany(
      {
        resource: "user_resources",
        ids: selectedRowKeys.map(String),
      },
      {
        onSuccess: () => {
          setSelectedRowKeys([]);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteOne({
      resource: "user_resources",
      id,
    });
  };

  const handleOpenModal = (record: IResource, type: 'approve' | 'reject') => {
    setCurrentRecord(record);
    setActionType(type);
    setIsModalVisible(true);
    // Pre-fill default message
    if (type === 'approve') {
      setMessageContent("您的资源已通过审核。");
    } else {
      setMessageContent("很抱歉，您的资源未通过审核，原因是：");
    }
  };

  const handleSubmitAction = async () => {
    if (!currentRecord || !actionType) return;
    
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error("无有效会话");
      }

      // 1. Send System Message
      if (messageContent.trim()) {
        const payload = {
            content: messageContent,
            target_type: "specific",
            user_ids: [currentRecord.user_id],
        };

        const msgResponse = await fetch("/api/send-system-message", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!msgResponse.ok) {
            console.error("Failed to send system message");
            // We continue even if message fails? Or maybe show warning.
            // Requirement implies message is part of the action.
            // Let's warn but proceed with status update.
             message.warning("系统消息发送失败，但将继续更新状态");
        }
      }

      // 2. Update Resource Status
      update({
        resource: "user_resources",
        id: currentRecord.id,
        values: {
            status: actionType === 'approve' ? 'approved' : 'rejected',
            reviewed_at: new Date().toISOString(),
            // reviewed_by is handled by backend or we can send it if column exists
        },
        successNotification: {
            message: `已${actionType === 'approve' ? '通过' : '拒绝'}该资源`,
            type: "success",
        }
      });

      setIsModalVisible(false);
      setMessageContent("");
      setCurrentRecord(null);
      setActionType(null);

    } catch (error) {
        const err = error as Error;
        message.error("操作失败: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <List
      headerButtons={
        selectedRowKeys.length > 0 ? (
          <Popconfirm
            title="确定要删除选中的文件吗？"
            onConfirm={handleBatchDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: isDeleting }}
          >
            <Button danger type="primary" loading={isDeleting}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 24 }}>
        <Form.Item name="user_id">
          <Input placeholder="按用户ID筛选" allowClear />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            筛选
          </Button>
        </Form.Item>
      </Form>

      <Table
        {...tableProps}
        rowKey="id"
        rowSelection={rowSelection}
      >
        <Table.Column
          title="预览"
          key="preview"
          render={(_, record: IResource) => {
            if (record.file_type === 'image') {
              return (
                <Image
                  src={record.file_url}
                  alt={record.file_name}
                  width={80}
                  height={80}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
              );
            }
            return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />;
          }}
        />
        <Table.Column
          dataIndex="file_name"
          title="文件名"
          render={(value, record: IResource) => (
             <Space direction="vertical" size={0}>
               <a href={record.file_url} target="_blank" rel="noopener noreferrer">{value}</a>
               <span style={{ fontSize: 12, color: '#999' }}>{record.storage_path}</span>
             </Space>
          )}
        />
        <Table.Column
          dataIndex="file_type"
          title="类型"
          render={(value) => <Tag>{value}</Tag>}
        />
        <Table.Column
          dataIndex="user_id"
          title="用户"
          render={(value, record: IResource) => (
            <Space direction="vertical" size={0}>
              <span>{record.nickname || 'Unknown'}</span>
              <Typography.Text copyable style={{ fontSize: 12, color: '#999' }}>{value}</Typography.Text>
            </Space>
          )}
        />
        <Table.Column
          dataIndex="file_size"
          title="大小"
          render={(value) => formatSize(value || 0)}
        />
        <Table.Column
          dataIndex="status"
          title="状态"
          render={(value) => {
              let color = 'default';
              if (value === 'approved') color = 'success';
              if (value === 'rejected') color = 'error';
              if (value === 'pending') color = 'processing';
              return <Tag color={color}>{value}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="created_at"
          title="上传时间"
          render={(value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-")}
        />
        <Table.Column
            title="操作"
            key="actions"
            render={(_, record: IResource) => (
                <Space>
                    <Button
                        type="text"
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        onClick={() => handleOpenModal(record, 'approve')}
                    >
                        通过
                    </Button>
                    <Button
                        type="text"
                        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        onClick={() => handleOpenModal(record, 'reject')}
                    >
                        拒绝
                    </Button>
                    <Popconfirm
                        title="确定删除吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            )}
        />
      </Table>

      <Modal
        title={actionType === 'approve' ? "通过审核" : "拒绝审核"}
        open={isModalVisible}
        onOk={handleSubmitAction}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isProcessing}
        okText="确认"
        cancelText="取消"
      >
        <Form layout="vertical">
            <Form.Item label="发送系统消息给用户">
                <Input.TextArea
                    rows={4}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="请输入通知内容"
                />
            </Form.Item>
        </Form>
      </Modal>
    </List>
  );
};
