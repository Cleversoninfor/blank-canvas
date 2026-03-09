import { useState, useEffect } from 'react';
import { Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

// Preset color options
const COLOR_PRESETS = [
  { name: 'Amarelo', value: '45 100% 51%', hex: '#f59e0b' },
  { name: 'Vermelho', value: '0 84% 60%', hex: '#ef4444' },
  { name: 'Verde', value: '142 76% 49%', hex: '#22c55e' },
  { name: 'Azul', value: '217 91% 60%', hex: '#3b82f6' },
  { name: 'Roxo', value: '270 95% 65%', hex: '#a855f7' },
  { name: 'Rosa', value: '330 81% 60%', hex: '#ec4899' },
  { name: 'Laranja', value: '25 95% 53%', hex: '#f97316' },
  { name: 'Ciano', value: '187 85% 53%', hex: '#06b6d4' },
];

const SECONDARY_PRESETS = [
  { name: 'Verde', value: '142 76% 49%', hex: '#22c55e' },
  { name: 'Azul', value: '217 91% 60%', hex: '#3b82f6' },
  { name: 'Roxo', value: '270 95% 65%', hex: '#a855f7' },
  { name: 'Rosa', value: '330 81% 60%', hex: '#ec4899' },
  { name: 'Amarelo', value: '45 100% 51%', hex: '#f59e0b' },
  { name: 'Laranja', value: '25 95% 53%', hex: '#f97316' },
  { name: 'Ciano', value: '187 85% 53%', hex: '#06b6d4' },
  { name: 'Vermelho', value: '0 84% 60%', hex: '#ef4444' },
];

interface BrandSettingsProps {
  className?: string;
}

export function BrandSettings({ className }: BrandSettingsProps) {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    primary_color: '45 100% 51%',
    secondary_color: '142 76% 49%',
    pwa_name: '',
    pwa_short_name: '',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        logo_url: store.logo_url || '',
        primary_color: store.primary_color || '45 100% 51%',
        secondary_color: store.secondary_color || '142 76% 49%',
        pwa_name: store.pwa_name || store.name || '',
        pwa_short_name: store.pwa_short_name || store.pwa_name?.slice(0, 12) || store.name?.slice(0, 12) || '',
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: any = {
        name: formData.name,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        pwa_name: formData.pwa_name || formData.name,
        pwa_short_name: formData.pwa_short_name || formData.pwa_name?.slice(0, 12) || formData.name.slice(0, 12),
      };
      
      if (store?.id) {
        updateData.id = store.id;
      }
      
      await updateStore.mutateAsync(updateData);
      toast({ title: 'Marca atualizada com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-6">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Personalização da Marca
        </h3>

        {/* Store Name */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Nome do Restaurante</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do seu restaurante"
          />
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">
            Logo do Restaurante / Ícone do App
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
              512×512px (quadrada)
            </span>
          </Label>
          <ImageUpload
            bucket="store-assets"
            currentUrl={formData.logo_url}
            onUpload={(url) => setFormData({ ...formData, logo_url: url })}
            onRemove={() => setFormData({ ...formData, logo_url: '' })}
          />
          <p className="text-xs text-muted-foreground">
            <strong>Obrigatório:</strong> Imagem quadrada de 512×512 pixels (PNG ou JPG). 
            Esta imagem será usada como logo e também como ícone quando o app for instalado.
          </p>
        </div>

        {/* Primary Color */}
        <div className="space-y-3">
          <Label className="text-xs sm:text-sm text-muted-foreground">Cor Principal</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, primary_color: color.value })}
                className={`h-10 w-10 rounded-lg border-2 transition-all ${
                  formData.primary_color === color.value
                    ? 'border-foreground scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Usada em botões, destaques e elementos principais
          </p>
        </div>

        {/* Secondary Color */}
        <div className="space-y-3">
          <Label className="text-xs sm:text-sm text-muted-foreground">Cor Secundária</Label>
          <div className="flex flex-wrap gap-2">
            {SECONDARY_PRESETS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, secondary_color: color.value })}
                className={`h-10 w-10 rounded-lg border-2 transition-all ${
                  formData.secondary_color === color.value
                    ? 'border-foreground scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Usada em status de sucesso, WhatsApp e elementos secundários
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Preview</Label>
          <div className="p-4 rounded-lg border bg-background flex items-center gap-4">
            {formData.logo_url ? (
              <img 
                src={formData.logo_url} 
                alt="Logo" 
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: `hsl(${formData.primary_color})` }}
              >
                {formData.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="font-semibold">{formData.name || 'Nome do Restaurante'}</p>
              <div className="flex gap-2 mt-1">
                <span 
                  className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                >
                  Primária
                </span>
                <span 
                  className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: `hsl(${formData.secondary_color})` }}
                >
                  Secundária
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PWA Settings */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium text-sm">Configurações do App Instalável (PWA)</h4>
          
          {/* PWA Preview */}
          <div className="p-4 rounded-lg border bg-background">
            <Label className="text-xs text-muted-foreground mb-3 block">Preview do Ícone</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <img 
                  src={formData.logo_url} 
                  alt="Ícone do App" 
                  className="h-16 w-16 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div 
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md"
                  style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                >
                  {formData.name.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{formData.pwa_short_name || formData.pwa_name || formData.name || 'App'}</p>
                <p className="text-xs text-muted-foreground">Como aparece na tela inicial</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">
              Nome do App (exibido na tela inicial)
            </Label>
            <Input
              value={formData.pwa_name}
              onChange={(e) => setFormData({ ...formData, pwa_name: e.target.value })}
              placeholder={formData.name || "Nome completo do app"}
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">
              Nome Curto (abaixo do ícone)
            </Label>
            <Input
              value={formData.pwa_short_name}
              onChange={(e) => setFormData({ ...formData, pwa_short_name: e.target.value })}
              placeholder={formData.pwa_name?.slice(0, 12) || formData.name?.slice(0, 12) || "Nome curto"}
              maxLength={12}
            />
            <p className="text-xs text-muted-foreground">
              Aparece abaixo do ícone quando o app é instalado
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={updateStore.isPending}>
          {updateStore.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Personalização'
          )}
        </Button>
      </div>
    </form>
  );
}
