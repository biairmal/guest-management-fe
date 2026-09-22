import React from "react";
import { Tag } from "antd";
import { EditOutlined, LockOutlined } from "@ant-design/icons";
import type { CategorySource } from "../../../../_lib/categories";

// Icon + label, never colour alone.
export default function SourceTag({ source }: { source: CategorySource }) {
  return source === "app" ? (
    <Tag icon={<LockOutlined />} bordered={false}>
      App default
    </Tag>
  ) : (
    <Tag
      icon={<EditOutlined />}
      bordered={false}
      style={{ background: "var(--color-accent-tint)", color: "var(--color-accent)" }}
    >
      Custom
    </Tag>
  );
}
