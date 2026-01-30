import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import { type IComment } from "../../interfaces";

export const CommentEdit = () => {
  const { formProps, saveButtonProps } = useForm<IComment>();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} form={formProps.form} layout="vertical">
        <Form.Item
          label="评论内容"
          name="content"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={6} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
