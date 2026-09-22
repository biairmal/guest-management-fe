"use client";

import React, { useState } from "react";
import { App, Modal, Form, Input, Typography } from "antd";
import { api, useSession } from "../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Self-service "Change my password" — POST /api/v1/users/me/password.
export default function ChangeMyPasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const session = useSession();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    const { password } = await form.validateFields();
    setLoading(true);
    try {
      await api("/users/me/password", { method: "POST", body: JSON.stringify({ password }) });
      message.success("Password updated");
      form.resetFields();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Change my password"
      open={open}
      onOk={handleOk}
      confirmLoading={loading}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Save password"
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Signed in as {session?.email}. This updates your own password
        only — POST /api/v1/users/me/password.
      </Typography.Paragraph>
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
