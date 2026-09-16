"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Card, Avatar, Tag, Form, Input, Select, Button, Divider } from "antd";
import AppShell from "../../_components/AppShell";
import PageHeader from "../../_components/PageHeader";
import ResetPasswordModal from "./_components/ResetPasswordModal";
import TransferMasterModal from "./_components/TransferMasterModal";
import DeleteUserModal from "./_components/DeleteUserModal";
import { CURRENT_USER, MOCK_USERS, ROLES, initials, roleName } from "../../_lib/mock-data";

// GET /api/v1/users/{id} to load; editable Email/Role against PUT
// /api/v1/users/{id} (no password field — that endpoint doesn't take one).
// ponytail: `id` looks up MOCK_USERS in-memory instead of fetching; falls
// back to the first mock user if the id isn't found (any static id works
// for this UI-only pass since there's no real list-to-detail handoff yet).
export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = MOCK_USERS.find((u) => u.id === id) ?? MOCK_USERS[0];

  const [form] = Form.useForm();
  const [resetOpen, setResetOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const transferCandidates = MOCK_USERS.filter((u) => u.id !== CURRENT_USER.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-[760px]">
        <PageHeader
          crumbs={[
            { label: "Users", onClick: () => router.push("/users") },
            { label: user.email },
          ]}
          title={user.email}
          onBack={() => router.push("/users")}
        />

        <Card style={{ marginBottom: 20 }}>
          <div className="mb-5 flex items-center gap-4">
            <Avatar size={56} style={{ background: "var(--color-primary)", fontSize: 20 }}>
              {initials(user.email)}
            </Avatar>
            <div>
              <div className="mb-1.5 text-lg font-semibold">{user.email}</div>
              <div className="flex flex-wrap gap-1.5">
                <Tag color="var(--color-primary)">{roleName(user.roleId)}</Tag>
                {user.mustChangePassword && <Tag color="warning">Must change password</Tag>}
              </div>
            </div>
          </div>

          <Divider style={{ margin: "0 0 20px" }} />
          <Typography.Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Details
          </Typography.Text>

          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 16, maxWidth: 360 }}
            initialValues={{ email: user.email, roleId: user.roleId }}
            onFinish={() => router.push("/users")}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="roleId"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
              extra="Super Admin · Tenant Admin · Tenant Staff — fixed system-scope catalog (no role list endpoint exists yet)."
            >
              <Select options={ROLES.map((r) => ({ value: r.id, label: r.name }))} />
            </Form.Item>
            <Form.Item
              label="Tenant master"
              extra='Not editable here — use "Transfer tenant master to this user" below, which runs inside a transaction to keep exactly one master per tenant.'
            >
              <div>
                <Tag color={user.isTenantMaster ? "gold" : "default"}>
                  {user.isTenantMaster ? "Master" : "Not master"}
                </Tag>
              </div>
            </Form.Item>

            <div className="mt-2 flex justify-end gap-2">
              <Button onClick={() => router.push("/users")}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save changes
              </Button>
            </div>
          </Form>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Typography.Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "block",
              marginBottom: 16,
            }}
          >
            Account actions
          </Typography.Text>

          <div
            className="flex items-center justify-between py-3.5"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div>
              <div className="text-sm font-medium">Reset password</div>
              <div className="max-w-[460px] text-xs" style={{ color: "var(--color-text-muted)" }}>
                Sets a new password on their behalf and forces &quot;must
                change password&quot; back on for their next login.
              </div>
            </div>
            <Button onClick={() => setResetOpen(true)}>Reset password</Button>
          </div>

          {CURRENT_USER.isTenantMaster && (
            <div className="flex items-center justify-between py-3.5">
              <div>
                <div className="text-sm font-medium">
                  Transfer tenant master to this user
                </div>
                <div className="max-w-[460px] text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Only available because you are currently the tenant master.
                  Hands over ownership immediately.
                </div>
              </div>
              <Button onClick={() => setTransferOpen(true)}>Transfer ownership</Button>
            </div>
          )}
        </Card>

        <Card style={{ borderColor: "var(--color-danger)" }}>
          <Typography.Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-danger)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "block",
              marginBottom: 16,
            }}
          >
            Danger zone
          </Typography.Text>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Delete user</div>
              <div className="max-w-[460px] text-xs" style={{ color: "var(--color-text-muted)" }}>
                Permanently removes {user.email}. This cannot be undone.
              </div>
            </div>
            <Button danger onClick={() => setDeleteOpen(true)}>
              Delete user
            </Button>
          </div>
        </Card>
      </div>

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        targetEmail={user.email}
      />
      <TransferMasterModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        candidates={transferCandidates}
      />
      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => router.push("/users")}
        targetEmail={user.email}
      />
    </AppShell>
  );
}
