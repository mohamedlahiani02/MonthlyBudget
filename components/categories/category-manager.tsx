"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Pencil, Trash2, FolderPlus, Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SortableItem } from "@/components/categories/sortable-item";
import type { CategoryWithSubs, CategoryType, Subcategory } from "@/types";

export function CategoryManager() {
  const { toast } = useToast();
  const [categories, setCategories] = React.useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newFixed, setNewFixed] = React.useState("");
  const [newVariable, setNewVariable] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await api.get<CategoryWithSubs[]>("/api/categories"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function addCategory(type: CategoryType, name: string) {
    if (!name.trim()) return;
    try {
      await api.post("/api/categories", { name: name.trim(), type });
      type === "Fixed" ? setNewFixed("") : setNewVariable("");
      toast({ title: "Category added", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  const fixed = categories.filter((c) => c.type === "Fixed");
  const variable = categories.filter((c) => c.type === "Variable");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CategoryColumn
        title="Fixed"
        badge="accent"
        description="Rent, utilities, insurance…"
        loading={loading}
        categories={fixed}
        newValue={newFixed}
        setNewValue={setNewFixed}
        onAdd={() => addCategory("Fixed", newFixed)}
        onChanged={load}
        setCategories={setCategories}
      />
      <CategoryColumn
        title="Variable"
        badge="secondary"
        description="Food, entertainment, shopping…"
        loading={loading}
        categories={variable}
        newValue={newVariable}
        setNewValue={setNewVariable}
        onAdd={() => addCategory("Variable", newVariable)}
        onChanged={load}
        setCategories={setCategories}
      />
    </div>
  );
}

function CategoryColumn({
  title,
  badge,
  description,
  loading,
  categories,
  newValue,
  setNewValue,
  onAdd,
  onChanged,
  setCategories,
}: {
  title: string;
  badge: "accent" | "secondary";
  description: string;
  loading: boolean;
  categories: CategoryWithSubs[];
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: () => void;
  onChanged: () => void;
  setCategories: React.Dispatch<React.SetStateAction<CategoryWithSubs[]>>;
}) {
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = categories.map((c) => c.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    // optimistic update within this type
    setCategories((prev) => {
      const others = prev.filter((c) => !ids.includes(c.id));
      return [...others, ...reordered];
    });
    try {
      await api.put("/api/categories/reorder", { ids: reordered.map((c) => c.id) });
    } catch (err) {
      toast({ title: "Reorder failed", description: (err as Error).message, variant: "destructive" });
      onChanged();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title} categories</CardTitle>
          <Badge variant={badge}>{categories.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`New ${title.toLowerCase()} category`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
          />
          <Button onClick={onAdd} size="icon" aria-label="Add category">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : categories.length === 0 ? (
          <EmptyState icon={FolderPlus} title="No categories" description="Add your first one above." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <SortableItem
                    key={cat.id}
                    id={cat.id}
                    className="flex items-start gap-2 rounded-xl border border-white/10 bg-secondary/20 p-3"
                    handleClassName="mt-1"
                  >
                    <CategoryNode category={cat} onChanged={onChanged} />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryNode({
  category,
  onChanged,
}: {
  category: CategoryWithSubs;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(category.name);
  const [newSub, setNewSub] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function rename() {
    if (!name.trim() || name === category.name) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      await api.put(`/api/categories/${category.id}`, { name: name.trim() });
      toast({ title: "Renamed", variant: "success" });
      setEditing(false);
      onChanged();
    } finally {
      setSavingName(false);
    }
  }

  async function addSub() {
    if (!newSub.trim()) return;
    await api.post("/api/subcategories", { name: newSub.trim(), categoryId: category.id });
    setNewSub("");
    onChanged();
  }

  async function removeCategory() {
    await api.del(`/api/categories/${category.id}`);
    toast({ title: "Category deleted", variant: "success" });
    onChanged();
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-8"
            />
            <Button size="sm" onClick={rename} disabled={savingName}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 truncate font-medium">{category.name}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </>
        )}
      </div>

      <div className="mt-2 space-y-1.5 pl-1">
        {category.subcategories.map((sub) => (
          <SubcategoryRow key={sub.id} sub={sub} onChanged={onChanged} />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          placeholder="Add subcategory"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSub()}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="secondary" onClick={addSub}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${category.name}"?`}
        description="All its subcategories and related expenses will also be deleted."
        onConfirm={removeCategory}
      />
    </div>
  );
}

function SubcategoryRow({ sub, onChanged }: { sub: Subcategory; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(sub.name);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function rename() {
    if (!name.trim() || name === sub.name) {
      setEditing(false);
      return;
    }
    await api.put(`/api/subcategories/${sub.id}`, { name: name.trim() });
    setEditing(false);
    onChanged();
  }

  async function remove() {
    await api.del(`/api/subcategories/${sub.id}`);
    toast({ title: "Subcategory deleted", variant: "success" });
    onChanged();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/40 px-2.5 py-1.5 text-sm">
      {editing ? (
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") rename();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={rename}
          className="h-7"
        />
      ) : (
        <>
          <span className="flex-1 truncate text-muted-foreground">{sub.name}</span>
          <button
            className="text-muted-foreground/70 hover:text-foreground"
            onClick={() => setEditing(true)}
            aria-label="Rename subcategory"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="text-muted-foreground/70 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete subcategory"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${sub.name}"?`}
        description="Related expenses will also be deleted."
        onConfirm={remove}
      />
    </div>
  );
}
