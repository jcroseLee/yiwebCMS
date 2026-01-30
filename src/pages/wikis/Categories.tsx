import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  useModalForm,
} from "@refinedev/antd";
import {
  type BaseRecord,
  type HttpError,
  useDelete,
  useList,
  useUpdate,
} from "@refinedev/core";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Tree,
  type TreeProps,
  TreeSelect,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo } from "react";

interface IWikiCategory extends BaseRecord {
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

export const WikiCategories = () => {
  const { data, isLoading, refetch } = useList<IWikiCategory>({
    resource: "wiki_categories",
    pagination: {
      mode: "off",
    },
    sorters: [
      {
        field: "sort_order",
        order: "asc",
      },
    ],
  });

  const { mutate: updateCategory } = useUpdate();
  const { mutate: deleteCategory } = useDelete();

  // Create Modal
  const {
    modalProps: createModalProps,
    formProps: createFormProps,
    show: showCreateModal,
    close: closeCreateModal,
  } = useModalForm<IWikiCategory, HttpError, IWikiCategory>({
    resource: "wiki_categories",
    action: "create",
    redirect: false,
    warnWhenUnsavedChanges: false,
    onMutationSuccess: () => {
      refetch();
      closeCreateModal();
    },
  });

  // Edit Modal
  const {
    modalProps: editModalProps,
    formProps: editFormProps,
    show: showEditModal,
    close: closeEditModal,
  } = useModalForm<IWikiCategory, HttpError, IWikiCategory>({
    resource: "wiki_categories",
    action: "edit",
    redirect: false,
    warnWhenUnsavedChanges: false,
    onMutationSuccess: () => {
      refetch();
      closeEditModal();
    },
  });

  // Transform data to tree format
  const treeData = useMemo(() => {
    if (!data?.data) return [];

    const buildTree = (parentId: string | null): DataNode[] => {
      return data.data
        .filter((item) => item.parent_id === parentId)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((item) => ({
          key: item.id as string,
          value: item.id as string, // Added value for TreeSelect
          title: item.name,
          children: buildTree(item.id as string),
          data: item, // store original data
        }));
    };

    return buildTree(null);
  }, [data]);

  const onDrop: TreeProps['onDrop'] = (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    // Find dragged node and target node
    let dragObj: IWikiCategory | undefined;
    if (data?.data) {
        dragObj = data.data.find(item => item.id === dragKey);
    }

    if (!dragObj) return;

    // Case 1: Drop inside (become child)
    if (!info.dropToGap) {
        updateCategory({
            resource: "wiki_categories",
            id: dragKey,
            values: {
                parent_id: dropKey,
                sort_order: 999999, // Move to end of new parent
            },
            successNotification: {
                message: "Category moved",
                description: "Category moved successfully",
                type: "success",
            },
        }, {
            onSuccess: () => refetch()
        });
        return;
    }

    // Case 2: Reorder / Change parent (Drop to gap)
    let newParentId: string | null = null;
    
    const targetNode = data?.data.find(item => item.id === dropKey);
    if (targetNode) {
        newParentId = targetNode.parent_id;
    }

    updateCategory({
        resource: "wiki_categories",
        id: dragKey,
        values: {
            parent_id: newParentId,
            sort_order: (targetNode?.sort_order || 0) + (dropPosition === -1 ? -0.5 : 0.5) 
        },
        successNotification: {
            message: "Category moved",
            description: "Category moved successfully",
            type: "success",
        },
    }, {
        onSuccess: () => refetch()
    });
  };

  const renderTitle = (node: DataNode) => {
    return (
      <div className="flex items-center justify-between group w-full pr-4">
        <span>{node.title as React.ReactNode}</span>
        <Space className="opacity-0 group-hover:opacity-100 ml-2 transition-opacity">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              showEditModal(node.key as string);
            }}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              deleteCategory({
                resource: "wiki_categories",
                id: node.key as string,
                mutationMode: "undoable",
              });
            }}
          />
        </Space>
      </div>
    );
  };

  return (
    <Card 
        title="Wiki 分类" 
        extra={
            <Button icon={<PlusOutlined />} type="primary" onClick={() => showCreateModal()}>
                创建分类
            </Button>
        }
    >
      {isLoading ? (
        <Spin />
      ) : (
        <Tree
          className="w-full"
          treeData={treeData}
          draggable
          blockNode
          onDrop={onDrop}
          titleRender={renderTitle}
          defaultExpandAll
        />
      )}

      {/* Create Modal */}
      <Modal {...createModalProps} title="创建分类">
        <Form {...createFormProps} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入分类名称" }]}
          >
            <Input onChange={(e) => {
                // Auto-generate slug from name if slug is empty
                const form = createFormProps.form;
                const currentSlug = form?.getFieldValue("slug");
                if (!currentSlug) {
                    form?.setFieldValue("slug", e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }
            }} />
          </Form.Item>
          <Form.Item
            label="标识符 (Slug)"
            name="slug"
            rules={[{ required: true, message: "请输入分类标识符" }]}
            help="URL 的唯一标识符 (例如 'basics', 'advanced-topics')"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="父级分类"
            name="parent_id"
          >
            <TreeSelect
                treeData={treeData}
                allowClear
                placeholder="选择父级分类（可选）"
                treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item
            label="排序"
            name="sort_order"
            initialValue={0}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal {...editModalProps} title="编辑分类">
        <Form {...editFormProps} layout="vertical">
            <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入分类名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="标识符 (Slug)"
            name="slug"
            rules={[{ required: true, message: "请输入分类标识符" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="父级分类"
            name="parent_id"
          >
            <TreeSelect
                treeData={treeData}
                allowClear
                placeholder="选择父级分类（可选）"
                treeDefaultExpandAll
                // Prevent selecting itself or children as parent to avoid cycles
                // logic needed here ideally
            />
          </Form.Item>
          <Form.Item
            label="排序"
            name="sort_order"
          >
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

// Helper for TreeSelect

