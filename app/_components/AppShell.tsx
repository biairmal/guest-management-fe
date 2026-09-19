"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  IdcardOutlined,
  SolutionOutlined,
  FileTextOutlined,
  UserOutlined,
  WarningOutlined,
  LockOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { clearSession, useSession } from "../_lib/api";
import { canManageUsers, roleName } from "../_lib/roles";
import { useThemeMode } from "./ThemeModeProvider";
import ChangeMyPasswordModal from "./ChangeMyPasswordModal";

const { Header, Sider, Content, Footer } = Layout;

// Routes that actually exist in this UI-only pass — everything else in the
// nav (including every "Events" child below) is the pre-existing scaffold's
// placeholder list (no route to send it to yet), same as before — this pass
// only adds visual nesting/expand-collapse, not new pages.
const NAV_ROUTES: Record<string, string> = {
  dashboard: "/",
  users: "/users",
};

// DESIGN_SYSTEM.md §2 — 3-level nesting example (Events -> Transactions /
// Configuration -> Category / Ticket Template), same one Menu instance/Sider
// driving both expanded (inline children) and collapsed (hover flyout,
// antd's built-in inline-collapsed popup) states.
const menuItems = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    key: "events",
    icon: <CalendarOutlined />,
    label: "Events",
    children: [
      { key: "events-transactions", label: "Transactions" },
      {
        key: "events-configuration",
        label: "Configuration",
        children: [
          { key: "events-configuration-category", label: "Category" },
          { key: "events-configuration-ticket-template", label: "Ticket Template" },
        ],
      },
    ],
  },
  { key: "guests", icon: <TeamOutlined />, label: "Guests" },
  { key: "staff", icon: <IdcardOutlined />, label: "Staff" },
  { key: "incidents", icon: <WarningOutlined />, label: "Incidents" },
  { key: "templates", icon: <FileTextOutlined />, label: "Templates" },
  { key: "users", icon: <UserOutlined />, label: "Users" },
  { key: "workflows", icon: <SolutionOutlined />, label: "Workflow steps" },
];

function selectedKeyFor(pathname: string): string[] {
  if (pathname === "/") return ["dashboard"];
  if (pathname.startsWith("/users")) return ["users"];
  return [];
}

export default function AppShell({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const { mode, toggle } = useThemeMode();
  const session = useSession();

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) return;
    let cancelled = false;
    fetch(`${base}/version`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && typeof data?.version === "string") setApiVersion(data.version);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing renders until the session is known; null redirects above.
  if (!session) return null;

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    const route = NAV_ROUTES[key];
    if (route) router.push(route);
  };

  const visibleMenuItems = canManageUsers(session.roleId)
    ? menuItems
    : menuItems.filter((item) => item.key !== "users");

  const userDropdownItems: MenuProps["items"] = [
    {
      key: "user-info",
      disabled: true,
      label: (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600 }}>{session.email}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {roleName(session.roleId)}
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "change-password",
      icon: <LockOutlined />,
      label: "Change password",
      onClick: () => setChangePasswordOpen(true),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log out",
      // No logout endpoint: tokens are stateless JWTs, so dropping them is it.
      onClick: () => {
        clearSession();
        router.push("/login");
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-border)",
          padding: "0 24px",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Guest Management
        </Typography.Title>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <Button
              type="text"
              shape="circle"
              icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
              aria-label="Toggle color theme"
            />
          </Tooltip>
          <Dropdown menu={{ items: userDropdownItems }} trigger={["click"]}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <Avatar size={28} style={{ background: "var(--color-primary)", fontSize: 12 }}>
                {session.email.slice(0, 1).toUpperCase()}
              </Avatar>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
                {session.email}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider
          theme="light"
          collapsible
          collapsedWidth={80}
          width={220}
          style={{ borderRight: "1px solid var(--color-border)" }}
        >
          <Menu
            mode="inline"
            selectedKeys={selectedKeyFor(pathname)}
            defaultOpenKeys={["events", "events-configuration"]}
            style={{ height: "100%", borderRight: 0 }}
            items={visibleMenuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
      {apiVersion && (
        <Footer style={{ textAlign: "center", padding: "12px 24px" }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {`API v${apiVersion}`}
          </Typography.Text>
        </Footer>
      )}
      <ChangeMyPasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        email={session.email}
      />
    </Layout>
  );
}
