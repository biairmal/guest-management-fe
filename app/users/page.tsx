"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Button, Input, Table, Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppShell from "../_components/AppShell";
import { CURRENT_USER, MOCK_USERS, ROLES, MockUser, roleName } from "../_lib/mock-data";
import FilterPopoverButton from "./_components/FilterPopoverButton";
import SortPopoverButton from "./_components/SortPopoverButton";
import {
  FIELD_LABELS,
  newId,
  type FilterCondition,
  type SortKey,
  type UserField,
} from "./_components/filter-sort-types";

function fieldValue(user: MockUser, field: UserField): string {
  if (field === "role") return roleName(user.roleId);
  return user[field];
}

function matchesCondition(user: MockUser, cond: FilterCondition): boolean {
  if (cond.field === "role") {
    if (!cond.value) return true;
    const isMatch = user.roleId === cond.value;
    return cond.operator === "is_not" ? !isMatch : isMatch;
  }
  if (cond.field === "createdAt" || cond.field === "updatedAt") {
    const raw = dayjs(user[cond.field]);
    if (cond.operator === "between") {
      if (!cond.value || !cond.value2) return true;
      return !raw.isBefore(dayjs(cond.value), "day") && !raw.isAfter(dayjs(cond.value2), "day");
    }
    if (!cond.value) return true;
    const target = dayjs(cond.value);
    return cond.operator === "gt" ? raw.isAfter(target, "day") : raw.isBefore(target, "day");
  }
  // name / email — text contains|is
  const raw = user[cond.field].toLowerCase();
  const val = cond.value.trim().toLowerCase();
  if (!val) return true;
  return cond.operator === "is" ? raw === val : raw.includes(val);
}

function sortUsers(users: MockUser[], keys: SortKey[]): MockUser[] {
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

// Table bound to mock rows shaped like GET /api/v1/users — real pass swaps
// dataSource for a fetch against the `?page&size&sort&email=` query shape.
// View-only: no action column, no inline row actions — the whole row is a
// link to the user's detail page (per the product-direction amendment).
// Column set + Filter/Sort toolbar per DEVELOPMENT_PLAN.md B11 §7 /
// DESIGN_SYSTEM.md §7 — custom popover builders, not Table's own
// per-column filter/sorter (§4's rationale: only one field at a time).
export default function UsersListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([
    { id: newId("s"), field: "name", direction: "asc" },
  ]);

  const roleOptions = ROLES.map((r) => ({ value: r.id, label: r.name }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = MOCK_USERS.filter((u) => {
      const matchesSearch =
        !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchesSearch && conditions.every((c) => matchesCondition(u, c));
    });
    return sortUsers(rows, sortKeys);
  }, [search, conditions, sortKeys]);

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

  const columns: TableColumnsType<MockUser> = [
    {
      title: sortableTitle("name"),
      dataIndex: "name",
      render: (name: string, user) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.isTenantMaster && (
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
              {name}
              {user.mustChangePassword && (
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
            {user.email === CURRENT_USER.email && (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>you</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: sortableTitle("email"),
      dataIndex: "email",
    },
    {
      title: sortableTitle("role"),
      dataIndex: "roleId",
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
      dataIndex: "createdAt",
      render: formatDate,
    },
    {
      title: sortableTitle("updatedAt"),
      dataIndex: "updatedAt",
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
            to Acme Co · click a row to view, edit, reset password, or
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
          placeholder="Search by name or email"
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

      <Table<MockUser>
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        pagination={false}
        onRow={(record) => ({
          className: "cursor-pointer",
          onClick: () => router.push(`/users/${record.id}`),
        })}
      />
    </AppShell>
  );
}
