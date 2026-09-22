"use client";

import React, { useState } from "react";
import { App, Modal, Alert, Form, Select, Checkbox, Tag } from "antd";
import { roleName, type User } from "../../../_lib/users";
import { api, type Page } from "../../../_lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  defaultTarget: User; // the detail page's user, preselected
  selfId?: string; // excluded from the candidates
};

const CANDIDATE_PAGE_SIZE = 20;

// "Transfer tenant master ownership" — POST /api/v1/users/{id}/transfer-master,
// only rendered on the detail page when the signed-in user is the current
// master. Candidates come from GET /api/v1/users one page at a time: page 1
// on open, the next page when the dropdown is scrolled to the bottom.
export default function TransferMasterModal({ open, onClose, onDone, defaultTarget, selfId }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [pageLoading, setPageLoading] = useState(false);

  const loadPage = async (page: number) => {
    setPageLoading(true);
    try {
      const res = await api<Page<User>>(`/users?page=${page}&size=${CANDIDATE_PAGE_SIZE}&sort=email,ASC`);
      setCandidates((prev) => [...(page === 1 ? [] : prev), ...res.items]);
      setNextPage(res.has_next ? page + 1 : null);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPageLoading(false);
    }
  };

  const onPopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom && nextPage && !pageLoading) loadPage(nextPage);
  };

  // defaultTarget first (it may sit on a page not loaded yet), then the
  // loaded pages; self is never a candidate.
  const options = [defaultTarget, ...candidates.filter((u) => u.id !== defaultTarget.id)].filter(
    (u) => u.id !== selfId,
  );

  const handleOk = async () => {
    const { targetUserId } = await form.validateFields();
    setLoading(true);
    try {
      await api(`/users/${targetUserId}/transfer-master`, { method: "POST" });
      message.success("Tenant master transferred");
      setConfirmed(false);
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
      title="Transfer tenant master ownership"
      open={open}
      onOk={handleOk}
      confirmLoading={loading}
      onCancel={() => {
        setConfirmed(false);
        onClose();
      }}
      okText="Transfer ownership"
      okButtonProps={{ danger: true, disabled: !confirmed }}
      afterOpenChange={(isOpen) => {
        if (isOpen) loadPage(1);
      }}
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 20 }}
        title="You are the current tenant master. Confirming hands is_tenant_master to the user below and clears your own — effective immediately, only reversible by the new master transferring it back."
      />
      <Form form={form} layout="vertical" initialValues={{ targetUserId: defaultTarget.id }}>
        <Form.Item
          name="targetUserId"
          label="New tenant master"
          rules={[{ required: true, message: "Select a new tenant master" }]}
          extra="Lists active users in your own tenant, excluding yourself. A target from another tenant isn't offered (the API 404s it either way)."
        >
          <Select
            placeholder="Select a user"
            loading={pageLoading}
            onPopupScroll={onPopupScroll}
            options={options.map((u) => ({
              value: u.id,
              label: (
                <span>
                  {u.email} <Tag color="#4F46E5">{roleName(u.role_id)}</Tag>
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
