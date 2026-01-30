
import { FilePdfOutlined, LinkOutlined, UploadOutlined } from "@ant-design/icons";
import { Create, useForm } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import type { UploadProps } from "antd";
import { Alert, AutoComplete, Button, Card, Col, Form, Image, Input, message, Row, Select, Space, Switch, Tabs, Upload } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { BookUploader } from "../../components/library/BookUploader";
import {
    LibraryBookSourceType,
    LibraryBookSourceTypeLabels,
} from "../../interfaces";
import { supabaseClient } from "../../utility/supabaseClient";

export const LibraryBookCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const { edit } = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const bookIdRef = useRef<string>();

  // Category Options
  const [categoryOptions, setCategoryOptions] = useState<{ value: string }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabaseClient
        .from('library_books')
        .select('category')
        .not('category', 'is', null);
      
      if (data) {
        const unique = Array.from(new Set(data.map(d => d.category))).filter(Boolean);
        setCategoryOptions(unique.map(c => ({ value: c })));
      }
    };
    fetchCategories();
  }, []);

  // OCR State
  const [ocrEngine, setOcrEngine] = useState<'paddle' | 'doubao'>('paddle');
  const [autoOcr, setAutoOcr] = useState(true);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setUploading(true);
      const fileObj = file as File;
      const fileExt = fileObj.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `library-book-covers/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('public')
        .upload(filePath, fileObj);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabaseClient.storage
        .from('public')
        .getPublicUrl(filePath);

      setCoverUrl(data.publicUrl);
      formProps.form?.setFieldValue("cover_url", data.publicUrl);
      onSuccess?.("Ok");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      message.error("Upload failed: " + err.message);
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateBook = async () => {
        // 1. Validate Form
        await formProps.form?.validateFields();
        
        // 2. Create Book First
        const values = (formProps.form?.getFieldsValue() ?? {}) as Record<string, unknown>;
        
        // Clean up values (remove undefined/null)
        const payload = {
            ...values,
            status: typeof values["status"] === "string" && values["status"] ? values["status"] : "draft",
            source_type:
                typeof values["source_type"] === "string" && values["source_type"] ? values["source_type"] : LibraryBookSourceType.MANUAL,
            volume_type: typeof values["volume_type"] === "string" && values["volume_type"] ? values["volume_type"] : "none",
            is_manually_reviewed: values["is_manually_reviewed"] === true,
            slice_enabled: values["slice_enabled"] === true,
        };

        const { data: book, error: createError } = await supabaseClient
            .from('library_books')
            .insert(payload)
            .select()
            .single();

        if (createError) throw createError;
        if (!book) throw new Error("创建书籍失败");
        
        bookIdRef.current = book.id;
        return book.id;
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Tabs defaultActiveKey="basic">
            <Tabs.TabPane tab="基本信息" key="basic">
                <Row gutter={24}>
                    <Col span={8}>
                        <Card title="封面">
                            <Form.Item name="cover_url" hidden>
                                <Input />
                            </Form.Item>
                            {coverUrl && (
                                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                    <Image src={coverUrl} style={{ maxWidth: '100%', maxHeight: 300 }} />
                                </div>
                            )}
                            <Upload
                                customRequest={handleUpload}
                                showUploadList={false}
                                accept="image/*"
                            >
                                <Button icon={<UploadOutlined />} loading={uploading} block>
                                    上传封面
                                </Button>
                            </Upload>
                        </Card>
                    </Col>
                    <Col span={16}>
                        <Card title="基本信息">
                            <Form.Item
                                label="标题"
                                name="title"
                                rules={[{ required: true, message: "请输入标题" }]}
                            >
                                <Input />
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                     <Form.Item label="作者" name="author">
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="朝代" name="dynasty">
                                        <Input />
                                    </Form.Item>
                                </Col>
                            </Row>
                           
                            <Row gutter={16}>
                                 <Col span={12}>
                                    <Form.Item label="分类" name="category">
                                        <AutoComplete
                                            options={categoryOptions}
                                            filterOption={(inputValue, option) =>
                                                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            placeholder="输入或选择分类"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="来源类型"
                                        name="source_type"
                                        initialValue={LibraryBookSourceType.MANUAL}
                                    >
                                        <Select
                                            options={Object.entries(LibraryBookSourceTypeLabels).map(([value, label]) => ({
                                                label,
                                                value,
                                            }))}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="卷册类型" name="volume_type" initialValue="none">
                                        <Select>
                                            <Select.Option value="none">单卷</Select.Option>
                                            <Select.Option value="upper">上册</Select.Option>
                                            <Select.Option value="lower">下册</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="是否精校" name="is_manually_reviewed" valuePropName="checked" initialValue={false}>
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="是否切片" name="slice_enabled" valuePropName="checked" initialValue={false}>
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="原文链接" name="source_url">
                                        <Input prefix={<LinkOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="PDF 链接" name="pdf_url">
                                        <Input prefix={<FilePdfOutlined />} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Form.Item label="简介" name="description">
                                <Input.TextArea rows={6} />
                            </Form.Item>
                            
                            <Form.Item name="status" initialValue="draft" hidden>
                                <Input />
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>
            </Tabs.TabPane>
            <Tabs.TabPane tab="OCR 处理" key="ocr">
                <Card title="PDF 上传与识别 (创建并处理)">
                     <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Alert 
                            message="操作说明" 
                            description="在此处上传 PDF 会自动创建书籍并开始 OCR 识别。请确保已填写基本信息（至少标题）。上传成功后将跳转到编辑页查看进度。" 
                            type="info" 
                            showIcon 
                        />
                        
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item label="OCR 引擎">
                                    <Select 
                                        value={ocrEngine} 
                                        onChange={setOcrEngine}
                                        options={[
                                            { label: 'PaddleOCR (本地/快速)', value: 'paddle' },
                                            { label: 'Doubao (云端/高精度)', value: 'doubao' },
                                        ]} 
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="自动开始识别">
                                    <Switch checked={autoOcr} onChange={setAutoOcr} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <BookUploader
                            ocrEngine={ocrEngine}
                            autoOcr={autoOcr}
                            onUploadStart={handleCreateBook}
                            onChange={() => {
                                message.success("上传成功，正在跳转到编辑页...");
                                setTimeout(() => {
                                    if (bookIdRef.current) {
                                        edit("library_books", bookIdRef.current);
                                    }
                                }, 1000);
                            }}
                        />
                     </Space>
                </Card>
            </Tabs.TabPane>
        </Tabs>
      </Form>
    </Create>
  );
};
