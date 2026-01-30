import { Edit, useForm, useSelect } from "@refinedev/antd";
import {
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select
} from "antd";
import React from "react";
import { RichTextEditor } from "../../components/RichTextEditor";
import {
  PostStatus,
  PostStatusLabels,
  PostType,
  PostTypeLabels,
} from "../../interfaces";

export const PostEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();

  const postData = queryResult?.data?.data;

  const { selectProps: userSelectProps } = useSelect({
    resource: "profiles",
    optionLabel: "nickname",
    optionValue: "id",
    defaultValue: postData?.user_id,
    pagination: {
        mode: "server",
    },
    onSearch: (value) => [
        {
            field: "nickname",
            operator: "contains",
            value,
        },
    ],
  });

  const { selectProps: tagSelectProps } = useSelect({
    resource: "tags",
    optionLabel: "name",
    optionValue: "name",
    pagination: {
        mode: "server",
    },
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} form={formProps.form} layout="vertical">
        <Row gutter={24}>
          {/* Left Column: Main Content */}
          <Col span={16}>
            <Card title="内容编辑" variant="borderless">
              <Form.Item
                label="标题"
                name="title"
                rules={[{ required: true, message: "请输入标题" }]}
              >
                <Input size="large" placeholder="请输入文章标题" />
              </Form.Item>

              <Form.Item
                label="内容"
                name="content"
                rules={[{ required: true, message: "请输入内容" }]}
                trigger="onChange"
                valuePropName="value"
              >
                <RichTextEditor placeholder="请输入正文内容..." />
              </Form.Item>

              {/* <Form.Item label="HTML 内容 (生成的)" name="content_html">
                <Input.TextArea rows={4} disabled placeholder="HTML 内容" />
              </Form.Item> */}
            </Card>
          </Col>

          {/* Right Column: Metadata */}
          <Col span={8}>
            <Card title="元数据" variant="borderless">
              <Form.Item
                label="作者"
                name="user_id"
                rules={[{ required: true, message: "请选择作者" }]}
              >
                <Select
                  {...userSelectProps}
                  showSearch
                  placeholder="搜索作者"
                  filterOption={false}
                />
              </Form.Item>

              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: "请选择状态" }]}
              >
                <Select
                  options={Object.values(PostStatus).map((s) => ({
                    label: PostStatusLabels[s],
                    value: s,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="类型"
                name="type"
                rules={[{ required: true, message: "请选择类型" }]}
              >
                <Select
                  options={Object.values(PostType).map((t) => ({
                    label: PostTypeLabels[t],
                    value: t,
                  }))}
                />
              </Form.Item>

              <Form.Item label="门派 (School/Method)" name="method">
                 {/* Hardcoded options or fetch from somewhere. 
                     Using standard list based on memory/knowledge */}
                <Select
                  allowClear
                  options={[
                    { label: "六爻", value: "liuyao" },
                    { label: "八字", value: "bazi" },
                    { label: "奇门", value: "qimen" },
                    { label: "梅花", value: "meihua" },
                    { label: "紫微", value: "ziwei" },
                    { label: "通用", value: "general" },
                  ]}
                />
              </Form.Item>

              <Form.Item label="悬赏 (易币)" name="bounty">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>

              <Form.Item label="标签" name="tags">
                <Select
                  {...tagSelectProps}
                  mode="tags"
                  placeholder="选择或输入标签"
                  tokenSeparators={[","]}
                />
              </Form.Item>

              <Form.Item 
                label="关联排盘 ID" 
                name="divination_record_id"
                getValueFromEvent={(e) => e.target.value === "" ? null : e.target.value}
              >
                <Input placeholder="排盘 ID" allowClear />
              </Form.Item>

              <Form.Item label="封面图片 URL" name="cover_image_url">
                <Input placeholder="封面图片 URL" />
              </Form.Item>

              <Form.Item shouldUpdate={(prev, current) => prev.cover_image_url !== current.cover_image_url}>
                {({ getFieldValue }) => {
                  const coverUrl = getFieldValue("cover_image_url");
                  return coverUrl ? (
                    <div style={{ marginTop: 8 }}>
                      <Image 
                        src={coverUrl} 
                        alt="封面预览" 
                        style={{ maxWidth: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} 
                      />
                    </div>
                  ) : null;
                }}
              </Form.Item>
              
               <Form.Item label="隐藏/拒绝原因" name="hide_reason">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </Edit>
  );
};
