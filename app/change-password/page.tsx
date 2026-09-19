"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Typography, Alert } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { api, ApiError, markPasswordChanged, useSession } from "../_lib/api";
import { canManageUsers } from "../_lib/roles";

// Full-screen interstitial gating entry to the app shell when
// TokenPair.must_change_password is true. "Skip for now" is a legitimate
// exit, not a bug — REQUIREMENT.md/FEATURES.md: the flag "encourages, but
// does not enforce."
export default function ChangePasswordPage() {
  const router = useRouter();
  const session = useSession();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  const home = canManageUsers(session?.roleId) ? "/users" : "/";

  const onFinish = async (values: { password: string }) => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/v1/users/me/password", {
        method: "POST",
        body: JSON.stringify({ password: values.password }),
      });
      markPasswordChanged();
      router.push(home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-canvas)" }}
    >
      <div
        className="flex w-[420px] flex-col items-center gap-1 rounded-lg p-8 text-center"
        style={{
          background: "var(--color-chrome)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-elevation)",
        }}
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ border: "1px solid var(--color-warning)", background: "var(--color-pop)" }}
        >
          <WarningOutlined style={{ color: "var(--color-warning)", fontSize: 20 }} />
        </div>
        <Typography.Title level={4} style={{ margin: "0 0 6px" }}>
          Update your password
        </Typography.Title>
        <Typography.Text type="secondary" style={{ marginBottom: 24, lineHeight: 1.5 }}>
          Your administrator requires a new password before you continue,
          since this is a first login or an admin-assigned reset.
        </Typography.Text>

        {error && <Alert type="error" title={error} showIcon className="mb-4 w-full text-left" />}

        <Form form={form} layout="vertical" onFinish={onFinish} className="w-full text-left">
          <Form.Item
            name="password"
            label="New password"
            rules={[
              { required: true, message: "New password is required" },
              { min: 8, message: "Minimum 8 characters" },
            ]}
            extra="Minimum 8 characters."
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm new password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm the new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={saving}>
              Set new password and continue
            </Button>
          </Form.Item>
          <Button type="text" block onClick={() => router.push(home)}>
            Skip for now
          </Button>
        </Form>
      </div>
    </div>
  );
}
