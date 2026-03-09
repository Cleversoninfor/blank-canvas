import { useState } from 'react';
import { Settings2, Plus, History } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { TableMap } from '@/components/pdv/TableMap';
import { OpenTableModal } from '@/components/pdv/OpenTableModal';
import { TableOrderScreen } from '@/components/pdv/TableOrderScreen';
import { TableCheckout } from '@/components/pdv/TableCheckout';
import { TableManagementModal } from '@/components/pdv/TableManagementModal';
import { OrderHistoryModal } from '@/components/pdv/OrderHistoryModal';
import { TableWithOrder, Table } from '@/types/pdv';
import { useTablesWithOrders } from '@/hooks/useTables';

type PDVView = 'map' | 'order' | 'checkout';

export default function PDV() {
  const [view, setView] = useState<PDVView>('map');
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  const [openTableModal, setOpenTableModal] = useState(false);
  const [tableToOpen, setTableToOpen] = useState<Table | null>(null);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { tables } = useTablesWithOrders();

  const handleTableClick = (table: TableWithOrder) => {
    if (table.status === 'available') {
      // Open the table
      setTableToOpen(table);
      setOpenTableModal(true);
    } else {
      // View/edit existing order
      setSelectedTable(table);
      setView('order');
    }
  };

  const handleOpenTableSuccess = (orderId: number) => {
    // Find the updated table data
    const updatedTable = tables.find(t => t.id === tableToOpen?.id);
    if (updatedTable) {
      setSelectedTable({
        ...updatedTable,
        current_order_id: orderId,
        status: 'occupied',
      });
      setView('order');
    }
    setTableToOpen(null);
  };

  const handleBackToMap = () => {
    setView('map');
    setSelectedTable(null);
  };

  const handleGoToCheckout = () => {
    setView('checkout');
  };

  const handleCheckoutSuccess = () => {
    handleBackToMap();
  };

  return (
    <AdminLayout title="PDV">
      {view === 'map' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa de Mesas</h1>
              <p className="text-muted-foreground">
                Gerencie mesas e pedidos do salão
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <Button variant="outline" onClick={() => setManagementModalOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
              <Button onClick={() => setManagementModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mesa
              </Button>
            </div>
          </div>

          {/* Table Map */}
          <TableMap
            onTableClick={handleTableClick}
            onAddTable={() => setManagementModalOpen(true)}
          />
        </div>
      )}

      {view === 'order' && selectedTable && (
        <TableOrderScreen
          table={selectedTable}
          onBack={handleBackToMap}
          onCheckout={handleGoToCheckout}
        />
      )}

      {view === 'checkout' && selectedTable && (
        <TableCheckout
          table={selectedTable}
          onBack={() => setView('order')}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Modals */}
      <OpenTableModal
        table={tableToOpen}
        open={openTableModal}
        onOpenChange={setOpenTableModal}
        onSuccess={handleOpenTableSuccess}
      />

      <TableManagementModal
        open={managementModalOpen}
        onOpenChange={setManagementModalOpen}
      />

      <OrderHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />
    </AdminLayout>
  );
}
