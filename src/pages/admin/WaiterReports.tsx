import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, FileText, Loader2, TrendingUp, Clock, DollarSign, Calendar, Users, PackageCheck, ShoppingBag } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WaiterOrder {
  id: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  opened_at: string | null;
  total_amount: number;
  payment_method: string | null;
  status: string;
  waiter_id: string;
  waiter_name: string | null;
  customer_names: string[] | null;
  customer_count: number | null;
}

const AdminWaiterReports = () => {
  const { toast } = useToast();
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  const { data: waiters, isLoading: isLoadingWaiters } = useQuery({
    queryKey: ['waiters-for-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('waiters').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedWaiter = useMemo(
    () => waiters?.find((w) => w.id === selectedWaiterId),
    [waiters, selectedWaiterId]
  );

  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['waiter-report', selectedWaiterId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_orders')
        .select('*')
        .eq('waiter_id', selectedWaiterId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WaiterOrder[];
    },
    enabled: !!selectedWaiterId,
  });

  const isLoading = isLoadingWaiters || isLoadingOrders;

  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { totalOrders: 0, totalSales: 0, avgTicket: 0, avgTime: 0 };
    }

    const closed = orders.filter((o) => o.status === 'closed' || o.status === 'paid');
    const totalOrders = closed.length;
    const totalSales = closed.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    const times = closed
      .filter((o) => o.opened_at && (o.closed_at || o.updated_at))
      .map((o) => differenceInMinutes(new Date(o.closed_at || o.updated_at), new Date(o.opened_at!)))
      .filter((t) => t > 0 && t < 600);
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    return { totalOrders, totalSales, avgTicket, avgTime };
  }, [orders]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return '-';
    const methods: Record<string, string> = {
      money: 'Dinheiro', card: 'Cartão', credit: 'Crédito', debit: 'Débito', pix: 'PIX',
    };
    return methods[method] || method;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, string> = {
      open: 'Aberta', closed: 'Fechada', paid: 'Paga', requesting_bill: 'Pedindo Conta', cancelled: 'Cancelada',
    };
    return statuses[status] || status;
  };

  const getServiceTime = (o: WaiterOrder) => {
    if (!o.opened_at) return '-';
    const end = o.closed_at || o.updated_at;
    const mins = differenceInMinutes(new Date(end), new Date(o.opened_at));
    return mins > 0 && mins < 600 ? `${mins} min` : '-';
  };

  const getCustomerDisplay = (o: WaiterOrder) => {
    if (o.customer_names && o.customer_names.length > 0) return o.customer_names.join(', ');
    return `${o.customer_count || 1} cliente(s)`;
  };

  const setDateRange = (range: 'today' | 'week' | 'month' | 'lastMonth') => {
    const today = new Date();
    switch (range) {
      case 'today':
        setStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
        setEndDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
        break;
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(new Date(weekStart.setHours(0, 0, 0, 0)));
        setEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
        break;
      }
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'lastMonth': {
        const lm = subMonths(today, 1);
        setStartDate(startOfMonth(lm));
        setEndDate(endOfMonth(lm));
        break;
      }
    }
  };

  const canExport = !!selectedWaiterId && !!orders && orders.length > 0;

  const exportToPDF = async () => {
    if (!canExport || !selectedWaiter) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const now = new Date();

      doc.setFontSize(18);
      doc.text('Relatório de Garçom', 14, 22);

      doc.setFontSize(11);
      doc.text(`Garçom: ${selectedWaiter.name}`, 14, 32);
      doc.text(`Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`, 14, 38);
      doc.text(`Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 44);

      doc.setFontSize(10);
      doc.text(`Total de Pedidos: ${stats.totalOrders}`, 14, 54);
      doc.text(`Total de Vendas: ${formatCurrency(stats.totalSales)}`, 14, 60);
      doc.text(`Ticket Médio: ${formatCurrency(stats.avgTicket)}`, 14, 66);
      doc.text(`Tempo Médio de Atendimento: ${stats.avgTime} min`, 14, 72);

      autoTable(doc, {
        startY: 80,
        head: [['Data', 'Pedido', 'Cliente', 'Valor', 'Pagamento', 'Status']],
        body: orders!.map((o) => [
          format(new Date(o.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          `#${o.id}`,
          getCustomerDisplay(o),
          formatCurrency(o.total_amount || 0),
          formatPaymentMethod(o.payment_method),
          formatStatus(o.status),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [76, 175, 80] },
        foot: [['', '', '', formatCurrency(stats.totalSales), '', '']],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        },
      });

      const fileName = `relatorio-garcom-${selectedWaiter.name.replace(/\s+/g, '-')}-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF exportado!', description: fileName });
    } catch {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    if (!canExport || !selectedWaiter) return;
    setIsExporting(true);
    try {
      const summaryData = [
        { Campo: 'Garçom', Valor: selectedWaiter.name },
        { Campo: 'Período', Valor: `${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}` },
        { Campo: 'Total de Pedidos', Valor: String(stats.totalOrders) },
        { Campo: 'Total de Vendas', Valor: formatCurrency(stats.totalSales) },
        { Campo: 'Ticket Médio', Valor: formatCurrency(stats.avgTicket) },
        { Campo: 'Tempo Médio', Valor: `${stats.avgTime} min` },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);

      const detailData = orders!.map((o) => ({
        Data: format(new Date(o.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        Pedido: `#${o.id}`,
        Cliente: getCustomerDisplay(o),
        Valor: formatCurrency(o.total_amount || 0),
        Pagamento: formatPaymentMethod(o.payment_method),
        Status: formatStatus(o.status),
      }));
      const detailSheet = XLSX.utils.json_to_sheet(detailData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalhado');

      const fileName = `relatorio-garcom-${selectedWaiter.name.replace(/\s+/g, '-')}-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast({ title: 'Excel exportado!', description: fileName });
    } catch {
      toast({ title: 'Erro ao exportar Excel', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout title="Relatório de Garçons">
      <div className="space-y-6">
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Selecionar Garçom e Período
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Garçom</label>
              <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um garçom" />
                </SelectTrigger>
                <SelectContent>
                  {(waiters || []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDateRange('today')}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('week')}>Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('month')}>Este Mês</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange('lastMonth')}>Mês Passado</Button>
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
                  <CalendarComponent mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
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
                  <CalendarComponent mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {!selectedWaiterId ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Selecione um garçom para visualizar o relatório.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <PackageCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pedido encontrado no período selecionado.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalSales)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.avgTicket)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Tempo Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{stats.avgTime} min</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Exportar</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting} className="flex-1">
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel} disabled={isExporting} className="flex-1">
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Pedidos de {selectedWaiter?.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pedido</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pagamento</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tempo</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/50">
                        <td className="p-3 text-sm text-muted-foreground">
                          {format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </td>
                        <td className="p-3 text-sm font-medium text-foreground">#{o.id}</td>
                        <td className="p-3 text-sm text-foreground">{getCustomerDisplay(o)}</td>
                        <td className="p-3 text-sm font-medium text-primary">{formatCurrency(o.total_amount || 0)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatPaymentMethod(o.payment_method)}</td>
                        <td className="p-3 text-sm text-foreground">{getServiceTime(o)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatStatus(o.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWaiterReports;
