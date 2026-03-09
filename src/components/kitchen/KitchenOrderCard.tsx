import { useState } from 'react';
import { Clock, ChefHat, CheckCircle, Loader2, Truck, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KitchenItem, useKitchenItemMutations } from '@/hooks/useKitchenItems';
import { cn } from '@/lib/utils';

export interface GroupedKitchenOrder {
  orderKey: string;
  order_type: 'table' | 'delivery';
  order_id: number | null;
  table_order_id: number | null;
  table_number: number | null;
  table_name: string | null;
  customer_name?: string;
  waiter_name: string | null;
  items: KitchenItem[];
  oldest_ordered_at: string;
  status: string; // Determined by the "worst" status of items
}

interface KitchenOrderCardProps {
  order: GroupedKitchenOrder;
}

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  const { updateItemStatus } = useKitchenItemMutations();
  const [isUpdating, setIsUpdating] = useState(false);

  // Calculate waiting time from oldest item
  const waitingMinutes = Math.floor(
    (Date.now() - new Date(order.oldest_ordered_at).getTime()) / 60000
  );

  // Color based on waiting time
  const getTimeColor = () => {
    if (waitingMinutes < 5) return 'text-green-600 bg-green-100';
    if (waitingMinutes < 10) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const handleStatusChange = async (newStatus: 'preparing' | 'ready') => {
    setIsUpdating(true);
    try {
      // Update all items in this order
      await Promise.all(
        order.items.map(item => 
          updateItemStatus(item.id, newStatus, item.order_type, item.order_id || undefined)
        )
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
    preparing: { label: 'Preparando', color: 'bg-blue-100 text-blue-800', icon: ChefHat },
    ready: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  };

  const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card className={cn(
      "transition-all duration-300",
      order.status === 'pending' && waitingMinutes >= 10 && "ring-2 ring-red-500 animate-pulse"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header with table/delivery info and time */}
        <div className="flex items-center justify-between">
          {order.order_type === 'table' ? (
            <Badge variant="outline" className="text-lg font-bold px-3 py-1">
              <UtensilsCrossed className="h-4 w-4 mr-1" />
              Mesa {order.table_number}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-lg font-bold px-3 py-1 border-orange-500 text-orange-600">
              <Truck className="h-4 w-4 mr-1" />
              Delivery #{order.order_id}
            </Badge>
          )}
          <Badge className={cn("text-sm", getTimeColor())}>
            <Clock className="h-3 w-3 mr-1" />
            {waitingMinutes} min
          </Badge>
        </div>

        {/* Customer name for delivery */}
        {order.order_type === 'delivery' && order.customer_name && (
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{order.customer_name}</span>
          </p>
        )}

        {/* All products in this order */}
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{item.quantity}x</span>
                <span className="text-xl font-semibold text-foreground">{item.product_name}</span>
              </div>
              {item.observation && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
                  📝 {item.observation}
                </p>
              )}
              {index < order.items.length - 1 && (
                <div className="border-b border-border my-2" />
              )}
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge className={config.color}>
            <config.icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          {order.waiter_name && (
            <span className="text-xs text-muted-foreground">
              Garçom: {order.waiter_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && (
            <Button 
              className="flex-1 text-lg py-6"
              onClick={() => handleStatusChange('preparing')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="h-5 w-5 mr-2" />
                  Preparando
                </>
              )}
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button 
              className="flex-1 text-lg py-6 bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusChange('ready')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Pronto!
                </>
              )}
            </Button>
          )}
          {order.status === 'ready' && (
            <div className="flex-1 text-center py-4 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-green-700 font-medium">Aguardando retirada</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function to group items by order
export function groupItemsByOrder(items: KitchenItem[]): GroupedKitchenOrder[] {
  const grouped = new Map<string, GroupedKitchenOrder>();

  items.forEach(item => {
    // Create a unique key for each order
    const orderKey = item.order_type === 'table' 
      ? `table_${item.table_order_id}` 
      : `delivery_${item.order_id}`;

    if (!grouped.has(orderKey)) {
      grouped.set(orderKey, {
        orderKey,
        order_type: item.order_type,
        order_id: item.order_id,
        table_order_id: item.table_order_id,
        table_number: item.table_number,
        table_name: item.table_name,
        customer_name: item.customer_name,
        waiter_name: item.waiter_name,
        items: [],
        oldest_ordered_at: item.ordered_at,
        status: item.status,
      });
    }

    const group = grouped.get(orderKey)!;
    group.items.push(item);

    // Track oldest ordered_at
    if (new Date(item.ordered_at) < new Date(group.oldest_ordered_at)) {
      group.oldest_ordered_at = item.ordered_at;
    }

    // Determine group status (pending > preparing > ready)
    const statusPriority = { pending: 0, preparing: 1, ready: 2 };
    const itemPriority = statusPriority[item.status as keyof typeof statusPriority] ?? 0;
    const groupPriority = statusPriority[group.status as keyof typeof statusPriority] ?? 0;
    
    if (itemPriority < groupPriority) {
      group.status = item.status;
    }
  });

  // Sort by oldest_ordered_at
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(a.oldest_ordered_at).getTime() - new Date(b.oldest_ordered_at).getTime()
  );
}
