import { useState, useEffect, useRef } from 'react';
import { Loader2, Image, Type, Move, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BannerSettingsProps {
  className?: string;
}

export function BannerSettings({ className }: BannerSettingsProps) {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  const [formData, setFormData] = useState({
    cover_url: '',
    hero_text_1: 'Carne macia',
    hero_text_2: 'Suculenta',
    hero_text_3: 'Sabor Irresistível',
    hero_slogan: 'O segredo está no tempero',
    floating_image_url: '',
    // Desktop settings
    floating_image_size: 100,
    floating_image_position: 50,
    floating_image_vertical_position: 50,
    // Mobile settings
    floating_image_size_mobile: 100,
    floating_image_position_mobile: 50,
    floating_image_vertical_position_mobile: 70,
  });

  // Keep a ref with the latest form data to avoid any race between a slider drag and the save click.
  // IMPORTANT: we update this ref synchronously inside every state update to guarantee Save always uses the latest value.
  const formDataRef = useRef(formData);

  const setFormDataAndRef = (
    updater: (prev: typeof formData) => typeof formData
  ) => {
    setFormData((prev) => {
      const next = updater(prev);
      formDataRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (store) {
      const next = {
        cover_url: store.cover_url || '',
        hero_text_1: store.hero_text_1 || 'Carne macia',
        hero_text_2: store.hero_text_2 || 'Suculenta',
        hero_text_3: store.hero_text_3 || 'Sabor Irresistível',
        hero_slogan: store.hero_slogan || 'O segredo está no tempero',
        floating_image_url: store.floating_image_url || '',
        floating_image_size: store.floating_image_size ?? 100,
        floating_image_position: store.floating_image_position ?? 50,
        floating_image_vertical_position: store.floating_image_vertical_position ?? 50,
        floating_image_size_mobile: store.floating_image_size_mobile ?? 100,
        floating_image_position_mobile: store.floating_image_position_mobile ?? 50,
        floating_image_vertical_position_mobile: store.floating_image_vertical_position_mobile ?? 70,
      };

      setFormData(next);
      formDataRef.current = next;
    }
  }, [store]);

  const saveBannerSettings = async () => {
    try {
      const current = formDataRef.current;

      const updateData: any = {
        cover_url: current.cover_url || null,
        hero_text_1: current.hero_text_1 || null,
        hero_text_2: current.hero_text_2 || null,
        hero_text_3: current.hero_text_3 || null,
        hero_slogan: current.hero_slogan || null,
        floating_image_url: current.floating_image_url || null,
        floating_image_size: current.floating_image_size,
        floating_image_position: current.floating_image_position,
        floating_image_vertical_position: current.floating_image_vertical_position,
        floating_image_size_mobile: current.floating_image_size_mobile,
        floating_image_position_mobile: current.floating_image_position_mobile,
        floating_image_vertical_position_mobile: current.floating_image_vertical_position_mobile,
      };

      if (store?.id) {
        updateData.id = store.id;
      }

      await updateStore.mutateAsync(updateData);
      toast({ title: 'Banner atualizado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  // Get current values based on device mode
  const getCurrentSize = () => deviceMode === 'desktop' ? formData.floating_image_size : formData.floating_image_size_mobile;
  const getCurrentHorizontalPosition = () => deviceMode === 'desktop' ? formData.floating_image_position : formData.floating_image_position_mobile;
  const getCurrentVerticalPosition = () => deviceMode === 'desktop' ? formData.floating_image_vertical_position : formData.floating_image_vertical_position_mobile;

  const setCurrentSize = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') {
        return { ...prev, floating_image_size: value };
      }
      return { ...prev, floating_image_size_mobile: value };
    });
  };

  const setCurrentHorizontalPosition = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') {
        return { ...prev, floating_image_position: value };
      }
      return { ...prev, floating_image_position_mobile: value };
    });
  };

  const setCurrentVerticalPosition = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') {
        return { ...prev, floating_image_vertical_position: value };
      }
      return { ...prev, floating_image_vertical_position_mobile: value };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-6">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <Image className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Personalização do Banner
        </h3>

        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure a imagem de fundo e os textos animados do banner principal.
          O banner ocupa tela cheia no mobile (1080x1920px) e largura total no desktop (1920x1080px).
        </p>

        {/* Cover Image */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">
            Imagem de Fundo do Banner
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
              1920×1080px (paisagem)
            </span>
          </Label>
          <ImageUpload
            bucket="store-assets"
            currentUrl={formData.cover_url}
            onUpload={(url) => setFormDataAndRef((prev) => ({ ...prev, cover_url: url }))}
            onRemove={() => setFormDataAndRef((prev) => ({ ...prev, cover_url: '' }))}
          />
          <p className="text-xs text-muted-foreground">
            <strong>Recomendado:</strong> 1920×1080 pixels (proporção 16:9). 
            Esta imagem aparece como plano de fundo do banner principal.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-sm flex items-center gap-2 mb-4">
            <Type className="h-4 w-4 text-primary" />
            Textos Animados
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Estes textos aparecem alternadamente no banner com efeito de transição
          </p>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm text-muted-foreground">Texto 1</Label>
              <Input
                value={formData.hero_text_1}
                onChange={(e) => setFormDataAndRef((prev) => ({ ...prev, hero_text_1: e.target.value }))}
                placeholder="Ex: Carne macia"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm text-muted-foreground">Texto 2</Label>
              <Input
                value={formData.hero_text_2}
                onChange={(e) => setFormDataAndRef((prev) => ({ ...prev, hero_text_2: e.target.value }))}
                placeholder="Ex: Suculenta"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm text-muted-foreground">Texto 3</Label>
              <Input
                value={formData.hero_text_3}
                onChange={(e) => setFormDataAndRef((prev) => ({ ...prev, hero_text_3: e.target.value }))}
                placeholder="Ex: Sabor Irresistível"
              />
            </div>
          </div>

          {/* Floating Image */}
          <div className="border-t pt-6 space-y-4">
            <Label className="text-xs sm:text-sm text-muted-foreground">
              Imagem Animada (Efeito Parallax)
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                800×800px (PNG transparente)
              </span>
            </Label>
            <ImageUpload
              bucket="store-assets"
              currentUrl={formData.floating_image_url}
              onUpload={(url) => setFormDataAndRef((prev) => ({ ...prev, floating_image_url: url }))}
              onRemove={() => setFormDataAndRef((prev) => ({ ...prev, floating_image_url: '' }))}
            />
            <p className="text-xs text-muted-foreground">
              <strong>Recomendado:</strong> 800×800 pixels, formato PNG com fundo transparente. 
              Esta imagem aparece flutuando sobre o banner com efeito de movimento parallax.
            </p>

            {/* Device Mode Toggle */}
            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <Label className="text-xs sm:text-sm font-medium">Configurar para:</Label>
              <ToggleGroup
                type="single"
                value={deviceMode}
                onValueChange={(value) => value && setDeviceMode(value as 'desktop' | 'mobile')}
                className="justify-start"
              >
                <ToggleGroupItem value="desktop" aria-label="Desktop" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  Desktop
                </ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Configure o posicionamento da imagem separadamente para cada dispositivo
              </p>
            </div>

            {/* Floating Image Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Move className="h-3 w-3" />
                  Tamanho da Imagem ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
                </Label>
                <span className="text-xs font-medium text-primary">{getCurrentSize()}px</span>
              </div>
              <Slider
                value={[getCurrentSize()]}
                onValueChange={(value) => setCurrentSize(value[0])}
                min={50}
                max={9999}
                step={50}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ajuste o tamanho da imagem animada (50px a 9999px)
              </p>
            </div>

            {/* Floating Image Horizontal Position */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm text-muted-foreground">
                  Posição Horizontal ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
                </Label>
                <span className="text-xs font-medium text-primary">
                  {deviceMode === 'mobile'
                    ? `${getCurrentHorizontalPosition()}px`
                    : getCurrentHorizontalPosition() < 50
                      ? 'Esquerda'
                      : getCurrentHorizontalPosition() > 50
                        ? 'Direita'
                        : 'Centro'}
                </span>
              </div>
                <Slider
                  value={[getCurrentHorizontalPosition()]}
                  onValueChange={(value) => setCurrentHorizontalPosition(value[0])}
                  min={deviceMode === 'desktop' ? 10 : -500}
                  max={deviceMode === 'desktop' ? 90 : 500}
                  step={5}
                  className="w-full"
                />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>← Esquerda</span>
                <span>Direita →</span>
              </div>
            </div>

            {/* Floating Image Vertical Position */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm text-muted-foreground">
                  Posição Vertical ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
                </Label>
                <span className="text-xs font-medium text-primary">
                  {deviceMode === 'mobile'
                    ? `${getCurrentVerticalPosition()}px`
                    : getCurrentVerticalPosition() < 50
                      ? 'Topo'
                      : getCurrentVerticalPosition() > 50
                        ? 'Baixo'
                        : 'Centro'}
                </span>
              </div>
              <Slider
                value={[getCurrentVerticalPosition()]}
                onValueChange={(value) => setCurrentVerticalPosition(value[0])}
                min={deviceMode === 'desktop' ? 10 : -500}
                max={deviceMode === 'desktop' ? 90 : 500}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>↑ Topo</span>
                <span>Baixo ↓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div className="border-t pt-6 space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Slogan</Label>
          <Input
            value={formData.hero_slogan}
            onChange={(e) => setFormDataAndRef((prev) => ({ ...prev, hero_slogan: e.target.value }))}
            placeholder="Ex: O segredo está no tempero"
          />
          <p className="text-xs text-muted-foreground">
            Aparece acima do nome do restaurante no banner
          </p>
        </div>

        {/* Preview */}
        <div className="border-t pt-6 space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Preview dos Textos</Label>
          <div className="p-4 rounded-lg bg-gradient-to-b from-black/80 to-black/60 text-white">
            <p className="text-sm italic text-white/80 mb-2">{formData.hero_slogan}</p>
            <p className="text-lg font-bold mb-1">{store?.name || 'Nome do Restaurante'}</p>
            <div className="space-y-1">
              <p className="text-primary font-bold">{formData.hero_text_1}</p>
              <p className="text-primary/70 font-bold text-sm">→ {formData.hero_text_2}</p>
              <p className="text-primary/50 font-bold text-xs">→ {formData.hero_text_3}</p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={updateStore.isPending}
          onClick={saveBannerSettings}
        >
          {updateStore.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Banner'
          )}
        </Button>
      </div>
    </div>
  );
}