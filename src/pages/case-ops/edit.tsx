import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const CaseOpsEdit = () => {
  const { formProps, saveButtonProps } = useForm({
    resource: "case_metadata",
    redirect: "list",
    meta: {
      idColumnName: "post_id",
    },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="准确度"
          name="accuracy_rating"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "准", value: "accurate" },
              { label: "部分准", value: "partial" },
              { label: "不准", value: "inaccurate" },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="反馈内容"
          name="feedback_content"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
