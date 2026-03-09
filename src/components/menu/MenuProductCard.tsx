import { Plus } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface MenuProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function MenuProductCard({ product, onSelect }: MenuProductCardProps) {
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-2xl bg-card p-3 shadow-sm transition-all duration-200",
        product.is_available 
          ? "cursor-pointer hover:shadow-md active:scale-[0.99]" 
          : "opacity-60"
      )}
      onClick={() => product.is_available && onSelect(product)}
    >
      {/* Image - Small with 540:280 ratio */}
      {product.image_url && (
        <div className="relative w-24 sm:w-28 md:w-32 shrink-0 overflow-hidden rounded-xl" style={{ aspectRatio: '540/280' }}>
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {!product.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-[10px] font-bold uppercase text-white">Esgotado</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between py-0.5">
        <div>
          <h4 className="font-semibold text-foreground leading-tight">{product.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold text-primary">{formattedPrice}</span>
        </div>
      </div>

      {/* Add Button */}
      {product.is_available && (
        <div className="flex items-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
