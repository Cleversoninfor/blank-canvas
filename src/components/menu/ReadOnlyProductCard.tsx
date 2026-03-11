import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ReadOnlyProductCardProps {
  product: Product;
}

export function ReadOnlyProductCard({ product }: ReadOnlyProductCardProps) {
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl bg-card p-3 shadow-sm",
        !product.is_available && "opacity-60"
      )}
    >
      {/* Image */}
      {product.image_url && (
        <div className="relative w-24 sm:w-28 md:w-32 shrink-0 overflow-hidden rounded-[18px]" style={{ aspectRatio: '1/1' }}>
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
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
    </div>
  );
}
