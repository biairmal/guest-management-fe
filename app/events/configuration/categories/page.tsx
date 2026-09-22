"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppShell from "../../../_components/AppShell";
import FilterPopoverButton from "../../../_components/FilterPopoverButton";
import SortPopoverButton from "../../../_components/SortPopoverButton";
import SourceTag from "./_components/SourceTag";
import { api, type Page } from "../../../_lib/api";
import type { CategorySummary } from "../../../_lib/categories";
import {
  newId,
  toListQuery,
  type FilterCondition,
  type FilterField,
  type SortField,
  type SortKey,
} from "../../../_lib/list-query";

// Within GET /api/v1/event-categories' allow-lists (CategoryListConfig).
// Name is searched from the search box, so the Filter popover only offers Source.
const FILTER_FIELDS: FilterField[] = [
  {
    key: "source",
    label: "Source",
    operators: ["eq"],
    options: [
      { value: "tenant", label: "Custom" },
      { value: "app", label: "App default" },
    ],
  },
];

const SORT_FIELDS: SortField[] = [
  { key: "name", label: "Name" },
  { key: "source", label: "Source" },
  { key: "created_at", label: "Created date" },
  { key: "updated_at", label: "Updated date" },
];

const PAGE_SIZE = 20;
const formatDate = (iso: string) => dayjs(iso).format("MMM D, YYYY");

// View-only list (GL-002): rows navigate to the category's page; creating goes
// to /new. Filtering, sorting and paging are server-side.
export default function CategoriesPage() {
  const router = useRouter();
  const [result, setResult] = useState<Page<CategorySummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ id: newId("s"), field: "updated_at", direction: "desc" }]);

  useEffect(() => {
    let cancelled = false;
    const all = search.trim()
      ? [...conditions, { id: "search", field: "name", operator: "like" as const, value: search }]
      : conditions;
    api<Page<CategorySummary>>(`/event-categories?${toListQuery(page, PAGE_SIZE, all, sortKeys)}`)
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
  }, [page, search, conditions, sortKeys]);

  // Any query change starts back at page 1 and shows the spinner.
  const requery = <T,>(set: (v: T) => void) => (v: T) => {
    setLoading(true);
    setPage(1);
    set(v);
  };

  const columns: TableColumnsType<CategorySummary> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, c) => (
        <Link
          href={`/events/configuration/categories/${c.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: "var(--color-text)", fontWeight: 500 }}
        >
          {name}
        </Link>
      ),
    },
    { title: "Source", dataIndex: "source", render: (source: CategorySummary["source"]) => <SourceTag source={source} /> },
    { title: "Created date", dataIndex: "created_at", render: formatDate, responsive: ["md"] },
    { title: "Updated date", dataIndex: "updated_at", render: formatDate, responsive: ["sm"] },
  ];

  return (
    <AppShell>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        Events / Configuration / <b style={{ color: "var(--color-text)" }}>Categories</b>
      </Typography.Text>
      <div className="mt-1 mb-1 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Event categories
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/events/configuration/categories/new")}>
          New category
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        A category gives new events their starting workflow steps and ticket types.
      </Typography.Paragraph>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Input.Search
          allowClear
          placeholder="Search by name"
          aria-label="Search categories by name"
          style={{ width: 320, maxWidth: "100%" }}
          onSearch={requery(setSearch)}
        />
        <FilterPopoverButton fields={FILTER_FIELDS} conditions={conditions} onApply={requery(setConditions)} />
        <SortPopoverButton fields={SORT_FIELDS} sortKeys={sortKeys} onApply={requery(setSortKeys)} />
      </div>

      {loadError && <Alert type="error" showIcon title={loadError} style={{ marginBottom: 16 }} />}

      <Table<CategorySummary>
        rowKey="id"
        columns={columns}
        dataSource={result?.items ?? []}
        loading={loading}
        locale={{ emptyText: search || conditions.length ? "No categories match." : "No categories yet." }}
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
          onClick: () => router.push(`/events/configuration/categories/${record.id}`),
        })}
      />
    </AppShell>
  );
}
