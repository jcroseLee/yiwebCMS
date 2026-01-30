import { FilePdfOutlined, InboxOutlined, ReloadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { Button, message, Progress, Space, Typography, Upload } from "antd";
import React, { useState } from "react";
import { supabaseClient } from "../../utility/supabaseClient";

const { Dragger } = Upload;
const { Text } = Typography;

interface BookUploaderProps {
  value?: string;
  onChange?: (url: string, taskId?: string) => void;
  ocrEngine?: "paddle" | "doubao";
  autoOcr?: boolean;
  bookId?: string;
  onUploadStart?: () => Promise<string | undefined>;
}

export const BookUploader: React.FC<BookUploaderProps> = ({
  value,
  onChange,
  ocrEngine = "paddle",
  autoOcr = true,
  bookId,
  onUploadStart,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    const fileObj = file as File;

    let currentBookId = bookId;

    try {
      if (!currentBookId && onUploadStart) {
        currentBookId = await onUploadStart();
      }

      if (!currentBookId) {
        message.error("请先创建书籍");
        onError?.(new Error("Missing bookId"));
        return;
      }
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", fileObj);
      formData.append("ocr_engine", ocrEngine);
      formData.append("auto_ocr", String(autoOcr));
      formData.append("book_id", currentBookId!);

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("未登录");
      }

      // 模拟进度条 (因为 fetch 不支持上传进度)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      const response = await fetch("/api/library/upload-proxy", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 413) {
            throw new Error("文件过大 (超过限制)");
        }
        if (response.status === 500) {
            throw new Error(errData.message || "服务器内部错误");
        }
        throw new Error(errData.message || "Upload failed");
      }

      const result = await response.json();
      setProgress(100);
      message.success("上传成功");

      // 假设 upload-proxy 返回 { url: string, task_id?: string }
      // 如果没有返回 url，我们可能需要根据 context 决定。
      // 但根据 props 定义，我们需要传递 url。
      // 这里假设 result.url 存在，或者我们使用 result.path 构造 URL
      // 为了安全起见，如果 result.url 不存在，我们传递一个空字符串或 path
      
      const fileUrl = result.url || result.path || "";
      onChange?.(fileUrl, result.task_id);
      
      onSuccess?.("Ok");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      message.error(`上传失败: ${err.message}`);
      onError?.(err);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const isPdf = file.type === "application/pdf";
    if (!isPdf) {
      message.error("只能上传 PDF 文件!");
      return Upload.LIST_IGNORE;
    }
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error("文件大小不能超过 100MB!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  if (value) {
    return (
      <div style={{ border: "1px dashed #d9d9d9", padding: 16, borderRadius: 8, textAlign: "center" }}>
        <Space direction="vertical">
          <FilePdfOutlined style={{ fontSize: 32, color: "#ff4d4f" }} />
          <Text>{value.split("/").pop()}</Text>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => onChange?.("", undefined)}
            type="link"
          >
            重新上传
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div className="book-uploader">
      <Dragger
        customRequest={handleUpload}
        beforeUpload={beforeUpload}
        showUploadList={false}
        disabled={uploading}
        accept="application/pdf"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽 PDF 文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持单个 PDF 上传，最大支持 100MB
        </p>
      </Dragger>
      {uploading && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={progress} status="active" />
          <Text type="secondary" style={{ fontSize: 12 }}>正在上传并处理...</Text>
        </div>
      )}
    </div>
  );
};
