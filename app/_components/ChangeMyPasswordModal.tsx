"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Typography, Alert } from "antd";
import { api, ApiError, markPasswordChanged } from "../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  email: string;
};

// Self-service "Change my password" — POST /api/v1/users/me/password.
export default function ChangeMyPasswordModal({ open, onClose, email }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    form.resetFields();
    setError(null);
    onClose();
  };

  const handleOk = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/v1/users/me/password", {
        method: "POST",
        body: JSON.stringify({ password: values.password }),
      });
      markPasswordChanged();
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Change my password"
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText="Save password"
      confirmLoading={saving}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Signed in as {email}. This updates your own password only.
      </Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical">
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
      </Form>
    </Modal>
  );
}
