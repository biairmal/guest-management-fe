"use client";

import React, { useState } from "react";
import { Modal, Alert, Typography } from "antd";
import { api, ApiError } from "../../../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  userId: string;
  targetEmail: string;
};

// Reachable only from the detail page's Danger zone, never from the list —
// DELETE /api/v1/users/{id}.
export default function DeleteUserModal({ open, onClose, onDeleted, userId, targetEmail }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOk = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/v1/users/${userId}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Delete user"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        setError(null);
        onClose();
      }}
      okText="Delete user"
      okButtonProps={{ danger: true }}
      confirmLoading={saving}
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        title={error ?? `This permanently removes ${targetEmail} and cannot be undone.`}
      />
      <Typography.Text>Are you sure you want to delete this user?</Typography.Text>
    </Modal>
  );
}
