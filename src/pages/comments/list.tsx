import { CopyOutlined, EyeOutlined } from "@ant-design/icons";
import {
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord, type CrudFilter, type HttpError } from "@refinedev/core";
import { List as AntList, Button, Card, Descriptions, Grid, Modal, Space, Table, Typography, message } from "antd";
import DOMPurify from "dompurify";
import { useState } from "react";
import { GenericSearchForm, type SearchField } from "../../components/search/GenericSearchForm";
import { type IComment } from "../../interfaces";

export const CommentList = () => {
  const [previewRecord, setPreviewRecord] = useState<IComment | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { tableProps, searchFormProps, setFilters } = useTable<IComment, HttpError, {
    content?: string;
    author?: string;
    post_title?: string;
    post_id?: string;
  }>({
    syncWithLocation: true,
    meta: {
      select: "*, post:posts(title), author:profiles(*)",
    },
    onSearch: (values) => {
      const filters: CrudFilter[] = [];

      if (values.content) {
        filters.push({
          field: "content",
          operator: "contains",
          value: values.content,
        });
      }

      if (values.author) {
        filters.push({
          field: "author.nickname",
          operator: "contains",
          value: values.author,
        });
      }

      if (values.post_title) {
        filters.push({
          field: "post.title",
          operator: "contains",
          value: values.post_title,
        });
      }

      if (values.post_id) {
        filters.push({
          field: "post_id",
          operator: "eq",
          value: values.post_id,
        });
      }

      return filters;
    },
  });

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const listPagination = typeof tableProps.pagination === 'object' ? {
    current: tableProps.pagination.current,
    pageSize: tableProps.pagination.pageSize,
    total: tableProps.pagination.total,
    onChange: tableProps.pagination.onChange,
    simple: true,
    size: "small" as const,
  } : false;

  const searchFields: SearchField[] = [
    { name: "content", label: "搜索评论内容", style: { width: 200 } },
    { name: "author", label: "搜索作者昵称", style: { width: 150 } },
    { name: "post_title", label: "搜索帖子标题", style: { width: 200 } },
    { name: "post_id", label: "搜索帖子ID", style: { width: 200 } },
    { name: "post_id", label: "搜索评论ID", style: { width: 200 } },
  ];

  return (
    <List>
      <GenericSearchForm
        searchFormProps={searchFormProps}
        fields={searchFields}
        onReset={() => setFilters([], "replace")}
      />
      {isMobile ? (
        <AntList
          loading={tableProps.loading}
          dataSource={tableProps.dataSource ? [...tableProps.dataSource] : []}
          pagination={listPagination}
          renderItem={(item) => (
            <AntList.Item>
              <Card
                variant="outlined"
                title={item.author?.nickname || item.author?.email || item.user_id}
                extra={<EditButton hideText size="small" recordItemId={item.id} />}
                style={{ width: "100%" }}
              >
                <div>
                  <strong>内容:</strong>
                  <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                    {item.content}
                  </Typography.Paragraph>
                </div>
                <p>
                  <strong>关联帖子:</strong> {item.post?.title || item.post_id}
                </p>
                <p>
                  <strong>点赞数:</strong> {item.like_count}
                </p>
              </Card>
            </AntList.Item>
          )}
        />
      ) : (
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="id"
          title="评论ID"
          width={100}
          render={(value) => (
            <Space size={2}>
              <div
                style={{
                  width: 40,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={value}
              >
                {value}
              </div>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(value);
                  message.success("评论ID已复制");
                }}
              />
            </Space>
          )}
        />
        <Table.Column
          dataIndex="post_id"
          title="帖子ID"
          width={100}
          render={(value) => (
            <Space size={2}>
              <div
                style={{
                  width: 40,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={value}
              >
                {value}
              </div>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(value);
                  message.success("帖子ID已复制");
                }}
              />
            </Space>
          )}
        />
        <Table.Column
          dataIndex="content"
          title="内容"
          render={(value) => (
            <div
              style={{
                maxWidth: 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={value}
            >
              {value}
            </div>
          )}
        />
        <Table.Column
          dataIndex={["post", "title"]}
          title="关联帖子"
          render={(value, record: IComment) =>
            value || record.post_id
          }
        />
        <Table.Column
          dataIndex={["author", "nickname"]}
          title="作者"
          render={(value, record: IComment) =>
            value || record.author?.email || record.user_id
          }
        />
        <Table.Column dataIndex="like_count" title="点赞数" sorter />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setPreviewRecord(record as unknown as IComment);
                  setIsModalVisible(true);
                }}
                title="预览"
              />
              <EditButton hideText size="small" recordItemId={record.id} title="编辑" />
            </Space>
          )}
        />
      </Table>
      )}
      <Modal
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        title="评论预览"
        width={600}
      >
        {previewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="内容">
              <div
                style={{ maxHeight: "300px", overflowY: "auto" }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewRecord.content) }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="作者">
              {previewRecord.author?.nickname || previewRecord.author?.email || previewRecord.user_id}
            </Descriptions.Item>
            <Descriptions.Item label="关联帖子">
              {previewRecord.post?.title || previewRecord.post_id}
            </Descriptions.Item>
            <Descriptions.Item label="发表时间">
              {previewRecord.created_at ? new Date(previewRecord.created_at).toLocaleString() : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </List>
  );
};
