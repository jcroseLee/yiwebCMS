import { Button, Form, Input, InputNumber, message, Modal, Tabs } from "antd";
import React, { useState } from "react";
import { supabaseClient } from "../../utility/supabaseClient";

interface ImportBookModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ImportFormValues {
  wikisource_title?: string;
  default_category?: string;
  github_raw_url?: string;
  limit?: number;
  legacy_url?: string;
}

export const ImportBookModal: React.FC<ImportBookModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("wikisource");
  const [form] = Form.useForm();

  const handleImport = async (values: ImportFormValues) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        message.error("未登录");
        return;
      }

      const token = session.access_token;
      
      const payload = { source_type: activeTab, ...values };

      const response = await fetch('/api/admin/library/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '导入失败');
      }

      message.success("导入成功");
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "导入发生错误";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'wikisource',
      label: '维基文库导入',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
          initialValues={{ type: 'wikisource' }}
        >
          <Form.Item
            name="wikisource_title"
            label="维基文库标题"
            rules={[{ required: true, message: '请输入维基文库标题' }]}
          >
            <Input placeholder="例如：周易" />
          </Form.Item>
          <Form.Item
            name="default_category"
            label="默认分类"
          >
             <Input placeholder="例如：经部" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              开始导入
            </Button>
          </div>
        </Form>
      ),
    },
    {
      key: 'github',
      label: 'GitHub 导入',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
          initialValues={{ limit: 50 }}
        >
          <Form.Item
            name="github_raw_url"
            label="GitHub Raw URL"
            rules={[{ required: true, message: '请输入 GitHub Raw URL' }]}
          >
            <Input placeholder="https://raw.githubusercontent.com/..." />
          </Form.Item>
          <Form.Item
            name="limit"
            label="数量限制"
            rules={[{ required: true, type: 'number', min: 1 }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              开始导入
            </Button>
          </div>
        </Form>
      ),
    },
    {
      key: 'legacy',
      label: '旧站 HTML 导入',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
        >
          <Form.Item
            name="legacy_url"
            label="旧站 URL"
            rules={[{ required: true, message: '请输入旧站 URL' }]}
          >
            <Input placeholder="http://..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              开始导入
            </Button>
          </div>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      title="导入古籍数据"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
            setActiveTab(key);
            form.resetFields();
        }}
        items={items}
      />
    </Modal>
  );
};
