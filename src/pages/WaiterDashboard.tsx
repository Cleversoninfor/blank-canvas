import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  LogOut, 
  Bell, 
  Filter,
  ChevronLeft,
  Loader2,
  ArrowLeft,
  ChefHat,
  CheckCircle,
  UtensilsCrossed,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WaiterTableCard } from '@/components/waiter/WaiterTableCard';
import { TableOrderScreen } from '@/components/pdv/TableOrderScreen';
import { TableCheckout } from '@/components/pdv/TableCheckout';
import { OpenTableModal } from '@/components/pdv/OpenTableModal';
import { useTablesWithOrders } from '@/hooks/useTables';
import { useWaiterReadyItems, KitchenItem } from '@/hooks/useKitchenItems';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { TableWithOrder, TableStatus } from '@/types/pdv';

type StatusFilter = 'all' | 'available' | 'occupied' | 'requesting_bill';
type MainTab = 'tables' | 'kitchen';
type WaiterView = 'tables' | 'order' | 'checkout';

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { data: store } = useStoreConfig();
  const { tables, isLoading } = useTablesWithOrders();
  const { items: readyItems, finalizeItem } = useWaiterReadyItems();
  
  const [view, setView] = useState<WaiterView>('tables');
  const [mainTab, setMainTab] = useState<MainTab>('tables');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  const [openTableModal, setOpenTableModal] = useState(false);
  const [tableToOpen, setTableToOpen] = useState<TableWithOrder | null>(null);
  const [readyItemsOpen, setReadyItemsOpen] = useState(false);
  const [finalizingItems, setFinalizingItems] = useState<Set<string>>(new Set());

  // Group ready items by table/order for grouped display
  const groupedReadyItems = readyItems.reduce((acc, item) => {
    // Use different keys for table vs delivery orders
    const key = item.order_type === 'table' 
      ? `table-${item.table_order_id || item.table_number || 0}`
      : `delivery-${item.order_id || 0}`;
    
    if (!acc[key]) {
      acc[key] = {
        order_type: item.order_type,
        table_number: item.table_number,
        table_name: item.table_name,
        waiter_name: item.waiter_name,
        customer_name: item.customer_name,
        order_id: item.order_id,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { 
    order_type: 'table' | 'delivery'; 
    table_number: number | null; 
    table_name: string | null; 
    waiter_name: string | null; 
    customer_name?: string;
    order_id: number | null;
    items: KitchenItem[] 
  }>);

  const handleFinalizeItem = async (item: KitchenItem) => {
    setFinalizingItems(prev => new Set(prev).add(item.id));
    try {
      await finalizeItem(item);
    } finally {
      setFinalizingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleFinalizeAllFromGroup = async (items: KitchenItem[]) => {
    const ids = items.map(i => i.id);
    ids.forEach(id => setFinalizingItems(prev => new Set(prev).add(id)));
    try {
      // Finalize items sequentially to ensure order status updates correctly
      for (const item of items) {
        await finalizeItem(item);
      }
    } finally {
      setFinalizingItems(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  useTheme();
  usePWAConfig();
  // Get waiter info from localStorage
  const waiterId = localStorage.getItem('waiter_id');
  const waiterName = localStorage.getItem('waiter_name');

  useEffect(() => {
    if (!waiterId || !waiterName) {
      navigate('/waiter');
    }
  }, [waiterId, waiterName, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('waiter_id');
    localStorage.removeItem('waiter_name');
    navigate('/waiter');
  };

  const handleTableClick = (table: TableWithOrder) => {
    if (table.status === 'available') {
      setTableToOpen(table);
      setOpenTableModal(true);
    } else {
      setSelectedTable(table);
      setView('order');
    }
  };

  const handleBackToTables = () => {
    setView('tables');
    setSelectedTable(null);
  };

  const handleGoToCheckout = () => {
    setView('checkout');
  };

  const handleCheckoutSuccess = () => {
    setView('tables');
    setSelectedTable(null);
  };


  // Filter tables
  const filteredTables = tables
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .sort((a, b) => a.number - b.number);

  // Count ready items per table for notifications
  const readyItemsByTable = readyItems.reduce((acc, item) => {
    acc[item.table_number] = (acc[item.table_number] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Stats
  const available = tables.filter(t => t.status === 'available').length;
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const requestingBill = tables.filter(t => t.status === 'requesting_bill').length;

  // Order view
  if (view === 'order' && selectedTable) {
    return (
      <>
        <Helmet>
          <title>{`Mesa ${selectedTable.number} - Garçom`}</title>
        </Helmet>
        
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToTables}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-foreground">Mesa {selectedTable.number}</h1>
          </header>

          <div className="p-4">
            <TableOrderScreen 
              table={selectedTable} 
              onBack={handleBackToTables}
              onCheckout={handleGoToCheckout}
            />
          </div>
        </div>
      </>
    );
  }

  // Checkout view
  if (view === 'checkout' && selectedTable) {
    return (
      <>
        <Helmet>
          <title>{`Fechar Mesa ${selectedTable.number} - Garçom`}</title>
        </Helmet>
        
        <div className="min-h-screen bg-background">
          <div className="p-4">
            <TableCheckout 
              table={selectedTable}
              onBack={() => setView('order')}
              onSuccess={handleCheckoutSuccess}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Painel Garçom - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground">Olá, {waiterName}!</h1>
              <p className="text-sm text-muted-foreground">{store?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Ready items notification */}
              <Sheet open={readyItemsOpen} onOpenChange={setReadyItemsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {readyItems.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-green-500 text-white">
                        {readyItems.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Itens Prontos para Entregar</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    {readyItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum item pronto no momento
                      </p>
                    ) : (
                      readyItems.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-accent rounded-lg border border-border"
                        >
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {item.order_type === 'table' 
                                ? `Mesa ${item.table_number}`
                                : `Pedido #${item.order_id}`}
                            </Badge>
                            <p className="font-medium">
                              {item.quantity}x {item.product_name}
                            </p>
                            {item.observation && (
                              <p className="text-xs text-muted-foreground">
                                {item.observation}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleFinalizeItem(item)}
                            disabled={finalizingItems.has(item.id)}
                          >
                            {finalizingItems.has(item.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Entregue'
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </header>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="flex items-center gap-2 relative">
              <ChefHat className="h-4 w-4" />
              Pedidos na Cozinha
              {readyItems.length > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-green-600 text-white text-xs">
                  {readyItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables" className="mt-0">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 p-4">
              <div className="bg-green-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{available}</p>
                <p className="text-xs text-green-600">Livres</p>
              </div>
              <div className="bg-amber-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{occupied}</p>
                <p className="text-xs text-amber-600">Ocupadas</p>
              </div>
              <div className="bg-red-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{requestingBill}</p>
                <p className="text-xs text-red-600">Conta</p>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <ToggleGroup 
                  type="single" 
                  value={statusFilter} 
                  onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
                >
                  <ToggleGroupItem value="all" className="text-xs px-3">
                    Todas
                  </ToggleGroupItem>
                  <ToggleGroupItem value="available" className="text-xs px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-700">
                    Livres
                  </ToggleGroupItem>
                  <ToggleGroupItem value="occupied" className="text-xs px-3 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700">
                    Ocupadas
                  </ToggleGroupItem>
                  <ToggleGroupItem value="requesting_bill" className="text-xs px-3 data-[state=on]:bg-red-100 data-[state=on]:text-red-700">
                    Conta
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="px-4 pb-6">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  Nenhuma mesa encontrada
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredTables.map((table) => (
                    <WaiterTableCard
                      key={table.id}
                      table={table}
                      onClick={() => handleTableClick(table)}
                      readyItemsCount={readyItemsByTable[table.number] || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Kitchen Orders Tab */}
          <TabsContent value="kitchen" className="mt-0 p-4">
            {Object.keys(groupedReadyItems).length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-xl text-muted-foreground">Nenhum pedido pronto</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Quando a cozinha marcar itens como prontos, eles aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedReadyItems).map(([key, group]) => (
                  <Card key={key} className="border-2 border-primary/30 bg-accent">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-lg font-bold px-3 py-1 border-primary text-primary">
                          {group.order_type === 'table' ? (
                            <>
                              <UtensilsCrossed className="h-4 w-4 mr-1" />
                              Mesa {group.table_number}
                            </>
                          ) : (
                            <>
                              <Truck className="h-4 w-4 mr-1" />
                              Pedido #{group.order_id}
                            </>
                          )}
                        </Badge>
                        <Badge className="bg-primary text-primary-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pronto
                        </Badge>
                      </div>

                      {/* Customer info for delivery */}
                      {group.order_type === 'delivery' && group.customer_name && (
                        <p className="text-sm text-muted-foreground">
                          👤 {group.customer_name}
                        </p>
                      )}

                      {/* Items */}
                      <div className="space-y-2">
                        {group.items.map((item, index) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-foreground">{item.quantity}x</span>
                                <span className="text-lg font-semibold text-foreground">{item.product_name}</span>
                              </div>
                              {group.order_type === 'table' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-primary text-primary hover:bg-primary/10"
                                  onClick={() => handleFinalizeItem(item)}
                                  disabled={finalizingItems.has(item.id)}
                                >
                                  {finalizingItems.has(item.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Finalizar'
                                  )}
                                </Button>
                              )}
                            </div>
                            {item.observation && (
                              <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg">
                                📝 {item.observation}
                              </p>
                            )}
                            {index < group.items.length - 1 && (
                              <div className="border-b border-border my-2" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Finalize all button */}
                      {(group.items.length > 1 || group.order_type === 'delivery') && (
                        <Button
                          className="w-full"
                          onClick={() => handleFinalizeAllFromGroup(group.items)}
                          disabled={group.items.some(i => finalizingItems.has(i.id))}
                        >
                          {group.items.some(i => finalizingItems.has(i.id)) ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          {group.order_type === 'delivery' 
                            ? 'Saiu para Entrega' 
                            : `Finalizar Todos (${group.items.length} itens)`}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Open Table Modal */}
      {tableToOpen && (
        <OpenTableModal
          table={tableToOpen}
          open={openTableModal}
          onOpenChange={(open) => {
            setOpenTableModal(open);
            if (!open) setTableToOpen(null);
          }}
          onTableOpened={(table) => {
            setOpenTableModal(false);
            setTableToOpen(null);
            setSelectedTable(table);
          }}
          defaultWaiterId={waiterId || undefined}
          defaultWaiterName={waiterName || undefined}
        />
      )}
    </>
  );
}
