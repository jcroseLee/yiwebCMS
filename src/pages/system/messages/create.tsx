import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Create, useSelect } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import { Button, Card, Divider, Form, Input, message, Modal, Popconfirm, Radio, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { supabaseClient } from "../../../utility/supabaseClient";

type Template = {
  label: string;
  value: string;
};

type MessageFormValues = {
  content: string;
  target_type: "all" | "specific";
  user_ids?: string[];
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    label: "系统维护",
    value: "系统维护通知\n\n尊敬的用户，\n我们将于 [日期] [时间] 至 [时间] 进行系统维护。在此期间，服务可能会暂停。\n\n感谢您的理解。",
  },
  {
    label: "活动通知",
    value: "新活动提醒！\n\n很高兴通知您，一项新活动将于 [日期] 开始。参与活动赢取专属奖励！\n\n详情请查看活动页面。",
  },
  {
    label: "安全警报",
    value: "安全通知\n\n检测到您的账号在新设备上有登录操作。如果这不是您的操作，请立即修改密码。",
  },
];

export const MessageCreate = () => {
  const { list } = useNavigation();
  const [form] = Form.useForm();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [sending, setSending] = useState(false);
  
  // Template state
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateForm] = Form.useForm();

  // Load custom templates from local storage
  useEffect(() => {
    const saved = localStorage.getItem('custom_message_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            setTemplates([...DEFAULT_TEMPLATES, ...parsed]);
        }
      } catch (error) {
        console.error("Failed to parse saved templates", error);
      }
    }
  }, []);

  const handleAddTemplate = (values: { label: string; content: string }) => {
    const newTemplate = { label: values.label, value: values.content };
    
    // Update state
    setTemplates((prev) => [...prev, newTemplate]);
    
    // Update local storage
    const saved = localStorage.getItem('custom_message_templates');
    let currentCustoms: Template[] = [];
    if (saved) {
        try {
            currentCustoms = JSON.parse(saved) as Template[];
        } catch (error) {
            console.error("Failed to parse custom templates", error);
        }
    }
    const newCustoms = [...currentCustoms, newTemplate];
    localStorage.setItem('custom_message_templates', JSON.stringify(newCustoms));

    setIsTemplateModalOpen(false);
    templateForm.resetFields();
    message.success("模板添加成功");
  };

  const handleDeleteTemplate = (index: number, event?: React.MouseEvent) => {
    event?.stopPropagation();
    
    // Calculate the actual index in the custom templates array
    // The index passed is the global index in 'templates' array
    // Custom templates start after DEFAULT_TEMPLATES
    const customIndex = index - DEFAULT_TEMPLATES.length;
    
    if (customIndex < 0) return;

    // Update state
    const newTemplates = templates.filter((_, i) => i !== index);
    setTemplates(newTemplates);

    // Update local storage
    const saved = localStorage.getItem('custom_message_templates');
    if (saved) {
      try {
        const currentCustoms = JSON.parse(saved);
        if (Array.isArray(currentCustoms)) {
            const newCustoms = currentCustoms.filter((_, i) => i !== customIndex);
            localStorage.setItem('custom_message_templates', JSON.stringify(newCustoms));
        }
      } catch (error) {
        console.error("Failed to update local storage", error);
      }
    }
    message.success("模板删除成功");
  };

  const { selectProps: userSelectProps } = useSelect({
    resource: "profiles",
    optionLabel: "nickname",
    optionValue: "id",
    debounce: 500,
  });

  const handleTemplateChange = (value: string) => {
    form.setFieldsValue({ content: value });
  };

  const handlePreview = () => {
    const content = form.getFieldValue("content");
    if (!content) {
      message.warning("请输入内容以进行预览");
      return;
    }
    setPreviewContent(content);
    setPreviewVisible(true);
  };

  const onFinish = async (values: MessageFormValues) => {
    setSending(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error("无有效会话");
      }

      // We use the absolute URL or relative if proxied. 
      // Assuming /api is proxied or we are on the same domain.
      // But we are in `webCMS`, which is likely a separate app (Vite).
      // The API is in `web` (Next.js).
      // We need to know the API Base URL.
      // Usually provided by env or we assume it's same domain if served together.
      // If dev, they might be on different ports.
      // The `customDataProvider` uses `/api/admin/...`.
      // Let's assume `/api/send-system-message` is available via proxy or direct if configured.
      
      const payload = {
        content: values.content,
        target_type: values.target_type,
        user_ids: values.user_ids,
      };

      const response = await fetch("/api/send-system-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "发送消息失败");
      }

      const result = await response.json();
      message.success(result.message || "消息发送成功");
      
      // Redirect to list
      window.history.back();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Send error:", error);
      message.error(errorMessage || "发送消息失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <Create
      saveButtonProps={{ onClick: form.submit, loading: sending }}
      headerProps={{
        onBack: () => list("cms_notifications"),
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ target_type: "all" }}
      >
        <Form.Item label="模板" style={{ marginBottom: 12 }}>
          <Select
            placeholder="选择模板自动填充"
            onChange={handleTemplateChange}
            options={templates.map((t, index) => ({
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t.label}</span>
                  {index >= DEFAULT_TEMPLATES.length && (
                    <Popconfirm
                        title="确定删除此模板吗？"
                        onConfirm={(event) => handleDeleteTemplate(index, event)}
                        onCancel={(event) => event?.stopPropagation()}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            danger
                        />
                    </Popconfirm>
                  )}
                </div>
              ),
              value: t.value,
            }))}
            style={{ width: 300 }}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Button type="text" block icon={<PlusOutlined />} onClick={() => setIsTemplateModalOpen(true)}>
                  添加新模板
                </Button>
              </>
            )}
          />
        </Form.Item>

        <Modal
            title="添加新模板"
            open={isTemplateModalOpen}
            onCancel={() => setIsTemplateModalOpen(false)}
            onOk={templateForm.submit}
        >
            <Form form={templateForm} onFinish={handleAddTemplate} layout="vertical">
                <Form.Item name="label" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                    <Input placeholder="例如：节日祝福" />
                </Form.Item>
                <Form.Item name="content" label="模板内容" rules={[{ required: true, message: '请输入模板内容' }]}>
                    <Input.TextArea rows={4} placeholder="输入模板内容..." />
                </Form.Item>
            </Form>
        </Modal>

        <Form.Item
          label="内容"
          name="content"
          rules={[
            { required: true, message: "请输入消息内容" },
            { max: 1000, message: "内容不能超过 1000 个字符" },
          ]}
        >
          <Input.TextArea
            rows={6}
            placeholder="在此输入您的消息..."
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
            <Button onClick={handlePreview}>预览消息</Button>
        </div>

        <Form.Item
          label="目标受众"
          name="target_type"
          rules={[{ required: true }]}
        >
          <Radio.Group onChange={(e) => setTargetType(e.target.value)}>
            <Radio value="all">所有用户</Radio>
            <Radio value="specific">特定用户</Radio>
          </Radio.Group>
        </Form.Item>

        {targetType === "specific" && (
          <Form.Item
            label="选择用户"
            name="user_ids"
            rules={[{ required: true, message: "请至少选择一个用户" }]}
          >
            <Select
              {...userSelectProps}
              mode="multiple"
              placeholder="搜索并选择用户"
              style={{ width: "100%" }}
            />
          </Form.Item>
        )}
      </Form>

      <Modal
        title="消息预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Card size="small" style={{ background: "#f5f5f5" }}>
          <div style={{ display: "flex", marginBottom: 8 }}>
             <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1890ff", marginRight: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                 系统
             </div>
             <div>
                 <div style={{ fontWeight: "bold" }}>系统通知</div>
                 <div style={{ fontSize: 12, color: "#999" }}>刚刚</div>
             </div>
          </div>
          <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
            {previewContent}
          </Typography.Paragraph>
        </Card>
      </Modal>
    </Create>
  );
};
