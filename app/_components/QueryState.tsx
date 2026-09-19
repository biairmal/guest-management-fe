"use client";

import React from "react";
import { Button, Result, Spin } from "antd";
import type { ApiError } from "../_lib/api";

type Props = {
  loading: boolean;
  error?: ApiError;
  onRetry: () => void;
  notFound?: React.ReactNode; // extra action shown on 404, e.g. "Back to users"
};

// Loading / no-permission / not-found / error+Retry for a useApi() query.
// Pages render this instead of their content while `loading || error`.
export default function QueryState({ loading, error, onRetry, notFound }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }
  if (!error) return null;
  if (error.status === 403) {
    return (
      <Result
        status="403"
        title="No permission"
        subTitle="Your role doesn't include managing users. Ask a tenant administrator for access."
      />
    );
  }
  if (error.status === 404) {
    return <Result status="404" title="User not found" subTitle={error.message} extra={notFound} />;
  }
  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={error.message}
      extra={
        <Button type="primary" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
