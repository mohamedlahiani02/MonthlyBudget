import { CategoryManager } from "@/components/categories/category-manager";
import { RecurringManager } from "@/components/categories/recurring-manager";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Create unlimited fixed & variable categories and subcategories. Drag to reorder.
        </p>
      </div>

      <CategoryManager />
      <RecurringManager />
    </div>
  );
}
