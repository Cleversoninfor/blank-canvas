import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, FileText, Loader2, TrendingUp, Clock, DollarSign, Calendar, Truck, ArrowLeft, PackageCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDrivers } from '@/hooks/useDrivers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DriverDelivery {
  id: number;
  created_at: string;
  updated_at: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  driver_id: string;
  driver_name: string | null;
}

const DEFAULT_COMMISSION_RATE = 0.05; // 5% commission

const AdminDriverReports = () => {
  const { toast } = useToast();
  const { data: drivers, isLoading: isLoadingDrivers } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  const selectedDriver = useMemo(
    () => drivers?.find((d) => d.id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  const { data: deliveries, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['driver-report', selectedDriverId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', selectedDriverId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DriverDelivery[];
    },
    enabled: !!selectedDriverId,
  });

  const isLoading = isLoadingDrivers || isLoadingDeliveries;

  const commissionRate = useMemo(() => {
    if (selectedDriver?.commission_percentage != null) {
      return selectedDriver.commission_percentage / 100;
    }
    return DEFAULT_COMMISSION_RATE;
  }, [selectedDriver]);

  const stats = useMemo(() => {
    if (!deliveries || deliveries.length === 0) {
      return { totalDeliveries: 0, avgTime: 0, totalCommission: 0, totalReceived: 0 };
    }

    const totalDeliveries = deliveries.length;
    const completed = deliveries.filter((d) => d.status === 'completed');

    const timeDiffs = completed
      .map((d) => differenceInMinutes(new Date(d.updated_at), new Date(d.created_at)))
      .filter((t) => t > 0);
    const avgTime = timeDiffs.length > 0 ? Math.round(timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length) : 0;

    const totalReceived = completed.reduce((sum, d) => sum + d.total_amount, 0);
    const totalCommission = totalReceived * commissionRate;

    return { totalDeliveries, avgTime, totalCommission, totalReceived };
  }, [deliveries, commissionRate]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      money: 'Dinheiro', card: 'Cartão', credit: 'Crédito', debit: 'Débito', pix: 'PIX',
    };
    return methods[method] || method;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto',
      delivery: 'Em entrega', delivered: 'Entregue', completed: 'Finalizado', cancelled: 'Cancelado',
    };
    return statuses[status] || status;
  };

  const getDeliveryTime = (d: DriverDelivery) => {
    const mins = differenceInMinutes(new Date(d.updated_at), new Date(d.created_at));
    return mins > 0 && mins < 300 ? `${mins} min` : '-';
  };

  const getCommission = (d: DriverDelivery) => d.total_amount * commissionRate;

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

  const canExport = !!selectedDriverId && !!deliveries && deliveries.length > 0;

  const exportToPDF = async () => {
    if (!canExport || !selectedDriver) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const now = new Date();

      // Header
      doc.setFontSize(18);
      doc.text('Relatório de Entregador', 14, 22);

      doc.setFontSize(11);
      doc.text(`Entregador: ${selectedDriver.name}`, 14, 32);
      doc.text(`Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`, 14, 38);
      doc.text(`Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 44);

      // Stats
      doc.setFontSize(10);
      doc.text(`Total de Entregas: ${stats.totalDeliveries}`, 14, 54);
      doc.text(`Tempo Médio: ${stats.avgTime} min`, 14, 60);
      doc.text(`Total de Comissões: ${formatCurrency(stats.totalCommission)}`, 14, 66);
      doc.text(`Valor Total Recebido: ${formatCurrency(stats.totalReceived)}`, 14, 72);

      // Table
      autoTable(doc, {
        startY: 80,
        head: [['Data', 'Cliente', 'Tempo de Entrega', 'Valor Comissão']],
        body: deliveries!.map((d) => [
          format(new Date(d.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          d.customer_name,
          getDeliveryTime(d),
          formatCurrency(getCommission(d)),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 152, 0] },
        foot: [['', '', 'TOTAL', formatCurrency(stats.totalCommission)]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        },
      });

      const fileName = `relatorio-entregador-${selectedDriver.name.replace(/\s+/g, '-')}-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF exportado!', description: fileName });
    } catch {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    if (!canExport || !selectedDriver) return;
    setIsExporting(true);
    try {
      // Sheet 1: Summary
      const summaryData = [
        { Campo: 'Entregador', Valor: selectedDriver.name },
        { Campo: 'Período', Valor: `${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}` },
        { Campo: 'Total de Entregas', Valor: String(stats.totalDeliveries) },
        { Campo: 'Tempo Médio', Valor: `${stats.avgTime} min` },
        { Campo: 'Total de Comissão', Valor: formatCurrency(stats.totalCommission) },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);

      // Sheet 2: Details
      const detailData = deliveries!.map((d) => ({
        Data: format(new Date(d.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        Cliente: d.customer_name,
        'Tempo de Entrega': getDeliveryTime(d),
        'Valor Comissão': formatCurrency(getCommission(d)),
        Status: formatStatus(d.status),
      }));
      const detailSheet = XLSX.utils.json_to_sheet(detailData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalhado');

      const fileName = `relatorio-entregador-${selectedDriver.name.replace(/\s+/g, '-')}-${format(startDate, 'dd-MM-yyyy')}-a-${format(endDate, 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast({ title: 'Excel exportado!', description: fileName });
    } catch {
      toast({ title: 'Erro ao exportar Excel', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout title="Relatório de Entregadores">
      <div className="space-y-6">
        {/* Driver Selector + Date Filters */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Selecionar Entregador e Período
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Entregador</label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um entregador" />
                </SelectTrigger>
                <SelectContent>
                  {(drivers || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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

        {!selectedDriverId ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Selecione um entregador para visualizar o relatório.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !deliveries || deliveries.length === 0 ? (
          <div className="text-center py-12">
            <PackageCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma entrega encontrada no período selecionado.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" /> Entregas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{stats.totalDeliveries}</p>
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Comissões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalCommission)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalReceived)}</p>
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

            {/* Table */}
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Entregas de {selectedDriver?.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tempo</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Comissão</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pagamento</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/50">
                        <td className="p-3 text-sm text-muted-foreground">
                          {format(new Date(d.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </td>
                        <td className="p-3 text-sm text-foreground">{d.customer_name}</td>
                        <td className="p-3 text-sm text-foreground">{getDeliveryTime(d)}</td>
                        <td className="p-3 text-sm font-medium text-primary">{formatCurrency(getCommission(d))}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatPaymentMethod(d.payment_method)}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            d.status === 'completed' || d.status === 'delivered'
                              ? "bg-secondary/20 text-secondary"
                              : d.status === 'cancelled'
                              ? "bg-destructive/20 text-destructive"
                              : "bg-accent text-accent-foreground"
                          )}>
                            {formatStatus(d.status)}
                          </span>
                        </td>
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

export default AdminDriverReports;
