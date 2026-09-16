"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Alert, Typography } from "antd";
import { MOCK_USERS } from "../_lib/mock-data";

// ponytail: no POST /api/v1/auth/login call yet — "login" just looks the
// email up in MOCK_USERS and branches on its mustChangePassword flag, the
// same branch real auth/session plumbing will drive off TokenPair later.
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const onFinish = (values: { email: string; password: string }) => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
      const user = MOCK_USERS.find((u) => u.email === values.email);
      if (!user) {
        // Generic 401 copy — never hints which field was wrong.
        setError(true);
        return;
      }
      router.push(user.mustChangePassword ? "/change-password" : "/users");
    }, 300);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-canvas)" }}
    >
      <div
        className="flex w-[400px] flex-col gap-1 rounded-lg p-8 pb-6"
        style={{
          background: "var(--color-chrome)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-elevation)",
        }}
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white" style={{ background: "var(--color-primary)" }}>
            GM
          </div>
          <div className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Guest Management</div>
        </div>
        <Typography.Title level={4} style={{ margin: "0 0 4px" }}>
          Log in
        </Typography.Title>
        <Typography.Text type="secondary" style={{ marginBottom: 20, display: "block" }}>
          Sign in with your tenant account
        </Typography.Text>

        {error && (
          <Alert
            type="error"
            title="Invalid email or password."
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required" }]}
          >
            <Input placeholder="you@tenant.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-4 text-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>
          Access is provisioned by your tenant administrator.
        </div>
      </div>
    </div>
  );
}
