"use client";

import React from "react";
import { Modal, Alert, Typography } from "antd";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetEmail: string;
};

// Reachable only from the detail page's Danger zone, never from the list —
// DELETE /api/v1/users/{id}.
// ponytail: onConfirm just navigates back to the list, no API call yet.
export default function DeleteUserModal({ open, onClose, onConfirm, targetEmail }: Props) {
  return (
    <Modal
      title="Delete user"
      open={open}
      onOk={onConfirm}
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
