"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Typography, Card, Form, Input, Select, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import AppShell from "../../_components/AppShell";
import { ROLES } from "../../_lib/mock-data";

// Email/Password/Role only — no tenant-master field. Tenant master is only
// ever assigned through the (not-yet-built) tenant-management feature, never
// at ordinary user creation, per DEVELOPMENT_PLAN.md B11's API grounding.
// ponytail: submit is mocked — real pass wires this to POST /api/v1/users.
export default function CreateUserPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const onFinish = () => {
    router.push("/users");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px]">
        <button
          type="button"
          className="mb-4 flex items-center gap-1.5 text-sm"
          style={{ color: "var(--color-text-muted)" }}
          onClick={() => router.push("/users")}
        >
          <ArrowLeftOutlined /> Back to users
        </button>
        <Typography.Title level={4} style={{ margin: "0 0 4px" }}>
          Create user
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 20 }}>
          New users always start with &quot;must change password&quot; on —
          they set their own on first login.
        </Typography.Text>

        <Card>
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="name@tenant.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 8, message: "Minimum 8 characters" },
              ]}
              extra="Min. 8 characters. The user must change this on first login."
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item
              name="roleId"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
              extra="Super Admin · Tenant Admin · Tenant Staff — fixed system-scope catalog (no role list endpoint exists yet; see STAFFING_RBAC.md)."
              initialValue={ROLES[2].id}
            >
              <Select options={ROLES.map((r) => ({ value: r.id, label: r.name }))} />
            </Form.Item>

            <div
              className="mt-6 flex justify-end gap-2 pt-5"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <Button onClick={() => router.push("/users")}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Create user
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </AppShell>
  );
}
