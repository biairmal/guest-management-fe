"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Button, Table, Tag, Tooltip, Alert } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppShell from "../_components/AppShell";
import FilterPopoverButton from "../_components/FilterPopoverButton";
import SortPopoverButton from "../_components/SortPopoverButton";
import { ROLES, roleName, type User } from "../_lib/users";
import { api, useSession, type Page } from "../_lib/api";
import {
  newId,
  toListQuery,
  type FilterCondition,
  type FilterField,
  type SortField,
  type SortKey,
} from "../_lib/list-query";

// This page's Filter/Sort config — must stay within GET /api/v1/users'
// allow-lists (guest-management-be UserListConfig). Every field is exact
// match only; add "like" to a field's operators to offer "contains" too.
const FILTER_FIELDS: FilterField[] = [
  { key: "email", label: "Email", operators: ["eq"] },
  {
    key: "role_id",
    label: "Role",
    operators: ["eq"],
    options: ROLES.map((r) => ({ value: r.id, label: r.name })),
  },
  {
    key: "is_tenant_master",
    label: "Tenant master",
    operators: ["eq"],
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
];

const SORT_FIELDS: SortField[] = [
  { key: "email", label: "Email" },
  { key: "role_id", label: "Role" },
  { key: "created_at", label: "Created date" },
  { key: "updated_at", label: "Updated date" },
];

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY");
}

// Table over GET /api/v1/users — filtering, sorting and paging all happen
// server-side via toListQuery.
// View-only: no action column, no inline row actions — the whole row is a
// link to the user's detail page (per the product-direction amendment).
// Column set + Filter/Sort toolbar per DEVELOPMENT_PLAN.md B11 §7 /
// DESIGN_SYSTEM.md §7 — custom popover builders, not Table's own
// per-column filter/sorter (§4's rationale: only one field at a time).
export default function UsersListPage() {
  const router = useRouter();
  const session = useSession();
  const [result, setResult] = useState<Page<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([
    { id: newId("s"), field: "email", direction: "asc" },
  ]);

  useEffect(() => {
    let cancelled = false;
    api<Page<User>>(`/users?${toListQuery(page, PAGE_SIZE, conditions, sortKeys)}`)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setLoadError(null);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, conditions, sortKeys]);

  // Any query change starts back at page 1 and shows the spinner.
  const applyConditions = (next: FilterCondition[]) => {
    setLoading(true);
    setPage(1);
    setConditions(next);
  };
  const applySortKeys = (next: SortKey[]) => {
    setLoading(true);
    setPage(1);
    setSortKeys(next);
  };

  // Table header sort affordance is presentational — the badge-count Sort
  // button/popover above remains the actual source of truth for multi-key
  // ordering (DESIGN_SYSTEM.md §7), this just lets a header click promote a
  // field to the top sort key as a convenience shortcut.
  const topSortDirectionFor = (field: string) =>
    sortKeys[0]?.field === field ? sortKeys[0].direction : undefined;

  const promoteSortField = (field: string) => {
    const current = sortKeys[0];
    if (current?.field === field) {
      applySortKeys([
        { ...current, direction: current.direction === "asc" ? "desc" : "asc" },
        ...sortKeys.slice(1),
      ]);
      return;
    }
    applySortKeys([
      { id: newId("s"), field, direction: "asc" },
      ...sortKeys.filter((k) => k.field !== field),
    ]);
  };

  const sortableTitle = (field: string) => {
    const dir = topSortDirectionFor(field);
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        onClick={() => promoteSortField(field)}
      >
        {SORT_FIELDS.find((f) => f.key === field)?.label}
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
      title: sortableTitle("role_id"),
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
      title: sortableTitle("created_at"),
      dataIndex: "created_at",
      render: formatDate,
    },
    {
      title: sortableTitle("updated_at"),
      dataIndex: "updated_at",
      render: formatDate,
    },
  ];

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
        <FilterPopoverButton fields={FILTER_FIELDS} conditions={conditions} onApply={applyConditions} />
        <SortPopoverButton fields={SORT_FIELDS} sortKeys={sortKeys} onApply={applySortKeys} />
      </div>

      {loadError && (
        <Alert type="error" showIcon title={loadError} style={{ marginBottom: 16 }} />
      )}

      <Table<User>
        rowKey="id"
        columns={columns}
        dataSource={result?.items ?? []}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: result?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => {
            setLoading(true);
            setPage(next);
          },
        }}
        onRow={(record) => ({
          className: "cursor-pointer",
          onClick: () => router.push(`/users/${record.id}`),
        })}
      />
    </AppShell>
  );
}
