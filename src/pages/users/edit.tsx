import { Edit, useForm, useSelect } from "@refinedev/antd";
import { usePermissions } from "@refinedev/core";
import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { isSuperAdmin as checkIsSuperAdmin } from "../../utility/helpers";
import { supabaseClient } from "../../utility/supabaseClient";

const { Text } = Typography;
const { TextArea } = Input;

export const UserEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "profiles",
    action: "edit",
    redirect: "list",
  });

  const { selectProps: roleSelectProps } = useSelect({
    resource: "cms_roles",
    optionLabel: "name",
    optionValue: "id",
  });

  const profile = queryResult?.data?.data;
  const { data: permissions } = usePermissions<string[]>();
  const isSuperAdmin = checkIsSuperAdmin(permissions);

  // Ban State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banDays, setBanDays] = useState(1);
  const [banReason, setBanReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleBanUser = async () => {
    if (!profile) return;
    if (!banReason.trim()) {
      message.error("请输入封禁原因");
      return;
    }

    setProcessing(true);
    try {
      const bannedUntil = dayjs().add(banDays, "day").toISOString();
      const { error } = await supabaseClient
        .from("profiles")
        .update({
          is_banned: true,
          banned_until: bannedUntil,
          ban_reason: banReason,
        })
        .eq("id", profile.id);

      if (error) throw error;

      message.success(`用户已封禁 ${banDays} 天`);
      setIsBanModalOpen(false);
      // Refresh data
      queryResult?.refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error("操作失败: " + errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!profile) return;
    setProcessing(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({
          is_banned: false,
          banned_until: null,
          ban_reason: null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      message.success("用户已解封");
      queryResult?.refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error("操作失败: " + errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = (values: Record<string, unknown>) => {
    // 自动同步基础身份角色
    // 如果不是超级管理员，根据是否分配了 CMS 角色来决定是 user 还是 admin
    if (profile?.role !== "super_admin") {
      if (values.cms_role_id) {
        values.role = "admin";
      } else {
        values.role = "user";
      }
    }
    return formProps.onFinish?.(values);
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="基本信息">
          <Form {...formProps} onFinish={handleFinish} layout="vertical">
            <Form.Item label="昵称" name="nickname">
              <Input disabled />
            </Form.Item>
            <Form.Item label="角色" name="cms_role_id">
              <Select {...roleSelectProps} disabled={!isSuperAdmin} allowClear />
            </Form.Item>
            {/* If super admin, maybe allow editing other fields? Requirements just say Role. */}
          </Form>
        </Card>

        <Card title="账号状态管理">
          <Space direction="vertical">
            <div>
              当前状态:{" "}
              <Tag color={profile?.is_banned ? "red" : "green"}>
                {profile?.is_banned ? "已封禁" : "正常"}
              </Tag>
              {profile?.is_banned && (
                <Text type="secondary">
                  (原因: {profile?.ban_reason}, 解封时间:{" "}
                  {dayjs(profile?.banned_until).format("YYYY-MM-DD HH:mm")})
                </Text>
              )}
            </div>

            {profile?.is_banned ? (
              <Button type="primary" onClick={handleUnbanUser} loading={processing}>
                解封用户
              </Button>
            ) : (
              <Button danger onClick={() => setIsBanModalOpen(true)}>
                封禁用户
              </Button>
            )}
          </Space>
        </Card>
      </Space>

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
              {isSuperAdmin
                ? "超级管理员最大可封禁 3650 天"
                : "普通管理员最大可封禁 7 天"}
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
    </Edit>
  );
};
