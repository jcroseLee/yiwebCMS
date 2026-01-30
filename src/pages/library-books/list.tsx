
import {
  DeleteOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ImportOutlined,
  LinkOutlined,
  PlusOutlined,
  SendOutlined,
  UndoOutlined
} from "@ant-design/icons";
import {
  CreateButton,
  DateField,
  DeleteButton,
  EditButton,
  List,
  useTable
} from "@refinedev/antd";
import { type CrudFilters, type HttpError, useDeleteMany, useInvalidate, useUpdate, useUpdateMany } from "@refinedev/core";
import { Button, Form, Input, Popconfirm, Progress, Select, Space, Switch, Table, Tag, Tooltip, Typography } from "antd";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  type ILibraryBook,
  LibraryBookSourceType,
  LibraryBookSourceTypeLabels,
  LibraryBookStatus,
  LibraryBookStatusLabels,
} from "../../interfaces";
import { ImportBookModal } from "./ImportBookModal";

export const LibraryBookList: React.FC = () => {
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const invalidate = useInvalidate();
  const { mutate: update } = useUpdate();
  const { mutate: updateMany } = useUpdateMany();
  const { mutate: deleteMany } = useDeleteMany();

  const handleStatusToggle = (id: string, currentStatus: LibraryBookStatus) => {
    const newStatus = currentStatus === LibraryBookStatus.PUBLISHED 
      ? LibraryBookStatus.REVIEWED 
      : LibraryBookStatus.PUBLISHED;
    
    update({
      resource: "library_books",
      id,
      values: {
        status: newStatus,
      },
      successNotification: () => {
        return {
          message: `Successfully ${newStatus === LibraryBookStatus.PUBLISHED ? 'published' : 'withdrawn'} book`,
          description: "Success",
          type: "success",
        };
      },
    });
  };

  const handleBatchPublish = () => {
    updateMany(
      {
        resource: "library_books",
        ids: selectedRowKeys as string[],
        values: {
          status: LibraryBookStatus.PUBLISHED,
        },
        successNotification: () => ({
          message: "批量发布成功",
          description: "Success",
          type: "success",
        }),
      },
      {
        onSuccess: () => {
          setSelectedRowKeys([]);
        },
      }
    );
  };

  const handleBatchDelete = () => {
    deleteMany(
      {
        resource: "library_books",
        ids: selectedRowKeys as string[],
        successNotification: () => ({
          message: "批量删除成功",
          description: "Success",
          type: "success",
        }),
      },
      {
        onSuccess: () => {
          setSelectedRowKeys([]);
        },
      }
    );
  };
  
  const { tableProps, setFilters } = useTable<
    ILibraryBook,
    HttpError
  >({
    resource: "library_books",
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
  });

  const handleSearch = (values: { title: string; status: LibraryBookStatus; category: string; author: string; dynasty: string }) => {
    const filters: CrudFilters = [];
    if (values.title) {
      filters.push({
        field: "title",
        operator: "contains",
        value: values.title,
      });
    }
    if (values.author) {
      filters.push({
        field: "author",
        operator: "contains",
        value: values.author,
      });
    }
    if (values.dynasty) {
      filters.push({
        field: "dynasty",
        operator: "contains",
        value: values.dynasty,
      });
    }
    if (values.status) {
      filters.push({
        field: "status",
        operator: "eq",
        value: values.status,
      });
    }
    if (values.category) {
      filters.push({
        field: "category",
        operator: "eq",
        value: values.category,
      });
    }
    setFilters(filters);
  };

  return (
    <List
      headerButtons={({ defaultButtons }) => (
        <>
          <CreateButton icon={<PlusOutlined />}>新建古籍</CreateButton>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setIsImportModalVisible(true)}
          >
            导入数据
          </Button>
          {defaultButtons}
        </>
      )}
    >
      <Form
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={handleSearch}
      >
        <Form.Item name="title">
          <Input placeholder="搜索标题" />
        </Form.Item>
        <Form.Item name="author">
          <Input placeholder="搜索作者" />
        </Form.Item>
        <Form.Item name="dynasty">
          <Input placeholder="搜索朝代" />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="状态"
            style={{ width: 120 }}
            allowClear
            options={Object.entries(LibraryBookStatusLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
        </Form.Item>
        <Form.Item name="category">
          <Input placeholder="分类" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            搜索
          </Button>
        </Form.Item>
      </Form>

      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>已选择 {selectedRowKeys.length} 项</span>
          <Space>
             <Button icon={<SendOutlined />} onClick={handleBatchPublish} type="primary">批量发布</Button>
             <Popconfirm title="确定要删除选中的项目吗？" onConfirm={handleBatchDelete} okText="确定" cancelText="取消">
                <Button icon={<DeleteOutlined />} danger>批量删除</Button>
             </Popconfirm>
          </Space>
        </div>
      )}

      <Table 
        {...tableProps} 
        rowKey="id" 
        scroll={{ x: 1500 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      >
        <Table.Column
          dataIndex="id"
          title="ID"
          width={100}
          render={(value) => (
             <Typography.Text style={{ width: 260 }} ellipsis={{ tooltip: true }} copyable>
                {value}
             </Typography.Text>
          )}
        />
        <Table.Column 
            dataIndex="title" 
            title="标题" 
            width={200}
            render={(value) => <span style={{ color: '#1890ff' }}>{value}</span>}
            sorter
        />
        <Table.Column
            dataIndex="author"
            title="作者"
            width={120}
            sorter
            render={(value) => value || '-'}
        />
        <Table.Column
            dataIndex="dynasty"
            title="朝代"
            width={80}
            sorter
            render={(value) => value || '-'}
        />
        <Table.Column 
            dataIndex="category" 
            title="分类" 
            width={120}
            render={(value) => value ? <Tag color="blue">{value}</Tag> : '-'}
            sorter
        />
        <Table.Column
          dataIndex="status"
          title="状态"
          width={130}
          sorter
          render={(value: LibraryBookStatus) => {
            let color = "default";
            if (value === LibraryBookStatus.PUBLISHED) color = "success";
            if (value === LibraryBookStatus.REVIEWED) color = "processing";
            return <Tag color={color}>{LibraryBookStatusLabels[value]}</Tag>;
          }}
        />
        <Table.Column
            dataIndex="is_manually_reviewed"
            title="是否人工校对"
            width={120}
            sorter
            render={(value: boolean) => (
                <Tag color={value ? "green" : "default"}>
                    {value ? "精校" : "非精校"}
                </Tag>
            )}
        />
        <Table.Column
            dataIndex="slice_enabled"
            title="切片"
            width={100}
            render={(value: boolean) => <Switch checked={!!value} disabled size="small" />}
        />
        <Table.Column
            dataIndex="volume_type"
            title="卷册"
            width={100}
            render={(value: string) => {
                const map: Record<string, string> = { none: '单卷', upper: '上册', lower: '下册' };
                return map[value] || value || '-';
            }}
        />
        <Table.Column
            dataIndex="source_type"
            title="来源"
            width={120}
            sorter
            render={(value: LibraryBookSourceType) => LibraryBookSourceTypeLabels[value]}
        />
        <Table.Column
            dataIndex="progress"
            title="完成进度"
            width={140}
            sorter
            render={(value: number) => <Progress percent={value} size="small" />}
        />
        <Table.Column
            dataIndex="source_url"
            title="链接"
            width={80}
            render={(value: string) => value ? <a href={value} target="_blank" rel="noopener noreferrer"><LinkOutlined /></a> : '-'}
        />
        <Table.Column
            dataIndex="pdf_url"
            title="PDF"
            width={90}
            render={(value: string) => value ? <a href={value} target="_blank" rel="noopener noreferrer"><FilePdfOutlined /></a> : '-'}
        />
        <Table.Column
          dataIndex="created_at"
          title="创建时间"
          width={180}
          sorter
          render={(value) => <DateField value={value} format="YYYY-MM-DD HH:mm" />}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          width={280}
          fixed="right"
          render={(_, record: ILibraryBook) => (
            <Space>
              <Tooltip title="内容校对">
                <Link to={`/library-books/review/${record.id}`}>
                  <Button size="small" icon={<FileTextOutlined />} />
                </Link>
              </Tooltip>
              
              <Tooltip title={record.status === LibraryBookStatus.PUBLISHED ? "撤回" : "发布"}>
                  <Popconfirm
                    title={`确定要${record.status === LibraryBookStatus.PUBLISHED ? "撤回" : "发布"}吗？`}
                    onConfirm={() => handleStatusToggle(record.id, record.status)}
                    okText="确定"
                    cancelText="取消"
                  >
                     <Button 
                        size="small" 
                        icon={record.status === LibraryBookStatus.PUBLISHED ? <UndoOutlined /> : <SendOutlined />} 
                        type={record.status === LibraryBookStatus.PUBLISHED ? "default" : "primary"}
                        ghost={record.status !== LibraryBookStatus.PUBLISHED}
                     />
                  </Popconfirm>
              </Tooltip>

              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
      <ImportBookModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        onSuccess={() => {
          setIsImportModalVisible(false);
          invalidate({
            resource: "library_books",
            invalidates: ["list"],
          });
        }}
      />
    </List>
  );
};
