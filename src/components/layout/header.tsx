import {
  DownOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useThemedLayoutContext } from "@refinedev/antd";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { Avatar, Button, Dropdown, Grid, type MenuProps, Space, theme, Typography } from "antd";
import React from "react";

const { useToken } = theme;
const { Text } = Typography;

interface IUser {
  name: string;
  avatar: string;
}

export const CustomHeader: React.FC = () => {
  const { token } = useToken();
  const { mobileSiderOpen, setMobileSiderOpen } = useThemedLayoutContext();
  const breakpoint = Grid.useBreakpoint();
  const { data: user } = useGetIdentity<IUser>();
  const { mutate: logout } = useLogout();

  const isMobile =
    typeof breakpoint.lg === "undefined" &&
    typeof breakpoint.md === "undefined" &&
    typeof breakpoint.sm === "undefined" &&
    typeof breakpoint.xs === "undefined"
      ? false
      : !breakpoint.lg;

  const menuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: () => logout(),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px",
        backgroundColor: token.colorBgContainer,
        position: "sticky",
        top: 0,
        zIndex: 999,
        padding: isMobile ? "0 12px" : "0 24px",
      }}
    >
      {isMobile && (
        <Button
          type="text"
          icon={mobileSiderOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setMobileSiderOpen(!mobileSiderOpen)}
          style={{
            fontSize: "16px",
            width: 64,
            height: 64,
            color: token.colorText,
          }}
        />
      )}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Space style={{ cursor: "pointer" }}>
            <Avatar src={user?.avatar} icon={<UserOutlined />} alt={user?.name} />
            {!isMobile && <Text>{user?.name}</Text>}
            <DownOutlined />
          </Space>
        </Dropdown>
      </div>
    </div>
  );
};
