import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";
import { MarkdownEditor } from "../../components/MarkdownEditor";

export const WikiCreate = () => {
  const { formProps, saveButtonProps } = useForm();

  const { selectProps: categorySelectProps } = useSelect({
    resource: "wiki_categories",
    optionLabel: "name",
    optionValue: "id",
  });

  const { selectProps: bookSelectProps } = useSelect({
    resource: "library_books",
    optionLabel: "title",
    optionValue: "id",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="标题"
          name="title"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="标识符 (Slug)"
          name="slug"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="分类"
          name="category_id"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>
        <Form.Item
          label="状态"
          name="status"
          initialValue="draft"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select
            options={[
              { label: "草稿", value: "draft" },
              { label: "已发布", value: "published" },
              { label: "已归档", value: "archived" },
            ]}
          />
        </Form.Item>
        <Form.Item label="摘要" name="summary">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="关联书籍" name="related_book_ids">
            <Select {...bookSelectProps} mode="multiple" />
        </Form.Item>
        <Form.Item label="内容" name="content">
          <MarkdownEditor />
        </Form.Item>
      </Form>
    </Create>
  );
};
