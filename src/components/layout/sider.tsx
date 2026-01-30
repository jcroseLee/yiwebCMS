import {
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { RefineThemedLayoutV2SiderProps } from "@refinedev/antd";
import { ThemedTitleV2, useThemedLayoutContext } from "@refinedev/antd";
import type { ITreeMenu } from "@refinedev/core";
import {
  useMenu,
  useRefineContext,
  useTranslate
} from "@refinedev/core";
import { Button, Drawer, Grid, Layout, Menu, theme, type MenuProps } from "antd";
import React from "react";
import { Link } from "react-router-dom";

const { Sider } = Layout;
const { useToken } = theme;

export const CustomSider: React.FC<RefineThemedLayoutV2SiderProps> = ({
  Title: TitleFromProps,
  meta,
  activeItemDisabled = false,
}) => {
  const { token } = useToken();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });
  const breakpoint = Grid.useBreakpoint();
  const { hasDashboard } = useRefineContext();
  const translate = useTranslate();
  
  const { siderCollapsed, setSiderCollapsed, mobileSiderOpen, setMobileSiderOpen } = useThemedLayoutContext();

  const isMobile =
    typeof breakpoint.lg === "undefined" &&
    typeof breakpoint.md === "undefined" &&
    typeof breakpoint.sm === "undefined" &&
    typeof breakpoint.xs === "undefined"
      ? false
      : !breakpoint.lg;

  const RenderToTitle = TitleFromProps ?? ThemedTitleV2;

  const renderTreeView = (tree: ITreeMenu[], selectedKey?: string): MenuProps["items"] => {
    return tree.map((item: ITreeMenu) => {
      const { icon, label, route, key, children } = item;

      if (children.length > 0) {
        return {
          key: key,
          icon: icon ?? <UnorderedListOutlined />,
          label: label,
          children: renderTreeView(children, selectedKey),
        };
      }

      const isSelected = key === selectedKey;
      
      const linkStyle: React.CSSProperties =
        activeItemDisabled && isSelected ? { pointerEvents: "none" } : {};

      return {
        key: key,
        icon: icon ?? <UnorderedListOutlined />,
        label: (
          <Link to={route ?? ""} style={linkStyle}>
            {label}
          </Link>
        ),
      };
    }) as MenuProps["items"];
  };

  const items = renderTreeView(menuItems, selectedKey);

  const dashboardMenuItem = hasDashboard
    ? {
        key: "dashboard",
        icon: <DashboardOutlined />,
        label: (
          <Link to="/">
            {translate("dashboard.title", "Dashboard")}
          </Link>
        ),
      }
    : null;

  const allItems = dashboardMenuItem ? [dashboardMenuItem, ...(items || [])] : items;

  const renderMenu = () => (
      <Menu
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={defaultOpenKeys}
        mode="inline"
        inlineCollapsed={siderCollapsed}
        style={{
          marginTop: "8px",
          border: "none",
          backgroundColor: "transparent",
        }}
        items={allItems}
        onClick={() => {
            if (isMobile) {
                setMobileSiderOpen(false);
            }
        }}
      />
  );

  const renderTitle = (collapsed: boolean) => (
      <div
        style={{
          height: "64px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "14px",
          color: token.colorText,
          fontWeight: 700,
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <RenderToTitle collapsed={collapsed} text="WebCMS" />
      </div>
  );

  if (isMobile) {
      return (
          <Drawer
            placement="left"
            open={mobileSiderOpen}
            onClose={() => setMobileSiderOpen(false)}
            width={200}
            styles={{
                body: { padding: 0, backgroundColor: token.colorBgContainer }
            }}
            closable={false}
          >
             {renderTitle(false)}
             {renderMenu()}
          </Drawer>
      )
  }

  return (
    <Sider
      collapsible
      collapsed={siderCollapsed}
      onCollapse={(value) => setSiderCollapsed(value)}
      collapsedWidth={80}
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 999,
        backgroundColor: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorder}`,
      }}
      trigger={null}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {renderTitle(siderCollapsed)}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {renderMenu()}
        </div>
        <Button
          type="text"
          icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setSiderCollapsed(!siderCollapsed)}
          style={{
            fontSize: "16px",
            width: "100%",
            height: 64,
            color: token.colorTextSecondary,
            borderTop: `1px solid ${token.colorBorder}`,
          }}
        />
      </div>
    </Sider>
  );
};
