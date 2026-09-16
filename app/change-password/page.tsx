"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";

// Full-screen interstitial gating entry to the app shell when
// TokenPair.must_change_password is true. "Skip for now" is a legitimate
// exit, not a bug — REQUIREMENT.md/FEATURES.md: the flag "encourages, but
// does not enforce."
// ponytail: submit is mocked — real pass wires this to
// POST /api/v1/users/me/password and clears the flag from session state.
export default function ChangePasswordPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const onFinish = () => {
    router.push("/users");
  };

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
            <Button type="primary" htmlType="submit" block>
              Set new password and continue
            </Button>
          </Form.Item>
          <Button type="text" block onClick={() => router.push("/users")}>
            Skip for now
          </Button>
        </Form>
      </div>
    </div>
  );
}
