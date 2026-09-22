"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Typography, Card, Avatar, Tag, Form, Input, Select, Button, Divider } from "antd";
import AppShell from "../../_components/AppShell";
import PageHeader from "../../_components/PageHeader";
import ResetPasswordModal from "./_components/ResetPasswordModal";
import TransferMasterModal from "./_components/TransferMasterModal";
import DeleteUserModal from "./_components/DeleteUserModal";
import { ROLES, initials, roleName, type User } from "../../_lib/users";
import { api, getSession } from "../../_lib/api";

// GET /api/v1/users/{id} to load; editable Email/Role against PUT
// /api/v1/users/{id} (no password field — that endpoint doesn't take one).
// The signed-in user is loaded too, because whether they are the tenant
// master (which gates the transfer action) is not a JWT claim.
export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { message } = App.useApp();

  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([api<User>(`/users/${id}`), api<User>(`/users/${getSession()?.userId}`)])
        .then(([u, self]) => {
          setUser(u);
          setMe(self);
        })
        .catch((e: Error) => setLoadError(e.message)),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const meId = me?.id;
  const iAmMaster = !!me?.is_tenant_master;

  const save = async (values: { email: string; roleId: string }) => {
    setSaving(true);
    try {
      await api(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ email: values.email, role_id: values.roleId }),
      });
      message.success("User updated");
      router.push("/users");
    } catch (e) {
      setSaving(false);
      message.error((e as Error).message);
    }
  };

  const remove = async () => {
    await api(`/users/${id}`, { method: "DELETE" });
    message.success(`Deleted ${user?.email}`);
    router.push("/users");
  };

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[760px]">
          {loadError ? <Alert type="error" showIcon title={loadError} /> : <Card loading />}
        </div>
      </AppShell>
    );
  }

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
                <Tag color="var(--color-primary)">{roleName(user.role_id)}</Tag>
                {user.must_change_password &&<Tag color="warning">Must change password</Tag>}
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
            key={user.updated_at}
            layout="vertical"
            style={{ marginTop: 16, maxWidth: 360 }}
            initialValues={{ email: user.email, roleId: user.role_id }}
            onFinish={save}
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
                <Tag color={user.is_tenant_master ? "gold" : "default"}>
                  {user.is_tenant_master ? "Master" : "Not master"}
                </Tag>
              </div>
            </Form.Item>

            <div className="mt-2 flex justify-end gap-2">
              <Button onClick={() => router.push("/users")}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
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

          {iAmMaster && user.id !== meId && (
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
        onDone={load}
        targetId={user.id}
        targetEmail={user.email}
      />
      <TransferMasterModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onDone={load}
        defaultTarget={user}
        selfId={meId}
      />
      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        targetEmail={user.email}
      />
    </AppShell>
  );
}
