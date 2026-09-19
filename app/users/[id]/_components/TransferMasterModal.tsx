"use client";

import React, { useState } from "react";
import { Modal, Alert, Checkbox, Typography } from "antd";
import { api, ApiError } from "../../../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  userId: string;
  targetEmail: string;
};

// "Transfer tenant master ownership" — POST /api/v1/users/{id}/transfer-master,
// only rendered on the detail page when the signed-in user is the current
// master. The target is the user whose detail page this is.
export default function TransferMasterModal({ open, onClose, onDone, userId, targetEmail }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setConfirmed(false);
    setError(null);
    onClose();
  };

  const handleOk = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/v1/users/${userId}/transfer-master`, { method: "POST" });
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
      title="Transfer tenant master ownership"
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText="Transfer ownership"
      okButtonProps={{ danger: true, disabled: !confirmed }}
      confirmLoading={saving}
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 20 }}
        title="You are the current tenant master. Confirming hands is_tenant_master to the user below and clears your own — effective immediately, only reversible by the new master transferring it back."
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Typography.Paragraph>
        New tenant master: <strong>{targetEmail}</strong>
      </Typography.Paragraph>
      <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
        I understand I will immediately lose tenant-master privileges.
      </Checkbox>
    </Modal>
  );
}
