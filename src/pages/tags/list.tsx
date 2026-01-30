import {
  MergeCellsOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  useModalForm,
  useSelect,
  useTable,
} from "@refinedev/antd";
import {
  type BaseRecord,
  type CrudFilters,
  type HttpError,
  useInvalidate,
  useNotification,
  useUpdate
} from "@refinedev/core";
import {
  List as AntList,
  Button,
  Card,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { useState } from "react";
import { GenericSearchForm } from "../../components/search/GenericSearchForm";
import {
  type ITag,
  TagCategory,
  TagCategoryLabels,
  TagScope,
  TagScopeLabels,
} from "../../interfaces";
import { supabaseClient } from "../../utility/supabaseClient";

interface ITagSearchVariables {
  name: string;
  category: TagCategory;
  scope: TagScope | 'common';
}

export const TagList = () => {
  const { tableProps, searchFormProps, setFilters } = useTable<ITag, HttpError, ITagSearchVariables>({
    syncWithLocation: true,
    onSearch: (values) => {
      const filters: CrudFilters = [];
      if (values.name) {
        filters.push({
          field: "name",
          operator: "contains",
          value: values.name,
        });
      }
      if (values.category) {
        filters.push({
          field: "category",
          operator: "eq",
          value: values.category,
        });
      }
      if (values.scope) {
        if (values.scope === 'common') {
           filters.push({
            field: "scope",
            operator: "null",
            value: null,
          });
        } else {
          filters.push({
            field: "scope",
            operator: "eq",
            value: values.scope,
          });
        }
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

  const { mutate: updateTag } = useUpdate();

  // Select props for Merge Modal (allows searching all tags)
  const { selectProps: sourceSelectProps } = useSelect<ITag>({
    resource: "tags",
    optionLabel: "name",
    optionValue: "id",
    debounce: 500,
  });

  const { selectProps: targetSelectProps } = useSelect<ITag>({
    resource: "tags",
    optionLabel: "name",
    optionValue: "id",
    debounce: 500,
  });

  const {
    modalProps: createModalProps,
    formProps: createFormProps,
    show: showCreateModal,
  } = useModalForm<ITag, HttpError, ITag>({
    action: "create",
    syncWithLocation: true,
  });

  const {
    modalProps: editModalProps,
    formProps: editFormProps,
    show: showEditModal,
  } = useModalForm<ITag, HttpError, ITag>({
    action: "edit",
    syncWithLocation: true,
  });

  // Merge Feature State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [sourceTag, setSourceTag] = useState<ITag | null>(null);
  const [targetTagId, setTargetTagId] = useState<string | null>(null);
  const [sourceTagId, setSourceTagId] = useState<string | null>(null); // For manual selection
  const { open } = useNotification();
  const invalidate = useInvalidate();

  // Custom Merge Action Handler
  const handleMergeClick = (tag?: ITag) => {
    if (tag) {
      setSourceTag(tag);
      setSourceTagId(tag.id);
    } else {
      setSourceTag(null);
      setSourceTagId(null);
    }
    setTargetTagId(null);
    setIsMergeModalOpen(true);
  };

  const handleMergeSubmit = async () => {
    const finalSourceId = sourceTag?.id || sourceTagId;
    
    if (!finalSourceId || !targetTagId) {
       open?.({
        type: "error",
        message: "请选择源标签和目标标签",
      });
      return;
    }

    if (finalSourceId === targetTagId) {
      open?.({
        type: "error",
        message: "无法将标签合并到自身",
      });
      return;
    }

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error("用户未登录");

      const { error } = await supabaseClient.rpc("admin_merge_tags", {
        p_source_tag_id: finalSourceId,
        p_target_tag_id: targetTagId,
        p_operator_id: user.id,
      });

      if (error) throw error;

      open?.({
        type: "success",
        message: "标签合并成功",
      });
      setIsMergeModalOpen(false);
      // Refresh table
      invalidate({
        resource: "tags",
        invalidates: ["list"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      open?.({
        type: "error",
        message: "合并失败",
        description: message,
      });
    }
  };

  const handleRecommendedChange = (id: string, checked: boolean, rank?: number) => {
    updateTag({
      resource: "tags",
      id,
      values: {
        is_recommended: checked,
        recommended_rank: checked ? (rank || 0) : 0,
      },
      successNotification: {
        message: "更新成功",
        description: `标签推荐状态已${checked ? "开启" : "关闭"}`,
        type: "success",
      },
    });
  };

  const handleRankChange = (id: string, rank: number) => {
    updateTag({
      resource: "tags",
      id,
      values: {
        recommended_rank: rank,
      },
      successNotification: false, // Suppress notification for rapid changes
    });
  };

  return (
    <>
      <List
        createButtonProps={{
          onClick: () => showCreateModal(),
        }}
        headerButtons={
          <Button icon={<MergeCellsOutlined />} onClick={() => handleMergeClick()}>
            合并标签
          </Button>
        }
      >
        <GenericSearchForm
          searchFormProps={{
            ...searchFormProps,
            style: { marginBottom: 24 },
            onValuesChange: (changedValues: Partial<ITagSearchVariables>, allValues: ITagSearchVariables) => {
              if (
                changedValues.name === "" ||
                ("category" in changedValues && !changedValues.category) ||
                ("scope" in changedValues && !changedValues.scope)
              ) {
                searchFormProps.onFinish?.(allValues);
              }
            },
          }}
          fields={[
            {
              name: "name",
              label: "搜索名称",
              type: "input",
              style: { width: 250 },
              props: {
                prefix: <SearchOutlined />,
              },
            },
            {
              name: "category",
              label: "选择分类",
              type: "select",
              style: { minWidth: 150 },
              options: Object.values(TagCategory).map((v) => ({
                label: TagCategoryLabels[v],
                value: v,
              })),
            },
            {
              name: "scope",
              label: "选择作用域",
              type: "select",
              style: { minWidth: 150 },
              options: [
                { label: "通用 (Common)", value: "common" },
                ...Object.values(TagScope).map((v) => ({
                  label: TagScopeLabels[v],
                  value: v,
                })),
              ],
            },
          ]}
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
                  title={item.name}
                  extra={
                    <Space>
                      <Tag color={item.category === TagCategory.SUBJECT ? 'blue' : item.category === TagCategory.TECHNIQUE ? 'volcano' : 'default'}>
                        {TagCategoryLabels[item.category] || item.category}
                      </Tag>
                      <Tag color={item.scope ? 'geekblue' : 'default'}>
                        {item.scope ? (TagScopeLabels[item.scope] || item.scope) : '通用'}
                      </Tag>
                    </Space>
                  }
                  style={{ width: "100%" }}
                  actions={[
                    <EditButton
                      key="edit"
                      hideText
                      size="small"
                      recordItemId={item.id}
                      onClick={() => showEditModal(item.id)}
                    />,
                    <Button
                      key="merge"
                      size="small"
                      icon={<MergeCellsOutlined />}
                      onClick={() => handleMergeClick(item)}
                    />,
                    <DeleteButton key="delete" hideText size="small" recordItemId={item.id} />,
                  ]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <strong>使用次数:</strong> {item.usage_count}
                    </div>
                    <div>
                      <strong>推荐:</strong>
                      <Space>
                        <Switch 
                          checked={!!item.is_recommended} 
                          onChange={(checked) => handleRecommendedChange(item.id, checked, item.recommended_rank)} 
                          size="small"
                        />
                        {item.is_recommended && (
                          <InputNumber 
                            size="small" 
                            value={item.recommended_rank} 
                            min={0}
                            max={999}
                            onChange={(val) => handleRankChange(item.id, Number(val))}
                            style={{ width: 70 }}
                          />
                        )}
                      </Space>
                    </div>
                    <div>
                      <strong>更新时间:</strong> <DateField value={item.updated_at} format="YYYY-MM-DD" />
                    </div>
                  </Space>
                </Card>
              </AntList.Item>
            )}
          />
        ) : (
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="name" title="名称" />
          <Table.Column
            dataIndex="category"
            title="分类"
            render={(value: TagCategory) => (
              <Tag color={value === TagCategory.SUBJECT ? 'blue' : value === TagCategory.TECHNIQUE ? 'volcano' : 'default'}>
                {TagCategoryLabels[value] || value}
              </Tag>
            )}
          />
          <Table.Column
            dataIndex="scope"
            title="作用域"
            render={(value: TagScope) => (
              <Tag color={value ? 'geekblue' : 'default'}>
                {value ? (TagScopeLabels[value] || value) : '通用'}
              </Tag>
            )}
          />
          <Table.Column dataIndex="usage_count" title="使用次数" sorter />
          <Table.Column
            dataIndex="is_recommended"
            title="推荐状态"
            render={(value, record: ITag) => (
              <Space>
                <Switch 
                  checked={!!value} 
                  onChange={(checked) => handleRecommendedChange(record.id, checked, record.recommended_rank)} 
                />
                {value && (
                  <InputNumber 
                    size="small" 
                    value={record.recommended_rank} 
                    min={0}
                    max={999}
                    onChange={(val) => handleRankChange(record.id, Number(val))}
                    style={{ width: 70 }}
                  />
                )}
              </Space>
            )}
          />
          <Table.Column 
            dataIndex="created_at" 
            title="创建时间" 
            render={(value) => <DateField value={value} format="YYYY-MM-DD HH:mm" />}
            sorter
          />
          <Table.Column 
            dataIndex="updated_at" 
            title="更新时间" 
            render={(value) => <DateField value={value} format="YYYY-MM-DD HH:mm" />}
            sorter
          />
          <Table.Column
            title="操作"
            dataIndex="actions"
            render={(_, record: BaseRecord) => (
              <Space>
                <EditButton
                  hideText
                  size="small"
                  recordItemId={record.id}
                  onClick={() => showEditModal(record.id)}
                  title="编辑"
                />
                <Tooltip title="合并到其他标签">
                  <Button
                    size="small"
                    icon={<MergeCellsOutlined />}
                    onClick={() => handleMergeClick(record as ITag)}
                  />
                </Tooltip>
                <DeleteButton hideText size="small" recordItemId={record.id} title="删除" />
              </Space>
            )}
          />
        </Table>
        )}
      </List>

      {/* Create Modal */}
      <Modal {...createModalProps} title="创建标签">
        <Form {...createFormProps} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true }]}
            initialValue={TagCategory.SUBJECT}
          >
            <Select
              options={Object.values(TagCategory).map((v) => ({
                label: TagCategoryLabels[v],
                value: v,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="作用域"
            name="scope"
            rules={[{ required: true }]}
            initialValue="common"
          >
            <Select
              allowClear
              options={[
                { label: "通用 (Common)", value: "common" },
                ...Object.values(TagScope).map((v) => ({
                  label: TagScopeLabels[v],
                  value: v,
                }))
              ]}
            />
          </Form.Item>
          <Form.Item
            label="是否推荐"
            name="is_recommended"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="排序权重" name="recommended_rank" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal {...editModalProps} title="编辑标签" forceRender>
        <Form {...editFormProps} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.values(TagCategory).map((v) => ({
                label: TagCategoryLabels[v],
                value: v,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="作用域"
            name="scope"
            rules={[{ required: true }]}
          >
            <Select
              allowClear
              options={[
                { label: "通用 (Common)", value: "common" },
                ...Object.values(TagScope).map((v) => ({
                  label: TagScopeLabels[v],
                  value: v,
                }))
              ]}
            />
          </Form.Item>
          <Form.Item
            label="是否推荐"
            name="is_recommended"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item label="排序权重" name="recommended_rank">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Merge Modal */}
      <Modal
        title="合并标签"
        open={isMergeModalOpen}
        onOk={handleMergeSubmit}
        onCancel={() => setIsMergeModalOpen(false)}
        okText="确认合并"
      >
        {sourceTag ? (
           <p>
            将 <strong>{sourceTag.name}</strong> 合并到:
          </p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <p>源标签 (将被删除):</p>
            <Select
              style={{ width: "100%" }}
              placeholder="选择源标签"
              showSearch
              filterOption={false}
              options={sourceSelectProps.options}
              onSearch={sourceSelectProps.onSearch}
              loading={sourceSelectProps.loading}
              onChange={setSourceTagId}
              value={sourceTagId}
            />
          </div>
        )}
       
        <p>{sourceTag ? "" : "目标标签 (保留):"}</p>
        <Select
          style={{ width: "100%" }}
          placeholder="选择目标标签"
          showSearch
          filterOption={false}
          options={targetSelectProps.options?.filter(
            (o) => o.value !== (sourceTag?.id || sourceTagId)
          )}
          onSearch={targetSelectProps.onSearch}
          loading={targetSelectProps.loading}
          onChange={setTargetTagId}
          value={targetTagId}
        />
        <p style={{ marginTop: 10, color: "red", fontSize: "12px" }}>
          警告：这将更新所有引用以使用目标标签，并删除源标签。
        </p>
      </Modal>
    </>
  );
};
