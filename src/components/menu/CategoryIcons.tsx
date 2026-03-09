import { useState } from 'react';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategoryIconsProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
}

export function CategoryIcons({ categories, onCategorySelect }: CategoryIconsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (categoryId: string | null) => {
    setSelectedId(categoryId);
    if (categoryId) {
      onCategorySelect(categoryId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-foreground">Categorias</h3>
      </div>
      
      {/* Mobile: máximo 4 por linha com flex-wrap | Desktop: scroll horizontal */}
      <div className="flex gap-1.5 pb-2 flex-wrap md:flex-nowrap md:overflow-x-auto md:scrollbar-hide">
        {categories.map((category) => {
          const isSelected = selectedId === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => handleSelect(category.id)}
              className={cn(
                "rounded-full px-2 py-1.5 text-xs font-medium transition-all duration-200",
                "md:w-auto md:whitespace-nowrap text-center",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
