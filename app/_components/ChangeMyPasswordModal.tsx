"use client";

import React from "react";
import { Modal, Form, Input, Typography } from "antd";
import { CURRENT_USER } from "../_lib/mock-data";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Self-service "Change my password" — POST /api/v1/users/me/password.
// ponytail: submit just closes the modal, no API call yet (UI-only pass).
export default function ChangeMyPasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.validateFields().then(() => {
      form.resetFields();
      onClose();
    });
  };

  return (
    <Modal
      title="Change my password"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Save password"
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Signed in as {CURRENT_USER.email}. This updates your own password
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
