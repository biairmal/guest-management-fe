"use client";

import React, { useState } from "react";
import { Modal, Alert, Form, Select, Checkbox, Tag } from "antd";
import { roleName, type MockUser } from "../../../_lib/mock-data";

type Props = {
  open: boolean;
  onClose: () => void;
  candidates: MockUser[]; // tenant's other active users, self already excluded
};

// "Transfer tenant master ownership" — POST /api/v1/users/{id}/transfer-master,
// only rendered on the detail page when the signed-in user is the current
// master. ponytail: submit just closes the modal, no API call yet.
export default function TransferMasterModal({ open, onClose, candidates }: Props) {
  const [form] = Form.useForm();
  const [confirmed, setConfirmed] = useState(false);

  const handleOk = () => {
    form.validateFields().then(() => {
      setConfirmed(false);
      onClose();
    });
  };

  return (
    <Modal
      title="Transfer tenant master ownership"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        setConfirmed(false);
        onClose();
      }}
      okText="Transfer ownership"
      okButtonProps={{ danger: true, disabled: !confirmed }}
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 20 }}
        title="You are the current tenant master. Confirming hands is_tenant_master to the user below and clears your own — effective immediately, only reversible by the new master transferring it back."
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="targetUserId"
          label="New tenant master"
          rules={[{ required: true, message: "Select a new tenant master" }]}
          extra="Lists active users in your own tenant, excluding yourself. A target from another tenant isn't offered (the API 404s it either way)."
        >
          <Select
            placeholder="Select a user"
            options={candidates.map((u) => ({
              value: u.id,
              label: (
                <span>
                  {u.email} <Tag color="#4F46E5">{roleName(u.roleId)}</Tag>
                </span>
              ),
            }))}
          />
        </Form.Item>
      </Form>
      <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
        I understand I will immediately lose tenant-master privileges.
      </Checkbox>
    </Modal>
  );
}
