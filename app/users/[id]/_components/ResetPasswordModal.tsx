"use client";

import React, { useState } from "react";
import { App, Modal, Alert, Form, Input, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "../../../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  targetId: string;
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
export default function ResetPasswordModal({ open, onClose, onDone, targetId, targetEmail }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    const { password } = await form.validateFields();
    setLoading(true);
    try {
      await api(`/users/${targetId}/password`, { method: "POST", body: JSON.stringify({ password }) });
      message.success(`Password reset for ${targetEmail}`);
      onClose();
      onDone();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Reset password — ${targetEmail}`}
      open={open}
      onOk={handleOk}
      confirmLoading={loading}
      onCancel={onClose}
      okText="Reset password"
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
