import { Show } from "@refinedev/antd";
import { usePermissions, useShow, useUpdate } from "@refinedev/core";
import { Avatar, Button, Card, Col, Descriptions, Input, InputNumber, message, Modal, Row, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { isSuperAdmin as checkIsSuperAdmin } from "../../utility/helpers";
import { supabaseClient } from "../../utility/supabaseClient";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Helper to display target details
type PostTarget = {
  title?: string;
  content?: string;
  created_at?: string;
  status?: string;
  author?: {
    nickname?: string;
    avatar_url?: string;
  };
};

type CommentTarget = {
  content?: string;
  created_at?: string;
  status?: string;
  post?: {
    title?: string;
  };
  author?: {
    nickname?: string;
    avatar_url?: string;
  };
};

type UserTarget = {
  avatar_url?: string;
  nickname?: string;
  email?: string;
  is_banned?: boolean;
  banned_until?: string;
  ban_reason?: string;
};

type TargetData = PostTarget | CommentTarget | UserTarget;

const TargetDetails = ({ targetId, targetType }: { targetId: string; targetType: string }) => {
  const [target, setTarget] = useState<TargetData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId || !targetType) return;

    const fetchTarget = async () => {
      setLoading(true);
      let table = "";
      let select = "*";

      if (targetType === "post") {
        table = "posts";
        select = "*, author:user_id(nickname, avatar_url)";
      } else if (targetType === "comment") {
        table = "comments";
        select = "*, author:user_id(nickname, avatar_url), post:post_id(title)";
      } else if (targetType === "user") {
        table = "profiles";
      }

      const { data, error } = await supabaseClient
        .from(table)
        .select(select)
        .eq("id", targetId)
        .single();

      const targetData = data as TargetData | null;
      if (!error && targetData) {
        setTarget(targetData);
      }
      setLoading(false);
    };

    fetchTarget();
  }, [targetId, targetType]);

  if (loading) return <div>Loading target details...</div>;
  if (!target) return <div>Target not found (might be deleted)</div>;

  if (targetType === "post") {
    const post = target as PostTarget;
    return (
      <Card title="帖子详情" bordered={false}>
        <Descriptions column={1}>
          <Descriptions.Item label="标题">{post.title}</Descriptions.Item>
          <Descriptions.Item label="作者">
            <Space>
              <Avatar src={post.author?.avatar_url} size="small" />
              {post.author?.nickname}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="发布时间">{dayjs(post.created_at).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
          <Descriptions.Item label="状态">
             <Tag>{post.status || "published"}</Tag>
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || "") }} />
        </div>
      </Card>
    );
  }

  if (targetType === "comment") {
    const comment = target as CommentTarget;
    return (
      <Card title="评论详情" bordered={false}>
        <Descriptions column={1}>
          <Descriptions.Item label="所属帖子">{comment.post?.title || "Unknown Post"}</Descriptions.Item>
          <Descriptions.Item label="作者">
            <Space>
              <Avatar src={comment.author?.avatar_url} size="small" />
              {comment.author?.nickname}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="发布时间">{dayjs(comment.created_at).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
           <Descriptions.Item label="状态">
             <Tag>{comment.status || "published"}</Tag>
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
          <Text>{comment.content}</Text>
        </div>
      </Card>
    );
  }

  if (targetType === "user") {
    const user = target as UserTarget;
    return (
      <Card title="用户详情" bordered={false}>
        <Space direction="vertical" align="center" style={{ width: "100%" }}>
          <Avatar src={user.avatar_url} size={64} />
          <Title level={4}>{user.nickname}</Title>
          <Text type="secondary">{user.email}</Text>
          <Tag color={user.is_banned ? "red" : "green"}>{user.is_banned ? "已封禁" : "正常"}</Tag>
          {user.is_banned && (
            <Text type="danger">
              解封时间: {dayjs(user.banned_until).format("YYYY-MM-DD HH:mm")}
              <br />
              原因: {user.ban_reason}
            </Text>
          )}
        </Space>
      </Card>
    );
  }

  return <div>Unknown target type</div>;
};

export const ReportShow = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const report = data?.data;

  const { data: permissions } = usePermissions<string[]>();
  // Assume permissions returns the role string directly or an object. 
  // Based on authProvider, it returns RoleType string.
  const isSuperAdmin = checkIsSuperAdmin(permissions);

  const { mutate: updateReport } = useUpdate();

  // Ban Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banDays, setBanDays] = useState(1);
  const [banReason, setBanReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleIgnore = () => {
    if (!report) return;
    updateReport({
      resource: "reports",
      id: report.id,
      values: {
        status: "rejected",
        resolved_at: new Date().toISOString(),
        // resolved_by is handled by RLS or trigger usually, but we can try to send it if needed.
        // Usually Supabase `auth.uid()` is used.
      },
      successNotification: {
        message: "已忽略该举报",
        type: "success",
      },
    });
  };

  const handleHideContent = async () => {
    if (!report) return;
    setProcessing(true);
    try {
        // 1. Update target status
        const table = report.target_type === "post" ? "posts" : report.target_type === "comment" ? "comments" : null;
        if (table) {
            const { error: targetError } = await supabaseClient
                .from(table)
                .update({ status: "hidden" })
                .eq("id", report.target_id);
            
            if (targetError) throw targetError;
        }

        // 2. Update report status
        updateReport({
            resource: "reports",
            id: report.id,
            values: {
                status: "resolved",
                resolution: "deleted", // or 'hidden'
                resolved_at: new Date().toISOString(),
            },
        });
        message.success("内容已隐藏");
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error("操作失败: " + errorMessage);
    } finally {
        setProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!report) return;
    if (!banReason.trim()) {
        message.error("请输入封禁原因");
        return;
    }

    setProcessing(true);
    try {
        // 1. Calculate banned_until
        const bannedUntil = dayjs().add(banDays, "day").toISOString();
        
        // 2. Determine user ID to ban. 
        // If target_type is user, target_id is the user.
        // If target_type is post/comment, we need to find the author.
        let userIdToBan = "";
        if (report.target_type === "user") {
            userIdToBan = report.target_id;
        } else {
             // We need to fetch the author ID if it's not in the report.
             // The report table doesn't usually store author_id of the target content directly unless denormalized.
             // We can fetch it from the target details.
             // For simplicity, let's assume we fetch it now.
             const table = report.target_type === "post" ? "posts" : "comments";
             const { data: content } = await supabaseClient.from(table).select("user_id").eq("id", report.target_id).single();
             if (content) userIdToBan = content.user_id;
        }

        if (!userIdToBan) throw new Error("无法找到目标用户");

        // 3. Update profiles
        const { error: profileError } = await supabaseClient
            .from("profiles")
            .update({
                is_banned: true,
                banned_until: bannedUntil,
                ban_reason: banReason
            })
            .eq("id", userIdToBan);

        if (profileError) throw profileError;

        // 4. Update report
        updateReport({
            resource: "reports",
            id: report.id,
            values: {
                status: "resolved",
                resolution: "banned",
                resolved_at: new Date().toISOString(),
            },
        });
        
        setIsBanModalOpen(false);
        message.success(`用户已封禁 ${banDays} 天`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error("操作失败: " + errorMessage);
    } finally {
        setProcessing(false);
    }
  };

  if (isLoading || !report) return <div>Loading...</div>;

  return (
    <Show isLoading={isLoading}>
      <Row gutter={[16, 16]}>
        {/* Left: Content Details */}
        <Col span={14}>
          <TargetDetails targetId={report.target_id} targetType={report.target_type} />
          
          <Card title="举报信息" style={{ marginTop: 16 }}>
            <Descriptions column={1}>
               <Descriptions.Item label="举报原因">{report.reason_category}</Descriptions.Item>
               <Descriptions.Item label="详细描述">{report.description || "无"}</Descriptions.Item>
               <Descriptions.Item label="举报时间">{dayjs(report.created_at).format("YYYY-MM-DD HH:mm:ss")}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right: Actions */}
        <Col span={10}>
          <Card title="处置面板" extra={<Tag color={report.status === "pending" ? "orange" : "green"}>{report.status}</Tag>}>
            <Space direction="vertical" style={{ width: "100%" }}>
                {report.status === "pending" ? (
                    <>
                        <Button block onClick={handleIgnore}>忽略 (标记为已驳回)</Button>
                        
                        {report.target_type !== "user" && (
                            <Button block danger onClick={handleHideContent} loading={processing}>
                                隐藏内容
                            </Button>
                        )}
                        
                        <Button block type="primary" danger onClick={() => setIsBanModalOpen(true)}>
                            封禁用户
                        </Button>
                    </>
                ) : (
                    <div style={{ textAlign: "center", color: "#999" }}>
                        该举报已处理
                        {report.resolved_at && <div>处理时间: {dayjs(report.resolved_at).format("YYYY-MM-DD HH:mm")}</div>}
                    </div>
                )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="封禁用户"
        open={isBanModalOpen}
        onCancel={() => setIsBanModalOpen(false)}
        onOk={handleBanUser}
        confirmLoading={processing}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
            <div>
                <Text>封禁天数:</Text>
                <InputNumber 
                    min={1} 
                    max={isSuperAdmin ? 3650 : 7} 
                    value={banDays} 
                    onChange={(val) => setBanDays(val || 1)}
                    style={{ width: "100%" }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {isSuperAdmin ? "超级管理员最大可封禁 3650 天" : "普通管理员最大可封禁 7 天"}
                </Text>
            </div>
            <div>
                <Text>封禁原因:</Text>
                <TextArea 
                    rows={3} 
                    value={banReason} 
                    onChange={(e) => setBanReason(e.target.value)} 
                    placeholder="请输入封禁原因"
                />
            </div>
        </Space>
      </Modal>
    </Show>
  );
};
