import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, FileText, Loader2, TrendingUp, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderReport {
  id: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  status: string;
  type: 'delivery' | 'table';
}

interface TableOrderReport {
  id: number;
  created_at: string | null;
  waiter_name: string | null;
  total_amount: number | null;
  payment_method: string | null;
  status: string | null;
  table_number?: number;
}

const AdminReports = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  // Fetch delivery orders
  const { data: deliveryOrders, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ['reports-delivery-orders', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch table orders
  const { data: tableOrders, isLoading: isLoadingTable } = useQuery({
    queryKey: ['reports-table-orders', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_orders')
        .select('*, tables(number)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((order: any) => ({
        ...order,
        table_number: order.tables?.number,
      })) as TableOrderReport[];
    },
  });

  const isLoading = isLoadingDelivery || isLoadingTable;

  // Combine and format reports
  const allReports = useMemo(() => {
    const deliveryReports: OrderReport[] = (deliveryOrders || []).map((order) => ({
      id: order.id,
      created_at: order.created_at,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      status: order.status,
      type: 'delivery' as const,
    }));

    const tableReports: OrderReport[] = (tableOrders || []).map((order) => ({
      id: order.id,
      created_at: order.created_at || '',
      customer_name: `Mesa ${order.table_number || '-'}`,
      customer_phone: order.waiter_name || '-',
      total_amount: order.total_amount || 0,
      payment_method: order.payment_method || '-',
      status: order.status || 'open',
      type: 'table' as const,
    }));

    return [...deliveryReports, ...tableReports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [deliveryOrders, tableOrders]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = allReports.length;
    const totalRevenue = allReports
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_amount, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveryCount = allReports.filter((o) => o.type === 'delivery').length;
    const tableCount = allReports.filter((o) => o.type === 'table').length;

    return { totalOrders, totalRevenue, avgTicket, deliveryCount, tableCount };
  }, [allReports]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      money: 'Dinheiro',
      card: 'Cartão',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      pix: 'PIX',
    };
    return methods[method] || method;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivering: 'Em entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
      open: 'Aberto',
      closed: 'Fechado',
      requesting_bill: 'Pedindo conta',
    };
    return statuses[status] || status;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        allReports.map((order) => ({
          'ID': order.id,
          'Data': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Tipo': order.type === 'delivery' ? 'Delivery' : 'Mesa',
          'Cliente/Mesa': order.customer_name,
          'Contato/Garçom': order.customer_phone,
          'Valor Total': formatCurrency(order.total_amount),
          'Pagamento': formatPaymentMethod(order.payment_method),
          'Status': formatStatus(order.status),
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
      
      const fileName = `relatorio-pedidos-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({ title: 'Relatório exportado!', description: fileName });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Relatório de Pedidos', 14, 22);
      
      // Date range
      doc.setFontSize(12);
      doc.text(
        `Período: ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`,
        14,
        32
      );

      // Stats
      doc.setFontSize(10);
      doc.text(`Total de Pedidos: ${stats.totalOrders}`, 14, 42);
      doc.text(`Faturamento: ${formatCurrency(stats.totalRevenue)}`, 14, 48);
      doc.text(`Ticket Médio: ${formatCurrency(stats.avgTicket)}`, 14, 54);

      // Table
      autoTable(doc, {
        startY: 62,
        head: [['ID', 'Data', 'Tipo', 'Cliente/Mesa', 'Valor', 'Pagamento', 'Status']],
        body: allReports.map((order) => [
          order.id,
          format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }),
          order.type === 'delivery' ? 'Delivery' : 'Mesa',
          order.customer_name,
          formatCurrency(order.total_amount),
          formatPaymentMethod(order.payment_method),
          formatStatus(order.status),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 152, 0] },
      });

      const fileName = `relatorio-pedidos-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.pdf`;
      doc.save(fileName);

      toast({ title: 'Relatório exportado!', description: fileName });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const setDateRange = (range: 'today' | 'week' | 'month' | 'lastMonth') => {
    const today = new Date();
    switch (range) {
      case 'today':
        setStartDate(new Date(today.setHours(0, 0, 0, 0)));
        setEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(new Date(weekStart.setHours(0, 0, 0, 0)));
        setEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
    }
  };

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">
        {/* Date Filters */}
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Filtrar por Período
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setDateRange('today')}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('week')}>
              Esta Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('month')}>
              Este Mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('lastMonth')}>
              Mês Passado
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Total de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.deliveryCount} delivery • {stats.tableCount} mesa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.avgTicket)}</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exportar</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToExcel}
                disabled={isExporting || isLoading}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToPDF}
                disabled={isExporting || isLoading}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Lista de Pedidos</h3>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum pedido encontrado no período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">ID</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cliente/Mesa</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Valor</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pagamento</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allReports.slice(0, 100).map((order) => (
                    <tr key={`${order.type}-${order.id}`} className="hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium text-foreground">#{order.id}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          order.type === 'delivery' 
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary/20 text-secondary"
                        )}>
                          {order.type === 'delivery' ? 'Delivery' : 'Mesa'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-foreground">{order.customer_name}</td>
                      <td className="p-3 text-sm font-medium text-primary">{formatCurrency(order.total_amount)}</td>
                      <td className="p-3 text-sm text-muted-foreground">{formatPaymentMethod(order.payment_method)}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          order.status === 'delivered' || order.status === 'closed' 
                            ? "bg-secondary/20 text-secondary"
                            : order.status === 'cancelled'
                            ? "bg-destructive/20 text-destructive"
                            : "bg-accent text-accent-foreground"
                        )}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allReports.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                  Mostrando 100 de {allReports.length} pedidos. Exporte para ver todos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
