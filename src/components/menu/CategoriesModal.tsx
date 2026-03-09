import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoriesModal({ open, onOpenChange, categories, onCategorySelect }: CategoriesModalProps) {
  const handleSelect = (categoryId: string | null) => {
    onCategorySelect(categoryId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center">Todas as Categorias</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-wrap gap-2 px-2">
            {/* Todos */}
            <button
              onClick={() => handleSelect(null)}
              className="rounded-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground shadow-card"
            >
              Todos
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                className="rounded-full px-4 py-2 text-sm font-medium bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
