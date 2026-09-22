"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../../_components/AppShell";
import CategoryForm from "../_components/CategoryForm";

// POST /api/v1/event-categories with the whole template set; on success the
// new category's own page takes over.
export default function NewCategoryPage() {
  const router = useRouter();
  return (
    <AppShell>
      <CategoryForm mode="create" onSaved={(c) => router.replace(`/events/configuration/categories/${c.id}`)} />
    </AppShell>
  );
}
