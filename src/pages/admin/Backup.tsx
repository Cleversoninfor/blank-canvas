import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Download, 
  Upload, 
  Loader2, 
  Database, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle,
  ShoppingBag,
  Tag,
  Users,
  MapPin,
  Clock,
  Ticket,
  PlusCircle,
  Settings,
  Package,
  ClipboardList,
  UserCog
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupData {
  version: string;
  created_at: string;
  store_config: any;
  categories: any[];
  products: any[];
  addon_groups: any[];
  addon_options: any[];
  product_addon_groups: any[];
  coupons: any[];
  delivery_zones: any[];
  business_hours: any[];
  waiters: any[];
  tables: any[];
  // New fields for complete backup
  orders: any[];
  order_items: any[];
  table_orders: any[];
  table_order_items: any[];
  user_roles: any[];
  customer_addresses: any[];
}

const AdminBackup = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);

  const tables = [
    { name: 'store_config', label: 'Configurações da Loja', icon: Settings },
    { name: 'categories', label: 'Categorias', icon: Tag },
    { name: 'products', label: 'Produtos', icon: ShoppingBag },
    { name: 'addon_groups', label: 'Grupos de Acréscimos', icon: PlusCircle },
    { name: 'addon_options', label: 'Opções de Acréscimos', icon: PlusCircle },
    { name: 'product_addon_groups', label: 'Vínculos Produto-Acréscimo', icon: PlusCircle },
    { name: 'coupons', label: 'Cupons', icon: Ticket },
    { name: 'delivery_zones', label: 'Zonas de Entrega', icon: MapPin },
    { name: 'business_hours', label: 'Horários de Funcionamento', icon: Clock },
    { name: 'waiters', label: 'Garçons', icon: Users },
    { name: 'tables', label: 'Mesas', icon: Database },
    { name: 'orders', label: 'Pedidos Delivery', icon: Package },
    { name: 'order_items', label: 'Itens dos Pedidos', icon: ClipboardList },
    { name: 'table_orders', label: 'Comandas de Mesa', icon: ClipboardList },
    { name: 'table_order_items', label: 'Itens das Comandas', icon: ClipboardList },
    { name: 'user_roles', label: 'Permissões de Usuário', icon: UserCog },
    { name: 'customer_addresses', label: 'Endereços de Clientes', icon: MapPin },
  ];

  const exportBackup = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      const backup: BackupData = {
        version: '2.0',
        created_at: new Date().toISOString(),
        store_config: null,
        categories: [],
        products: [],
        addon_groups: [],
        addon_options: [],
        product_addon_groups: [],
        coupons: [],
        delivery_zones: [],
        business_hours: [],
        waiters: [],
        tables: [],
        orders: [],
        order_items: [],
        table_orders: [],
        table_order_items: [],
        user_roles: [],
        customer_addresses: [],
      };

      const totalTables = tables.length;
      let completed = 0;

      // Fetch store_config
      const { data: storeConfig } = await supabase
        .from('store_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      backup.store_config = storeConfig;
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch categories
      const { data: categories } = await supabase.from('categories').select('*');
      backup.categories = categories || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch products
      const { data: products } = await supabase.from('products').select('*');
      backup.products = products || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch addon_groups
      const { data: addonGroups } = await supabase.from('addon_groups').select('*');
      backup.addon_groups = addonGroups || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch addon_options
      const { data: addonOptions } = await supabase.from('addon_options').select('*');
      backup.addon_options = addonOptions || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch product_addon_groups
      const { data: productAddonGroups } = await supabase.from('product_addon_groups').select('*');
      backup.product_addon_groups = productAddonGroups || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch coupons
      const { data: coupons } = await supabase.from('coupons').select('*');
      backup.coupons = coupons || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch delivery_zones
      const { data: deliveryZones } = await supabase.from('delivery_zones').select('*');
      backup.delivery_zones = deliveryZones || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch business_hours
      const { data: businessHours } = await supabase.from('business_hours').select('*');
      backup.business_hours = businessHours || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch waiters
      const { data: waiters } = await supabase.from('waiters').select('*');
      backup.waiters = waiters || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch tables
      const { data: tablesData } = await supabase.from('tables').select('*');
      backup.tables = tablesData || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch orders (delivery)
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      backup.orders = orders || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch order_items
      const { data: orderItems } = await supabase.from('order_items').select('*');
      backup.order_items = orderItems || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch table_orders (comandas)
      const { data: tableOrders } = await supabase.from('table_orders').select('*').order('created_at', { ascending: false });
      backup.table_orders = tableOrders || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch table_order_items
      const { data: tableOrderItems } = await supabase.from('table_order_items').select('*');
      backup.table_order_items = tableOrderItems || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch user_roles
      const { data: userRoles } = await supabase.from('user_roles').select('*');
      backup.user_roles = userRoles || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Fetch customer_addresses
      const { data: customerAddresses } = await supabase.from('customer_addresses').select('*');
      backup.customer_addresses = customerAddresses || [];
      completed++;
      setProgress((completed / totalTables) * 100);

      // Download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-completo-${format(new Date(), 'yyyy-MM-dd-HH-mm', { locale: ptBR })}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup completo exportado!',
        description: `${backup.products.length} produtos, ${backup.orders.length} pedidos, ${backup.table_orders.length} comandas exportados.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erro ao exportar backup',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo .json de backup.',
        variant: 'destructive',
      });
      return;
    }

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        if (!data.version || !data.created_at) {
          throw new Error('Invalid backup format');
        }
        setPreviewData(data);
      } catch {
        toast({
          title: 'Arquivo inválido',
          description: 'O arquivo não é um backup válido.',
          variant: 'destructive',
        });
        setImportFile(null);
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  const importBackup = async () => {
    if (!previewData) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const totalSteps = 17;
      let completed = 0;

      // 1. Clear existing data and import in order (respecting foreign keys)
      
      // Delete in reverse dependency order
      await supabase.from('table_order_items').delete().neq('id', '');
      await supabase.from('table_orders').delete().gte('id', 0);
      await supabase.from('order_items').delete().neq('id', '');
      await supabase.from('orders').delete().gte('id', 0);
      await supabase.from('product_addon_groups').delete().neq('id', '');
      await supabase.from('addon_options').delete().neq('id', '');
      await supabase.from('addon_groups').delete().neq('id', '');
      await supabase.from('products').delete().neq('id', '');
      await supabase.from('categories').delete().neq('id', '');
      await supabase.from('coupons').delete().neq('id', '');
      await supabase.from('delivery_zones').delete().neq('id', '');
      await supabase.from('business_hours').delete().neq('id', '');
      await supabase.from('waiters').delete().neq('id', '');
      await supabase.from('tables').delete().neq('id', '');
      await supabase.from('customer_addresses').delete().neq('id', '');

      // 2. Update store_config
      if (previewData.store_config) {
        const { id, ...configWithoutId } = previewData.store_config;
        await supabase.from('store_config').update(configWithoutId).eq('id', id);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 3. Import categories
      if (previewData.categories?.length > 0) {
        await supabase.from('categories').insert(previewData.categories);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 4. Import products
      if (previewData.products?.length > 0) {
        await supabase.from('products').insert(previewData.products);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 5. Import addon_groups
      if (previewData.addon_groups?.length > 0) {
        await supabase.from('addon_groups').insert(previewData.addon_groups);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 6. Import addon_options
      if (previewData.addon_options?.length > 0) {
        await supabase.from('addon_options').insert(previewData.addon_options);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 7. Import product_addon_groups
      if (previewData.product_addon_groups?.length > 0) {
        await supabase.from('product_addon_groups').insert(previewData.product_addon_groups);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 8. Import coupons
      if (previewData.coupons?.length > 0) {
        await supabase.from('coupons').insert(previewData.coupons);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 9. Import delivery_zones
      if (previewData.delivery_zones?.length > 0) {
        await supabase.from('delivery_zones').insert(previewData.delivery_zones);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 10. Import business_hours
      if (previewData.business_hours?.length > 0) {
        await supabase.from('business_hours').insert(previewData.business_hours);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 11. Import waiters
      if (previewData.waiters?.length > 0) {
        await supabase.from('waiters').insert(previewData.waiters);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 12. Import tables
      if (previewData.tables?.length > 0) {
        // Remove current_order_id to avoid FK issues
        const tablesWithoutOrders = previewData.tables.map(({ current_order_id, ...rest }) => rest);
        await supabase.from('tables').insert(tablesWithoutOrders);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 13. Import orders (delivery)
      if (previewData.orders?.length > 0) {
        await supabase.from('orders').insert(previewData.orders);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 14. Import order_items
      if (previewData.order_items?.length > 0) {
        await supabase.from('order_items').insert(previewData.order_items);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 15. Import table_orders
      if (previewData.table_orders?.length > 0) {
        await supabase.from('table_orders').insert(previewData.table_orders);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 16. Import table_order_items
      if (previewData.table_order_items?.length > 0) {
        await supabase.from('table_order_items').insert(previewData.table_order_items);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      // 17. Import customer_addresses
      if (previewData.customer_addresses?.length > 0) {
        await supabase.from('customer_addresses').insert(previewData.customer_addresses);
      }
      completed++;
      setProgress((completed / totalSteps) * 100);

      toast({
        title: 'Backup completo importado!',
        description: 'Todos os dados foram restaurados, incluindo pedidos e comandas.',
      });

      setImportFile(null);
      setPreviewData(null);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erro ao importar backup',
        description: 'Alguns dados podem não ter sido importados. Verifique o console.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const cancelImport = () => {
    setImportFile(null);
    setPreviewData(null);
  };

  return (
    <AdminLayout title="Backup">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Backup do Sistema</h2>
          <p className="text-muted-foreground mt-1">
            Exporte ou importe todos os dados cadastrais do sistema
          </p>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar Backup
            </CardTitle>
            <CardDescription>
              Gera um arquivo JSON com todas as configurações, produtos, categorias e demais dados cadastrais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2"
                >
                  <table.icon className="h-4 w-4" />
                  <span>{table.label}</span>
                </div>
              ))}
            </div>

            {isExporting && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Exportando... {Math.round(progress)}%
                </p>
              </div>
            )}

            <Button
              onClick={exportBackup}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Backup
            </CardTitle>
            <CardDescription>
              Restaure os dados a partir de um arquivo de backup exportado anteriormente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção!</AlertTitle>
              <AlertDescription>
                A importação irá <strong>substituir todos os dados existentes</strong> pelos dados do backup, incluindo pedidos e comandas.
              </AlertDescription>
            </Alert>

            {!previewData ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Selecione um arquivo .json de backup
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Arquivo selecionado: {importFile?.name}</AlertTitle>
                  <AlertDescription>
                    Backup v{previewData.version} criado em {format(new Date(previewData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h4 className="font-medium text-foreground">Dados do backup:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Categorias</span>
                      <span className="font-medium">{previewData.categories?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Produtos</span>
                      <span className="font-medium">{previewData.products?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Acréscimos</span>
                      <span className="font-medium">{previewData.addon_groups?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Cupons</span>
                      <span className="font-medium">{previewData.coupons?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Zonas de Entrega</span>
                      <span className="font-medium">{previewData.delivery_zones?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Garçons</span>
                      <span className="font-medium">{previewData.waiters?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Mesas</span>
                      <span className="font-medium">{previewData.tables?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Horários</span>
                      <span className="font-medium">{previewData.business_hours?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border-2 border-primary/30">
                      <span className="text-muted-foreground">Pedidos Delivery</span>
                      <span className="font-medium text-primary">{previewData.orders?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border-2 border-primary/30">
                      <span className="text-muted-foreground">Comandas</span>
                      <span className="font-medium text-primary">{previewData.table_orders?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border-2 border-primary/30">
                      <span className="text-muted-foreground">Permissões</span>
                      <span className="font-medium text-primary">{previewData.user_roles?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">Endereços</span>
                      <span className="font-medium">{previewData.customer_addresses?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Importando... {Math.round(progress)}%
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={importBackup}
                    disabled={isImporting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Confirmar Importação
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={cancelImport}
                    disabled={isImporting}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-2">💡 O que está incluído no backup?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Configurações gerais da loja (nome, cores, logo, etc.)</li>
              <li>• Todas as categorias e produtos com suas imagens</li>
              <li>• Grupos de acréscimos e suas opções</li>
              <li>• Cupons de desconto</li>
              <li>• Zonas e taxas de entrega</li>
              <li>• Horários de funcionamento</li>
              <li>• Lista de garçons e mesas</li>
            </ul>
            <h4 className="font-medium text-foreground mt-4 mb-2">⚠️ O que NÃO está incluído:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Histórico de pedidos (delivery)</li>
              <li>• Histórico de comandas (mesa)</li>
              <li>• Dados de usuários e autenticação</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBackup;
