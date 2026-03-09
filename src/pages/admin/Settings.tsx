import { useState, useEffect } from 'react';
import { Loader2, Store, Phone, CreditCard, MapPin, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { BrandSettings } from '@/components/admin/BrandSettings';
import { BannerSettings } from '@/components/admin/BannerSettings';
import { SubdomainSettings } from '@/components/admin/SubdomainSettings';
import { OperationModes } from '@/components/admin/OperationModes';
import { MenuLayoutSettings } from '@/components/admin/MenuLayoutSettings';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useBusinessHours, useUpdateBusinessHour, getDayName, BusinessHour, isStoreCurrentlyOpen } from '@/hooks/useBusinessHours';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
const AdminSettings = () => {
  const { data: store, isLoading } = useStoreConfig();
  const { data: hours, isLoading: isLoadingHours } = useBusinessHours();
  const updateStore = useUpdateStoreConfig();
  const updateHour = useUpdateBusinessHour();
  const storeStatus = useStoreStatus();
  const { toast } = useToast();
  
  const [editingHourId, setEditingHourId] = useState<string | null>(null);
  const [editHourData, setEditHourData] = useState({
    open_time: '',
    close_time: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    phone_whatsapp: '',
    pix_key: '',
    pix_key_type: 'Telefone',
    pix_message: '',
    logo_url: '',
    cover_url: '',
    delivery_fee: '',
    delivery_time_min: '',
    delivery_time_max: '',
    pickup_time_min: '',
    pickup_time_max: '',
    is_open: true,
    address: ''
  });
  
  // Calculate business hours status - must be before any returns
  const hasBusinessHours = hours && hours.length > 0;
  const isWithinBusinessHours = hours ? isStoreCurrentlyOpen(hours) : false;
  
  // Determine the effective status message
  const getStatusMessage = () => {
    if (hasBusinessHours && isWithinBusinessHours) {
      return 'Loja aberta automaticamente (dentro do horário)';
    }
    if (hasBusinessHours && !isWithinBusinessHours) {
      if (store?.is_open) {
        return 'Loja aberta manualmente (fora do horário)';
      }
      return 'Fora do horário de funcionamento (fechada automaticamente)';
    }
    // Sem horários configurados
    if (store?.is_open) {
      return 'Recebendo pedidos';
    }
    return 'Loja fechada manualmente';
  };
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        phone_whatsapp: store.phone_whatsapp || '',
        pix_key: store.pix_key || '',
        pix_key_type: store.pix_key_type || 'Telefone',
        pix_message: store.pix_message || '',
        logo_url: store.logo_url || '',
        cover_url: store.cover_url || '',
        delivery_fee: store.delivery_fee?.toString() || '',
        delivery_time_min: store.delivery_time_min?.toString() || '30',
        delivery_time_max: store.delivery_time_max?.toString() || '45',
        pickup_time_min: store.pickup_time_min?.toString() || '15',
        pickup_time_max: store.pickup_time_max?.toString() || '25',
        is_open: store.is_open ?? true,
        address: store.address || ''
      });
    }
  }, [store]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: any = {
        name: formData.name,
        phone_whatsapp: formData.phone_whatsapp || null,
        pix_key: formData.pix_key || null,
        pix_key_type: formData.pix_key_type || null,
        pix_message: formData.pix_message || null,
        logo_url: formData.logo_url || null,
        cover_url: formData.cover_url || null,
        delivery_fee: parseFloat(formData.delivery_fee.replace(',', '.')) || 0,
        delivery_time_min: parseInt(formData.delivery_time_min) || 30,
        delivery_time_max: parseInt(formData.delivery_time_max) || 45,
        pickup_time_min: parseInt(formData.pickup_time_min) || 15,
        pickup_time_max: parseInt(formData.pickup_time_max) || 25,
        is_open: formData.is_open,
        address: formData.address || null
      };
      
      // Only include id if it exists (for update vs insert)
      if (store?.id) {
        updateData.id = store.id;
      }
      await updateStore.mutateAsync(updateData);
      toast({
        title: 'Configurações salvas!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const toggleStoreStatus = async () => {
    if (!store) return;
    const newValue = !store.is_open;
    try {
      await updateStore.mutateAsync({
        ...(store.id ? { id: store.id } : {}),
        is_open: newValue
      });
      setFormData(prev => ({ ...prev, is_open: newValue }));
      toast({
        title: newValue ? 'Loja aberta' : 'Loja fechada'
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive'
      });
    }
  };
  const handleEditHour = (hour: BusinessHour) => {
    setEditingHourId(hour.id);
    setEditHourData({
      open_time: hour.open_time,
      close_time: hour.close_time
    });
  };
  const handleSaveHour = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        open_time: editHourData.open_time,
        close_time: editHourData.close_time
      });
      setEditingHourId(null);
      toast({
        title: 'Horário atualizado!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const toggleHourActive = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        is_active: !hour.is_active
      });
      toast({
        title: hour.is_active ? 'Dia desativado' : 'Dia ativado'
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive'
      });
    }
  };
  if (isLoading) {
    return <AdminLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>;
  }
  return <AdminLayout title="Configurações">

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Store Status Card */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${storeStatus.isOpen ? 'bg-secondary/20' : 'bg-destructive/20'}`}>
                <Store className={`h-5 w-5 sm:h-6 sm:w-6 ${storeStatus.isOpen ? 'text-secondary' : 'text-destructive'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Status da Loja</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
            {/* Toggle só aparece fora do horário (para forçar abertura) ou sem horários configurados */}
            {(!hasBusinessHours || !isWithinBusinessHours) && (
              <Switch checked={store?.is_open ?? true} onCheckedChange={toggleStoreStatus} disabled={updateStore.isPending} />
            )}
          </div>
          
          {/* Status indicator and description */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`text-xs font-medium ${storeStatus.isOpen ? 'text-secondary' : 'text-destructive'}`}>
                {storeStatus.isOpen ? '● Loja aberta' : '● Loja fechada'}
              </span>
            </div>
            
            {hasBusinessHours && isWithinBusinessHours && (
              <div className="flex items-start gap-2 bg-secondary/10 rounded-md p-2">
                <Clock className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-xs text-secondary">
                  A loja está aberta automaticamente porque está dentro do horário de funcionamento.
                </p>
              </div>
            )}
            
            {hasBusinessHours && !isWithinBusinessHours && (
              <div className="flex items-start gap-2 bg-destructive/10 rounded-md p-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">
                  Fora do horário de funcionamento. Use o toggle para forçar a abertura se necessário.
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Como funciona:</strong> A loja abre e fecha automaticamente de acordo com os horários configurados.
              {hasBusinessHours && !isWithinBusinessHours && ' Use o toggle acima para forçar a abertura fora do horário (ex: evento especial).'}
              {!hasBusinessHours && ' Configure horários de funcionamento para automação.'}
            </p>
          </div>
        </div>

        {/* Operation Modes */}
        <OperationModes />

        {/* Menu Layout */}
        <MenuLayoutSettings />

        {/* Brand Customization */}
        <BrandSettings />

        {/* Banner Customization */}
        <BannerSettings />

        {/* Subdomain Settings */}
        <SubdomainSettings />

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Store Info */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Informações da Loja
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Nome da Loja *</label>
              <Input value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder="Nome do seu restaurante" className="mt-1" />
            </div>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Logo</label>
              <ImageUpload bucket="store-assets" currentUrl={formData.logo_url} onUpload={url => setFormData({
              ...formData,
              logo_url: url
            })} onRemove={() => setFormData({
              ...formData,
              logo_url: ''
            })} className="mt-1" />
            </div>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Imagem de Capa</label>
              <ImageUpload bucket="store-assets" currentUrl={formData.cover_url} onUpload={url => setFormData({
              ...formData,
              cover_url: url
            })} onRemove={() => setFormData({
              ...formData,
              cover_url: ''
            })} className="mt-1" />
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Endereço
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Endereço completo</label>
              <Input value={formData.address} onChange={e => setFormData({
              ...formData,
              address: e.target.value
            })} placeholder="Rua, número, bairro, cidade" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Será exibido no cardápio para os clientes</p>
            </div>

            {/* Pickup Time Settings */}
            <div className="pt-4 border-t border-border">
              <label className="text-xs sm:text-sm text-muted-foreground font-medium">Tempo de preparo para retirada</label>
              <p className="text-xs text-muted-foreground mb-2">Exibido para o cliente ao escolher a opção de retirada</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">Tempo mínimo (min)</label>
                  <Input 
                    type="number"
                    value={formData.pickup_time_min} 
                    onChange={e => setFormData({
                      ...formData,
                      pickup_time_min: e.target.value
                    })} 
                    placeholder="15" 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tempo máximo (min)</label>
                  <Input 
                    type="number"
                    value={formData.pickup_time_max} 
                    onChange={e => setFormData({
                      ...formData,
                      pickup_time_max: e.target.value
                    })} 
                    placeholder="25" 
                    className="mt-1" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Contato
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">WhatsApp</label>
              <Input value={formData.phone_whatsapp} onChange={e => setFormData({
              ...formData,
              phone_whatsapp: e.target.value
            })} placeholder="11999999999" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Apenas números, com DDD</p>
            </div>
          </div>

          {/* PIX */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Chave PIX
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground">Tipo da Chave</label>
                <Select value={formData.pix_key_type} onValueChange={value => setFormData({
                ...formData,
                pix_key_type: value
              })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Telefone">Telefone</SelectItem>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Aleatória">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground">Chave PIX</label>
                <Input value={formData.pix_key} onChange={e => setFormData({
                ...formData,
                pix_key: e.target.value
              })} placeholder="Sua chave PIX" className="mt-1" />
              </div>
            </div>
          </div>

          {/* PIX Message */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Mensagem de Cobrança PIX
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Mensagem personalizada</label>
              <Textarea 
                value={formData.pix_message} 
                onChange={e => setFormData({
                  ...formData,
                  pix_message: e.target.value
                })} 
                placeholder="Olá {nome}! 🍔&#10;&#10;Pedido #{pedido} recebido!&#10;&#10;Total: {total}&#10;&#10;💠 Chave Pix: {chave_pix} ({tipo_chave})&#10;&#10;Aguardamos o comprovante para iniciar o preparo!"
                className="mt-1 min-h-[120px] font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use as variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>, <code className="bg-muted px-1 rounded">{'{pedido}'}</code>, <code className="bg-muted px-1 rounded">{'{total}'}</code>, <code className="bg-muted px-1 rounded">{'{chave_pix}'}</code>, <code className="bg-muted px-1 rounded">{'{tipo_chave}'}</code>
              </p>
            </div>
          </div>


          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full" disabled={updateStore.isPending}>
            {updateStore.isPending ? <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </> : 'Salvar Configurações'}
          </Button>
        </form>

        {/* Business Hours - Outside form since it saves individually */}
        
      </div>
    </AdminLayout>;
};
export default AdminSettings;