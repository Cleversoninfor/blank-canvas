import { useState, useEffect, useRef } from 'react';
import { Loader2, Image, Type, Move, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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
    hero_banner_enabled: true,
    floating_image_enabled: true,
    hero_text_1: '',
    hero_text_2: '',
    hero_text_3: '',
    hero_slogan: '',
    floating_image_url: '',
    floating_image_size: 100,
    floating_image_position: 50,
    floating_image_vertical_position: 50,
    floating_image_size_mobile: 100,
    floating_image_position_mobile: 50,
    floating_image_vertical_position_mobile: 70,
  });

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
        hero_banner_enabled: store.hero_banner_enabled ?? true,
        floating_image_enabled: store.floating_image_enabled ?? true,
        hero_text_1: store.hero_text_1 || '',
        hero_text_2: store.hero_text_2 || '',
        hero_text_3: store.hero_text_3 || '',
        hero_slogan: store.hero_slogan || '',
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
        hero_banner_enabled: current.hero_banner_enabled,
        floating_image_enabled: current.floating_image_enabled,
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

  const getCurrentSize = () => deviceMode === 'desktop' ? formData.floating_image_size : formData.floating_image_size_mobile;
  const getCurrentHorizontalPosition = () => deviceMode === 'desktop' ? formData.floating_image_position : formData.floating_image_position_mobile;
  const getCurrentVerticalPosition = () => deviceMode === 'desktop' ? formData.floating_image_vertical_position : formData.floating_image_vertical_position_mobile;

  const setCurrentSize = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') return { ...prev, floating_image_size: value };
      return { ...prev, floating_image_size_mobile: value };
    });
  };

  const setCurrentHorizontalPosition = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') return { ...prev, floating_image_position: value };
      return { ...prev, floating_image_position_mobile: value };
    });
  };

  const setCurrentVerticalPosition = (value: number) => {
    setFormDataAndRef((prev) => {
      if (deviceMode === 'desktop') return { ...prev, floating_image_vertical_position: value };
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

        {/* Toggle Banner */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Personalização do Banner</p>
            <p className="text-xs text-muted-foreground">Exibir textos animados e slogan no banner</p>
          </div>
          <Switch
            checked={formData.hero_banner_enabled}
            onCheckedChange={(checked) => setFormDataAndRef((prev) => ({ ...prev, hero_banner_enabled: checked }))}
          />
        </div>

        {formData.hero_banner_enabled && (
          <>
            {/* Textos Animados */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-4">
                <Type className="h-4 w-4 text-primary" />
                Textos Animados
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Estes textos aparecem alternadamente no banner com efeito de transição. Deixe vazio para não exibir.
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
                Aparece acima do nome do restaurante no banner. Deixe vazio para não exibir.
              </p>
            </div>
          </>
        )}

        {/* Toggle Floating Image */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 mb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Imagem Animada (Efeito Parallax)</p>
              <p className="text-xs text-muted-foreground">Exibir imagem flutuante com efeito parallax no banner</p>
            </div>
            <Switch
              checked={formData.floating_image_enabled}
              onCheckedChange={(checked) => setFormDataAndRef((prev) => ({ ...prev, floating_image_enabled: checked }))}
            />
          </div>

          {formData.floating_image_enabled && (
            <div className="space-y-4">
              <Label className="text-xs sm:text-sm text-muted-foreground">
                Imagem Animada
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

              {/* Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <Move className="h-3 w-3" />
                    Tamanho ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
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
              </div>

              {/* Horizontal Position */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm text-muted-foreground">
                    Posição Horizontal ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
                  </Label>
                  <span className="text-xs font-medium text-primary">
                    {deviceMode === 'mobile'
                      ? `${getCurrentHorizontalPosition()}px`
                      : getCurrentHorizontalPosition() < 50 ? 'Esquerda' : getCurrentHorizontalPosition() > 50 ? 'Direita' : 'Centro'}
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

              {/* Vertical Position */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm text-muted-foreground">
                    Posição Vertical ({deviceMode === 'desktop' ? 'Desktop' : 'Mobile'})
                  </Label>
                  <span className="text-xs font-medium text-primary">
                    {deviceMode === 'mobile'
                      ? `${getCurrentVerticalPosition()}px`
                      : getCurrentVerticalPosition() < 50 ? 'Topo' : getCurrentVerticalPosition() > 50 ? 'Baixo' : 'Centro'}
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
          )}
        </div>

        {/* Preview */}
        {formData.hero_banner_enabled && (
          <div className="border-t pt-6 space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">Preview dos Textos</Label>
            <div className="p-4 rounded-lg bg-gradient-to-b from-black/80 to-black/60 text-white">
              {formData.hero_slogan && (
                <p className="text-sm italic text-white/80 mb-2">{formData.hero_slogan}</p>
              )}
              <p className="text-lg font-bold mb-1">{store?.name || 'Nome do Restaurante'}</p>
              <div className="space-y-1">
                {formData.hero_text_1 && <p className="text-primary font-bold">{formData.hero_text_1}</p>}
                {formData.hero_text_2 && <p className="text-primary/70 font-bold text-sm">→ {formData.hero_text_2}</p>}
                {formData.hero_text_3 && <p className="text-primary/50 font-bold text-xs">→ {formData.hero_text_3}</p>}
              </div>
            </div>
          </div>
        )}

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
