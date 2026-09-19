"use client";

import React, { useState } from "react";
import { Modal, Alert, Form, Input, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api, ApiError } from "../../../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  userId: string;
  targetEmail: string;
};

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(): string {
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `Tmp-${body}`;
}

// Admin resetting *someone else's* password — POST /api/v1/users/{id}/password.
// Deliberately a separate component/handler from the self-service
// ChangeMyPasswordModal, per the Technical Design's explicit split.
export default function ResetPasswordModal({ open, onClose, onDone, userId, targetEmail }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const handleOk = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/v1/users/${userId}/password`, {
        method: "POST",
        body: JSON.stringify({ password: values.password }),
      });
      close();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Reset password — ${targetEmail}`}
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText="Reset password"
      confirmLoading={saving}
      afterOpenChange={(isOpen) => {
        if (isOpen) form.setFieldsValue({ password: generateTempPassword() });
      }}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 20 }}
        title={
          <Typography.Text style={{ fontSize: 13 }}>
            Since you&apos;re choosing this password, not {targetEmail}, this
            forces must_change_password back to true — they&apos;ll be asked
            to set their own on next login, even if that flag was already
            false. This is POST /api/v1/users/{"{"}id{"}"}/password, distinct
            from their own self-service route.
          </Typography.Text>
        }
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={{ password: generateTempPassword() }}>
        <Form.Item
          name="password"
          label="New temporary password"
          rules={[
            { required: true, message: "A temporary password is required" },
            { min: 8, message: "Minimum 8 characters" },
          ]}
          extra={`Minimum 8 characters. Share this with ${targetEmail} through a separate, secure channel.`}
        >
          <Input
            className="font-mono-tech"
            addonAfter={
              <ReloadOutlined
                title="Generate"
                onClick={() => form.setFieldsValue({ password: generateTempPassword() })}
              />
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
