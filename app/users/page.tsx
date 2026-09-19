"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Button, Input, Table, Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppShell from "../_components/AppShell";
import QueryState from "../_components/QueryState";
import { useApi, useSession, type Page, type User } from "../_lib/api";
import { ROLES, roleName } from "../_lib/roles";
import FilterPopoverButton from "./_components/FilterPopoverButton";
import SortPopoverButton from "./_components/SortPopoverButton";
import {
  FIELD_LABELS,
  newId,
  type FilterCondition,
  type SortKey,
  type UserField,
} from "./_components/filter-sort-types";

const DATE_FIELD = { createdAt: "created_at", updatedAt: "updated_at" } as const;

function fieldValue(user: User, field: UserField): string {
  if (field === "role") return roleName(user.role_id);
  if (field === "email") return user.email;
  return user[DATE_FIELD[field]];
}

function matchesCondition(user: User, cond: FilterCondition): boolean {
  if (cond.field === "role") {
    if (!cond.value) return true;
    const isMatch = user.role_id === cond.value;
    return cond.operator === "is_not" ? !isMatch : isMatch;
  }
  if (cond.field === "createdAt" || cond.field === "updatedAt") {
    const raw = dayjs(user[DATE_FIELD[cond.field]]);
    if (cond.operator === "between") {
      if (!cond.value || !cond.value2) return true;
      return !raw.isBefore(dayjs(cond.value), "day") && !raw.isAfter(dayjs(cond.value2), "day");
    }
    if (!cond.value) return true;
    const target = dayjs(cond.value);
    return cond.operator === "gt" ? raw.isAfter(target, "day") : raw.isBefore(target, "day");
  }
  // email — text contains|is
  const raw = user.email.toLowerCase();
  const val = cond.value.trim().toLowerCase();
  if (!val) return true;
  return cond.operator === "is" ? raw === val : raw.includes(val);
}

function sortUsers(users: User[], keys: SortKey[]): User[] {
  if (!keys.length) return users;
  return [...users].sort((a, b) => {
    for (const key of keys) {
      const cmp = fieldValue(a, key.field).localeCompare(fieldValue(b, key.field));
      if (cmp !== 0) return key.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

function formatDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY");
}

// ponytail: loads one page of the max size (100) and filters/sorts it
// client-side; switch to server-side page/sort/filter params once a tenant
// can outgrow 100 users.
const LIST_PATH = "/api/v1/users?page=1&size=100";

// View-only: no action column, no inline row actions — the whole row is a
// link to the user's detail page (per the product-direction amendment).
// Column set + Filter/Sort toolbar per DEVELOPMENT_PLAN.md B11 §7 /
// DESIGN_SYSTEM.md §7 — custom popover builders, not Table's own
// per-column filter/sorter (§4's rationale: only one field at a time).
export default function UsersListPage() {
  const router = useRouter();
  const session = useSession();
  const { data, error, loading, reload } = useApi<Page<User>>(LIST_PATH);
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([
    { id: newId("s"), field: "email", direction: "asc" },
  ]);

  const roleOptions = ROLES.map((r) => ({ value: r.id, label: r.name }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = (data?.items ?? []).filter((u) => {
      const matchesSearch = !term || u.email.toLowerCase().includes(term);
      return matchesSearch && conditions.every((c) => matchesCondition(u, c));
    });
    return sortUsers(rows, sortKeys);
  }, [data, search, conditions, sortKeys]);

  // Table header sort affordance is presentational — the badge-count Sort
  // button/popover above remains the actual source of truth for multi-key
  // ordering (DESIGN_SYSTEM.md §7), this just lets a header click promote a
  // field to the top sort key as a convenience shortcut.
  const topSortDirectionFor = (field: UserField) =>
    sortKeys[0]?.field === field ? sortKeys[0].direction : undefined;

  const promoteSortField = (field: UserField) => {
    setSortKeys((keys) => {
      const current = keys[0];
      if (current?.field === field) {
        const rest = keys.slice(1);
        return [{ ...current, direction: current.direction === "asc" ? "desc" : "asc" }, ...rest];
      }
      const rest = keys.filter((k) => k.field !== field);
      return [{ id: newId("s"), field, direction: "asc" }, ...rest];
    });
  };

  const sortableTitle = (field: UserField) => {
    const dir = topSortDirectionFor(field);
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        onClick={() => promoteSortField(field)}
      >
        {FIELD_LABELS[field]}
        {dir === "asc" && <ArrowUpOutlined style={{ fontSize: 11, color: "var(--color-primary-text)" }} />}
        {dir === "desc" && <ArrowDownOutlined style={{ fontSize: 11, color: "var(--color-primary-text)" }} />}
      </span>
    );
  };

  const columns: TableColumnsType<User> = [
    {
      title: sortableTitle("email"),
      dataIndex: "email",
      render: (email: string, user) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.is_tenant_master && (
            <Tooltip title="Tenant master">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--color-warning)",
                  flexShrink: 0,
                }}
              />
            </Tooltip>
          )}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
            <span>
              {email}
              {user.must_change_password && (
                <Tooltip title="Must change password">
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-warning)",
                      marginLeft: 6,
                    }}
                  />
                </Tooltip>
              )}
            </span>
            {user.id === session?.userId && (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>you</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: sortableTitle("role"),
      dataIndex: "role_id",
      render: (roleId: string) => (
        <Tag
          style={{
            background: "var(--color-primary-tint)",
            borderColor: "var(--color-primary-tint)",
            color: "var(--color-primary-text)",
          }}
        >
          {roleName(roleId)}
        </Tag>
      ),
    },
    {
      title: sortableTitle("createdAt"),
      dataIndex: "created_at",
      render: formatDate,
    },
    {
      title: sortableTitle("updatedAt"),
      dataIndex: "updated_at",
      render: formatDate,
    },
  ];

  if (loading || error) {
    return (
      <AppShell>
        <QueryState loading={loading} error={error} onRetry={reload} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Typography.Title level={4} style={{ margin: "0 0 4px" }}>
            Users
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Tenant Admin &amp; Super Admin only (requires manage_users) · scoped
            to your tenant · click a row to view, edit, reset password, or
            transfer ownership
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push("/users/new")}
        >
          New user
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <Input.Search
          placeholder="Search by email"
          allowClear
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterPopoverButton
          conditions={conditions}
          onApply={setConditions}
          roleOptions={roleOptions}
        />
        <SortPopoverButton sortKeys={sortKeys} onApply={setSortKeys} />
      </div>

      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        pagination={false}
        locale={{
          emptyText: data?.items.length ? "No users match these filters." : "No users yet.",
        }}
        onRow={(record) => ({
          className: "cursor-pointer",
          onClick: () => router.push(`/users/${record.id}`),
        })}
      />
    </AppShell>
  );
}
