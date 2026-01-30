import {
    DeleteButton,
    EditButton,
    List,
    useModalForm,
    useTable,
} from "@refinedev/antd";
import {
    Form,
    type FormProps,
    Input,
    InputNumber,
    Modal,
    Space,
    Switch,
    Table,
    Tag,
} from "antd";
import type { IRechargeOption } from "../../interfaces";

export const RechargeOptionList = () => {
  const { tableProps } = useTable<IRechargeOption>({
    resource: "recharge_options",
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "sort_order",
          order: "asc",
        },
      ],
    },
  });

  // Create Modal
  const {
    modalProps: createModalProps,
    formProps: createFormProps,
    show: showCreateModal,
  } = useModalForm<IRechargeOption>({
    action: "create",
    resource: "recharge_options",
    defaultVisible: false,
    syncWithLocation: true,
  });

  // Edit Modal
  const {
    modalProps: editModalProps,
    formProps: editFormProps,
    show: showEditModal,
  } = useModalForm<IRechargeOption>({
    action: "edit",
    resource: "recharge_options",
    defaultVisible: false,
    syncWithLocation: true,
  });

  return (
    <>
      <List
        createButtonProps={{
          onClick: () => {
            showCreateModal();
          },
        }}
      >
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="label" title="显示标签" />
          <Table.Column
            dataIndex="amount_cny"
            title="金额 (CNY)"
            render={(value) => `¥${value}`}
          />
          <Table.Column dataIndex="coins_amount" title="易币数量" />
          <Table.Column dataIndex="sort_order" title="排序" />
          <Table.Column
            dataIndex="is_recommend"
            title="推荐"
            render={(value) => (
              <Tag color={value ? "gold" : "default"}>
                {value ? "推荐" : "普通"}
              </Tag>
            )}
          />
          <Table.Column
            dataIndex="is_active"
            title="状态"
            render={(value) => (
              <Tag color={value ? "green" : "red"}>
                {value ? "启用" : "禁用"}
              </Tag>
            )}
          />
          <Table.Column
            title="操作"
            dataIndex="actions"
            render={(_, record: IRechargeOption) => (
              <Space>
                <EditButton
                  hideText
                  size="small"
                  recordItemId={record.id}
                  onClick={() => showEditModal(record.id)}
                />
                <DeleteButton
                  hideText
                  size="small"
                  recordItemId={record.id}
                />
              </Space>
            )}
          />
        </Table>
      </List>

      <Modal {...createModalProps} title="新增选项" width={500} forceRender>
        <RechargeOptionForm
          formProps={{
            ...createFormProps,
            initialValues: {
              is_active: true,
              ...createFormProps.initialValues,
            },
          }}
        />
      </Modal>

      <Modal {...editModalProps} title="编辑选项" width={500} forceRender>
        <RechargeOptionForm formProps={editFormProps} />
      </Modal>
    </>
  );
};

const RechargeOptionForm = ({ formProps }: { formProps: FormProps }) => {
  return (
    <Form {...formProps} layout="vertical">
      <Form.Item
        label="显示标签"
        name="label"
        rules={[{ required: true, message: "请输入显示标签" }]}
      >
        <Input placeholder="例如：60易币" />
      </Form.Item>
      <Form.Item
        label="金额 (CNY)"
        name="amount_cny"
        rules={[{ required: true, message: "请输入金额" }]}
      >
        <InputNumber
          style={{ width: "100%" }}
          prefix="¥"
          placeholder="0.00"
          precision={2}
        />
      </Form.Item>
      <Form.Item
        label="易币数量"
        name="coins_amount"
        rules={[{ required: true, message: "请输入易币数量" }]}
      >
        <InputNumber style={{ width: "100%" }} placeholder="0" precision={0} />
      </Form.Item>
      <Form.Item label="排序权重" name="sort_order" tooltip="数字越小越靠前">
        <InputNumber style={{ width: "100%" }} placeholder="0" precision={0} />
      </Form.Item>
      <div style={{ display: "flex", gap: "24px" }}>
        <Form.Item label="推荐" name="is_recommend" valuePropName="checked">
            <Switch
              checkedChildren="推荐"
              unCheckedChildren="普通"
            />
        </Form.Item>
        <Form.Item label="状态" name="is_active" valuePropName="checked">
            <Switch
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
        </Form.Item>
      </div>
    </Form>
  );
};
