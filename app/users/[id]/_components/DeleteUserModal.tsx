"use client";

import React, { useState } from "react";
import { App, Modal, Alert, Typography } from "antd";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>; // the DELETE call
  targetEmail: string;
};

// Reachable only from the detail page's Danger zone, never from the list —
// DELETE /api/v1/users/{id}.
export default function DeleteUserModal({ open, onClose, onConfirm, targetEmail }: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (e) {
      setLoading(false);
      message.error((e as Error).message);
    }
  };

  return (
    <Modal
      title="Delete user"
      open={open}
      onOk={handleOk}
      confirmLoading={loading}
      onCancel={onClose}
      okText="Delete user"
      okButtonProps={{ danger: true }}
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        title={`This permanently removes ${targetEmail} and cannot be undone.`}
      />
      <Typography.Text>Are you sure you want to delete this user?</Typography.Text>
    </Modal>
  );
}
