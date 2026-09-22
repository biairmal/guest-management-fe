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
import { initials, roleName } from "../_lib/users";
import { getSession, logout, useSession } from "../_lib/api";
import { confirmLeave } from "../_lib/leave-guard";
import { useThemeMode } from "./ThemeModeProvider";
import ChangeMyPasswordModal from "./ChangeMyPasswordModal";

const { Header, Sider, Content, Footer } = Layout;

// Routes that exist so far — every other nav item is still a placeholder
// with no page to send it to.
const NAV_ROUTES: Record<string, string> = {
  dashboard: "/",
  users: "/users",
  "events-configuration-categories": "/events/configuration/categories",
};

// DESIGN_SYSTEM.md §2 — 3-level nesting (Events -> Transactions /
// Configuration -> Categories), same one Menu instance/Sider driving both
// expanded (inline children) and collapsed (hover flyout, antd's built-in
// inline-collapsed popup) states. Ticket-type templates live inside a
// category's page, so there is no separate "Ticket Template" item.
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
        children: [{ key: "events-configuration-categories", label: "Categories" }],
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
  if (pathname.startsWith("/events/configuration/categories")) return ["events-configuration-categories"];
  return [];
}

export default function AppShell({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const { mode, toggle } = useThemeMode();
  const session = useSession();

  // Auth guard for every page rendered inside the shell. Reads storage
  // directly because useSession() is still null on the hydration render.
  useEffect(() => {
    if (!getSession()) router.replace("/login");
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

  const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
    const route = NAV_ROUTES[key];
    if (route && (await confirmLeave())) router.push(route);
  };

  const userDropdownItems: MenuProps["items"] = [
    {
      key: "user-info",
      disabled: true,
      label: (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600 }}>{session?.email}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {session && roleName(session.roleId)}
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
      // Stateless JWTs, no logout endpoint: dropping the pair client-side is
      // the whole logout (the access token stays valid until it expires).
      onClick: logout,
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
                {initials(session?.email ?? "")}
              </Avatar>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
                {session?.email}
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
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Content style={{ padding: 24 }}>{session && children}</Content>
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
      />
    </Layout>
  );
}
