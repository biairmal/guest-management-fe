"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Empty, Grid, Input, Pagination, Spin, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppShell from "../_components/AppShell";
import FilterPopoverButton from "../_components/FilterPopoverButton";
import SortPopoverButton from "../_components/SortPopoverButton";
import StatusTag, { STATUS_OPTIONS } from "./_components/StatusTag";
import { api, type Page } from "../_lib/api";
import type { CategorySummary } from "../_lib/categories";
import { dayCount, expandStatusFilter, formatWhen, type EventListItem } from "../_lib/events";
import { newId, toListQuery, type FilterCondition, type FilterField, type SortField, type SortKey } from "../_lib/list-query";

const SORT_FIELDS: SortField[] = [
  { key: "start_date", label: "Start date" },
  { key: "name", label: "Name" },
  { key: "updated_at", label: "Updated date" },
];

const PAGE_SIZE = 20;
const formatDate = (iso: string) => dayjs(iso).format("MMM D, YYYY");
const guests = (e: EventListItem) => (e.guest_count ? `${e.confirmed_count} of ${e.guest_count} confirmed` : "No guests yet");

// All events of the caller's tenant (GET /api/v1/events; tenant from the JWT).
// View-only list (GL-002): rows navigate to the event. Status is derived from
// the dates; filtering by it becomes start_date/end_date range filters (B16 R3).
export default function EventsPage() {
  const router = useRouter();
  const mobile = !Grid.useBreakpoint().md;
  const [result, setResult] = useState<Page<EventListItem> | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ id: newId("s"), field: "start_date", direction: "desc" }]);

  useEffect(() => {
    api<Page<CategorySummary>>("/event-categories?page=1&size=100&sort=name,ASC")
      .then((p) => setCategories(p.items))
      .catch(() => setCategories([]));
  }, []);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filterFields: FilterField[] = useMemo(
    () => [
      { key: "status", label: "Status", operators: ["eq"], options: STATUS_OPTIONS },
      { key: "category_id", label: "Category", operators: ["eq"], options: categories.map((c) => ({ value: c.id, label: c.name })) },
    ],
    [categories],
  );

  useEffect(() => {
    let cancelled = false;
    const all = search.trim()
      ? [...conditions, { id: "search", field: "name", operator: "like" as const, value: search }]
      : conditions;
    api<Page<EventListItem>>(`/events?${toListQuery(page, PAGE_SIZE, expandStatusFilter(all), sortKeys)}`)
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
  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const filtered = !!search.trim() || conditions.length > 0;
  // No events at all: the empty state replaces the table, and the header button
  // hides so there is one obvious next step.
  const none = !loading && !loadError && !filtered && result?.total === 0;
  const create = () => router.push("/events/new");

  const when = (e: EventListItem) => (
    <span className="flex flex-wrap items-center gap-2">
      {formatWhen(e)}
      {e.is_multi_day && (
        <Tag bordered={false} style={{ margin: 0 }}>
          {dayCount(e)} days
        </Tag>
      )}
    </span>
  );

  const columns: TableColumnsType<EventListItem> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, e) => (
        <Link href={`/events/${e.id}`} onClick={(ev) => ev.stopPropagation()} style={{ color: "var(--color-text)", fontWeight: 500 }}>
          {name}
        </Link>
      ),
    },
    { title: "Category", dataIndex: "category_id", render: (id: string) => categoryName.get(id) ?? "—" },
    { title: "Date", key: "date", render: (_, e) => when(e) },
    { title: "Status", key: "status", render: (_, e) => <StatusTag event={e} /> },
    { title: "Guests", key: "guests", render: (_, e) => guests(e), responsive: ["lg"] },
    { title: "Updated date", dataIndex: "updated_at", render: formatDate, responsive: ["lg"] },
  ];

  return (
    <AppShell>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        Events / <b style={{ color: "var(--color-text)" }}>All events</b>
      </Typography.Text>
      <div className="mt-1 mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Events
        </Typography.Title>
        {!none && (
          <Button type="primary" icon={<PlusOutlined />} onClick={create}>
            New event
          </Button>
        )}
      </div>

      {none ? (
        <Card>
          <Empty
            description={
              <span className="flex flex-col gap-1">
                <span className="font-medium" style={{ color: "var(--color-text)" }}>No events yet</span>
                Create an event to start inviting guests. It starts with the workflow steps and ticket types of the category you pick.
              </span>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={create}>
              Create your first event
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <div className={`mb-4 flex flex-wrap items-center gap-2.5 ${mobile ? "flex-col items-stretch" : ""}`}>
            <Input.Search
              allowClear
              placeholder="Search by name"
              aria-label="Search events by name"
              style={{ width: mobile ? "100%" : 320 }}
              onSearch={requery(setSearch)}
            />
            <FilterPopoverButton fields={filterFields} conditions={conditions} onApply={requery(setConditions)} />
            <SortPopoverButton fields={SORT_FIELDS} sortKeys={sortKeys} onApply={requery(setSortKeys)} />
          </div>

          {loadError && <Alert type="error" showIcon title={loadError} style={{ marginBottom: 16 }} />}

          {mobile ? (
            <Spin spinning={loading}>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {(result?.items ?? []).map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="block rounded-lg p-4" style={{ background: "var(--color-pop)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-medium">{e.name}</span>
                        <StatusTag event={e} />
                      </span>
                      <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 6 }}>
                        {when(e)}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ display: "block", fontSize: 13 }}>
                        {categoryName.get(e.category_id) ?? "—"} · {guests(e)}
                      </Typography.Text>
                    </Link>
                  </li>
                ))}
              </ul>
              {!loading && !result?.items.length && <Empty description="No events match." />}
              <Pagination className="mt-4" simple current={page} pageSize={PAGE_SIZE} total={result?.total ?? 0} onChange={goToPage} hideOnSinglePage />
            </Spin>
          ) : (
            <Table<EventListItem>
              rowKey="id"
              columns={columns}
              dataSource={result?.items ?? []}
              loading={loading}
              locale={{ emptyText: filtered ? "No events match." : "No events yet." }}
              pagination={{ current: page, pageSize: PAGE_SIZE, total: result?.total ?? 0, showSizeChanger: false, onChange: goToPage }}
              onRow={(record) => ({ className: "cursor-pointer", onClick: () => router.push(`/events/${record.id}`) })}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
