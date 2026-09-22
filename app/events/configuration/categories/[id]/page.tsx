"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "antd";
import AppShell from "../../../../_components/AppShell";
import CategoryForm from "../_components/CategoryForm";
import { ApiError, api, useSession } from "../../../../_lib/api";
import { canEdit, hasTemplateSet, type Category, type CategorySummary } from "../../../../_lib/categories";

// GET /api/v1/event-categories/{id} loads the category with its template set;
// the form saves it back whole with PUT (template_version as the
// concurrency check). After a save the response replaces the form state —
// template ids change on every save.
export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const session = useSession();
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState<{ message: string; notFound?: boolean } | null>(null);

  const load = useCallback(() => {
    api<CategorySummary>(`/event-categories/${id}`)
      .then((c) => {
        if (hasTemplateSet(c)) setCategory(c);
        else
          setError({
            message:
              "The server doesn’t return this category’s steps and ticket types yet (backend B15 not deployed). Editing is disabled so nothing gets lost.",
          });
      })
      .catch((e: Error) => setError({ message: e.message, notFound: e instanceof ApiError && e.status === 404 }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      {error ? (
        <Alert
          type="error"
          showIcon
          title={error.notFound ? "Category not found" : error.message}
          action={
            <Button
              size="small"
              onClick={() => {
                if (error.notFound) return router.push("/events/configuration/categories");
                setError(null);
                load();
              }}
            >
              {error.notFound ? "Back to categories" : "Retry"}
            </Button>
          }
        />
      ) : !category ? (
        <Card loading />
      ) : (
        <CategoryForm
          key={category.template_version}
          mode="edit"
          category={category}
          readOnly={!canEdit(category, session)}
          onSaved={setCategory}
          onReload={load}
        />
      )}
    </AppShell>
  );
}
