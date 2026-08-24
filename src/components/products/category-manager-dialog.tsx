"use client";

import * as React from "react";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ProductCategory } from "@/lib/types";

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onCategoriesChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  onCategoriesChanged: () => void;
}) {
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");
      toast.success(`Category "${newCategoryName.trim()}" created!`);
      setNewCategoryName("");
      onCategoriesChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to add category.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/product-categories?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      toast.success(`Category "${name}" deleted.`);
      onCategoriesChanged();
    } catch (err: any) {
      toast.error(err.message || "Could not delete category.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4 text-primary" /> Product Categories
          </DialogTitle>
          <DialogDescription>
            Create and manage categories to organize your inventory products.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddCategory} className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New Category Name (e.g. Machines, Spare Parts)"
            className="flex-1 text-xs"
          />
          <Button type="submit" size="sm" disabled={loading || !newCategoryName.trim()} className="gap-1 text-xs shrink-0">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Add Category
          </Button>
        </form>

        <div className="mt-3 flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg bg-muted/20">
              No categories created yet. Add one above!
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground">{cat.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deletingId === cat.id}
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                >
                  {deletingId === cat.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
