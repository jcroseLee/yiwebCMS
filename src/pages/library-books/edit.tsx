import {
    CheckCircleOutlined,
    FilePdfOutlined,
    LinkOutlined,
    RollbackOutlined,
    SendOutlined,
    StopOutlined,
    UploadOutlined
} from "@ant-design/icons";
import { Edit, useForm } from "@refinedev/antd";
import { useUpdate } from "@refinedev/core";
import type { UploadProps } from "antd";
import {
    Alert,
    AutoComplete,
    Button,
    Card,
    Col,
    Form,
    Image,
    Input,
    message,
    Progress,
    Row,
    Select,
    Space,
    Switch,
    Tabs,
    Typography,
    Upload
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { BookUploader } from "../../components/library/BookUploader";
import {
    type ILibraryBook,
    LibraryBookSourceTypeLabels,
    LibraryBookStatus,
    LibraryBookStatusLabels,
} from "../../interfaces";
import { supabaseClient } from "../../utility/supabaseClient";

const { Text } = Typography;

interface SourcePayload {
    task_id?: string;
    slices?: {
        current_page?: number;
        page_count?: number;
    };
    status?: 'completed' | 'failed' | 'processing';
    [key: string]: unknown;
}

export const LibraryBookEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm<ILibraryBook>();
  const { mutate: updateStatus, isLoading: isUpdatingStatus } = useUpdate();
  
  const record = queryResult?.data?.data;
  
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");

  // OCR State
  const [ocrEngine, setOcrEngine] = useState<'paddle' | 'doubao'>('paddle');
  const [autoOcr, setAutoOcr] = useState(true);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const ocrPollingRef = useRef<{ key: string; attempts: number; startedAt: number; notified: boolean }>({
      key: "",
      attempts: 0,
      startedAt: 0,
      notified: false,
  });
  const ocrPollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
      const fetchCategories = async () => {
          const { data } = await supabaseClient
              .from('library_books')
              .select('category');
          
          if (data) {
               const uniqueCategories = Array.from(new Set(data.map((item) => item.category).filter(Boolean)));
               setCategories(uniqueCategories as string[]);
           }
      };
      fetchCategories();
  }, []);

  useEffect(() => {
    if (record?.cover_url) {
        setCoverUrl(record.cover_url);
    }
    // Initialize OCR state from record
    if (record?.source_payload?.task_id) {
        setTaskId(record.source_payload.task_id as string);
    }
  }, [record]);

  // Polling Effect
  useEffect(() => {
    if (!record?.id) return;
    if (!taskId) return;

    const pollKey = `${record.id}:${taskId}`;
    if (ocrPollingRef.current.key !== pollKey) {
        ocrPollingRef.current = {
            key: pollKey,
            attempts: 0,
            startedAt: Date.now(),
            notified: false,
        };
    }

    const pollIntervalMs = 3000;
    const maxPollDurationMs = 10 * 60 * 1000;
    const maxPollAttempts = Math.ceil(maxPollDurationMs / pollIntervalMs);

    const stopPolling = () => {
        if (!ocrPollingTimerRef.current) return;
        clearInterval(ocrPollingTimerRef.current);
        ocrPollingTimerRef.current = null;
    };

    const checkBookProgress = async () => {
        const meta = ocrPollingRef.current;
        if (meta.key !== pollKey) return;

        meta.attempts += 1;
        const elapsedMs = Date.now() - meta.startedAt;
        if (meta.attempts > maxPollAttempts || elapsedMs > maxPollDurationMs) {
            stopPolling();
            setOcrStatus("轮询超时");
            if (!meta.notified) {
                meta.notified = true;
                message.warning("OCR 处理时间较长，已停止自动轮询，可稍后刷新页面重试");
            }
            return;
        }

        try {
            const { data, error } = await supabaseClient
              .from('library_books')
              .select('source_payload, status')
              .eq('id', record.id)
              .single();
  
            if (error || !data) return;

            // 如果 source_payload 为空或状态为 published，直接设为 100%
            if (!data.source_payload || data.status === 'published') {
                setOcrProgress(100);
                setOcrStatus('处理完成');
                stopPolling();
                return;
            }
  
            const payload = data.source_payload as SourcePayload;

            if (payload.status === "failed") {
                setOcrStatus("处理失败");
                stopPolling();
                return;
            }
            if (payload.status === "completed") {
                setOcrProgress(100);
                setOcrStatus("处理完成");
                stopPolling();
                return;
            }
            
            if (payload?.slices) {
               const current = payload.slices.current_page || 0;
               const total = payload.slices.page_count || 1;
               const percent = total > 0 ? Math.round((current / total) * 100) : 0;
               
               setOcrProgress(percent);
               
               if (percent >= 100) {
                   setOcrStatus('处理完成');
                   stopPolling();
               } else {
                   setOcrStatus('处理中...');
               }
            } else {
                setOcrStatus('处理中...');
            }
        } catch (error) {
            console.error("Check progress failed", error);
        }
    };

    // Initial check
    checkBookProgress();

    stopPolling();
    ocrPollingTimerRef.current = setInterval(checkBookProgress, pollIntervalMs);
    return () => stopPolling();
  }, [taskId, record?.id]);

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

  const handleStatusChange = (newStatus: LibraryBookStatus) => {
    if (!record?.id) return;
    updateStatus({
        resource: "library_books",
        id: record.id,
        values: { status: newStatus },
    }, {
        onSuccess: () => {
             message.success(`状态已更新为: ${LibraryBookStatusLabels[newStatus]}`);
        }
    });
  };

  const renderStatusButtons = () => {
    if (!record) return null;
    const { status } = record;

    if (status === LibraryBookStatus.DRAFT) {
        return (
            <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={() => handleStatusChange(LibraryBookStatus.REVIEWED)}
                loading={isUpdatingStatus}
            >
                提交审核
            </Button>
        );
    }
    if (status === LibraryBookStatus.REVIEWED) {
        return (
            <Space>
                <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    onClick={() => handleStatusChange(LibraryBookStatus.PUBLISHED)}
                    loading={isUpdatingStatus}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                    发布
                </Button>
                <Button 
                    danger
                    icon={<RollbackOutlined />} 
                    onClick={() => handleStatusChange(LibraryBookStatus.DRAFT)}
                    loading={isUpdatingStatus}
                >
                    驳回
                </Button>
            </Space>
        );
    }
    if (status === LibraryBookStatus.PUBLISHED) {
        return (
            <Button 
                danger
                icon={<StopOutlined />} 
                onClick={() => handleStatusChange(LibraryBookStatus.DRAFT)}
                loading={isUpdatingStatus}
            >
                下架
            </Button>
        );
    }
    return null;
  };

  return (
    <Edit 
        title={record?.title ? `编辑古籍: ${record.title}` : "编辑古籍"}
        saveButtonProps={saveButtonProps}
        headerButtons={({ defaultButtons }) => (
            <>
                {defaultButtons}
                {renderStatusButtons()}
            </>
        )}
    >
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
                         <Card title="当前状态" style={{ marginTop: 16 }}>
                            <Form.Item name="status" noStyle>
                                <Select
                                    style={{ width: '100%' }}
                                    options={Object.entries(LibraryBookStatusLabels).map(([value, label]) => ({
                                        label,
                                        value,
                                    }))}
                                />
                            </Form.Item>
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
                                            options={categories.map(c => ({ value: c }))}
                                            filterOption={(inputValue, option) =>
                                                (option?.value ?? '').toUpperCase().includes(inputValue.toUpperCase())
                                            }
                                         />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="来源类型"
                                        name="source_type"
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
                                    <Form.Item label="卷册类型" name="volume_type">
                                        <Select>
                                            <Select.Option value="none">单卷</Select.Option>
                                            <Select.Option value="upper">上册</Select.Option>
                                            <Select.Option value="lower">下册</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="是否精校" name="is_manually_reviewed" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="是否切片" name="slice_enabled" valuePropName="checked">
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
                        </Card>
                    </Col>
                </Row>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab="OCR 处理" key="ocr">
                <Card title="PDF 上传与识别">
                     <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Alert 
                            message="PDF 处理说明" 
                            description="上传 PDF 后将自动进行 OCR 识别。大文件（>100MB）请先压缩。" 
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
                            bookId={record?.id || ""}
                            ocrEngine={ocrEngine}
                            autoOcr={autoOcr}
                            onChange={(url, taskId) => {
                                if (url) {
                                    formProps.form?.setFieldValue("pdf_url", url);
                                }
                                if (taskId) {
                                    setTaskId(taskId);
                                    setOcrProgress(0);
                                    setOcrStatus("OCR 处理中...");
                                    message.success("上传成功，开始 OCR 处理");
                                }
                            }}
                        />

                        {taskId && (
                            <Card type="inner" title="处理进度">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text strong>{ocrStatus || '准备中...'}</Text>
                                        <Text type="secondary">{ocrProgress}%</Text>
                                    </div>
                                    <Progress percent={ocrProgress} status={ocrProgress === 100 ? 'success' : 'active'} />
                                    {ocrProgress === 100 && (
                                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                                            <Button 
                                                type="primary" 
                                                icon={<FilePdfOutlined />} 
                                                onClick={() => {
                                                    // Use window.location or router navigation if available, 
                                                    // but here we are in a component. 
                                                    // Since we are in Refine, we can use Link or just window.open
                                                    window.open(`/library-books/review/${record?.id}`, '_blank');
                                                }}
                                            >
                                                查看识别结果 (进入校对页)
                                            </Button>
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        )}
                     </Space>
                </Card>
            </Tabs.TabPane>
        </Tabs>
      </Form>
    </Edit>
  );
};
