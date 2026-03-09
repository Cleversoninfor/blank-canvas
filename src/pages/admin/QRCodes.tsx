import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { Download, ChefHat, Users, Menu, QrCode, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStoreConfig } from "@/hooks/useStore";
import { toast } from "sonner";

interface QRCodeItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

// Função para converter HSL para HEX
const hslToHex = (hslString: string): string => {
  // Se já for hex, retornar como está
  if (hslString.startsWith('#')) {
    return hslString;
  }
  
  // Limpar a string e extrair valores HSL
  // Formatos aceitos: "0 84% 60%" ou "0 84 60" ou "hsl(0, 84%, 60%)"
  const cleanString = hslString.replace(/hsl\(|\)|,/g, ' ').trim();
  const parts = cleanString.split(/\s+/).filter(p => p.length > 0);
  
  if (parts.length < 3) {
    console.warn('HSL inválido:', hslString);
    return '#ea384c'; // fallback para vermelho padrão
  }
  
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1].replace('%', '')) / 100;
  const l = parseFloat(parts[2].replace('%', '')) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const QRCodes = () => {
  const { data: storeConfig, isLoading } = useStoreConfig();
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  
  // Usar o subdomínio configurado ou a URL atual
  const getBaseUrl = () => {
    if (storeConfig?.subdomain_slug) {
      return `https://${storeConfig.subdomain_slug}.infornexa.com.br`;
    }
    return window.location.origin;
  };

  const baseUrl = getBaseUrl();

  const qrCodeItems: QRCodeItem[] = [
    {
      id: "kitchen",
      title: "Cozinha",
      description: "Acesso direto ao painel da cozinha para visualização de pedidos",
      path: "/kitchen",
      icon: ChefHat,
    },
    {
      id: "waiter",
      title: "Acesso Garçons",
      description: "Painel de acesso para garçons fazerem pedidos",
      path: "/waiter",
      icon: Users,
    },
    {
      id: "menu",
      title: "Ver Cardápio",
      description: "Cardápio digital para clientes visualizarem e fazerem pedidos",
      path: "/",
      icon: Menu,
    },
  ];

  const generatePDF = async (item: QRCodeItem) => {
    setGeneratingPDF(item.id);
    
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // Cores baseadas no tema - converter para RGB
      const colorHex = hslToHex(storeConfig?.primary_color || '0 84% 60%');
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 234, g: 56, b: 76 };
      };
      const rgb = hexToRgb(colorHex);

      // Fundo decorativo superior
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(0, 0, pageWidth, 45, "F");

      // Logo do comércio
      let currentY = 55;
      
      if (storeConfig?.logo_url) {
        try {
          const logoImg = await loadImageWithProxy(storeConfig.logo_url);
          const logoSize = 40;
          const logoX = centerX - logoSize / 2;
          pdf.addImage(logoImg, "PNG", logoX, currentY, logoSize, logoSize);
          currentY += logoSize + 10;
        } catch (error) {
          console.warn("Logo não carregada, continuando sem ela:", error);
          currentY += 10;
        }
      } else {
        currentY += 10;
      }

      // Nome do estabelecimento
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(33, 33, 33);
      const storeName = storeConfig?.name || "Meu Estabelecimento";
      pdf.text(storeName, centerX, currentY, { align: "center" });
      currentY += 20;

      // Linha decorativa
      pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
      pdf.setLineWidth(1);
      pdf.line(centerX - 40, currentY, centerX + 40, currentY);
      currentY += 15;

      // Nome de identificação do QR Code
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.text(item.title.toUpperCase(), centerX, currentY, { align: "center" });
      currentY += 8;

      // Descrição
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      const descriptionLines = pdf.splitTextToSize(item.description, 120);
      pdf.text(descriptionLines, centerX, currentY, { align: "center" });
      currentY += descriptionLines.length * 6 + 15;

      // QR Code - usando Canvas diretamente com alta qualidade
      const qrCodeUrl = `${baseUrl}${item.path}`;
      const qrCanvas = document.getElementById(`qr-canvas-${item.id}`) as HTMLCanvasElement;
      
      if (qrCanvas) {
        const qrDataUrl = qrCanvas.toDataURL("image/png", 1.0);
        
        const qrSize = 80;
        const qrX = centerX - qrSize / 2;
        
        // Borda do QR Code
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 3, 3, "FD");
        
        pdf.addImage(qrDataUrl, "PNG", qrX, currentY, qrSize, qrSize, undefined, "FAST");
        currentY += qrSize + 20;
      } else {
        throw new Error("QR Code canvas não encontrado");
      }

      // URL abaixo do QR Code
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(qrCodeUrl, centerX, currentY, { align: "center" });
      currentY += 20;

      // Instruções
      pdf.setFillColor(248, 248, 248);
      pdf.roundedRect(20, currentY, pageWidth - 40, 25, 3, 3, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Escaneie o QR Code com a câmera do seu celular", centerX, currentY + 10, { align: "center" });
      pdf.text("para acessar diretamente", centerX, currentY + 17, { align: "center" });

      // Rodapé decorativo
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(0, pageHeight - 15, pageWidth, 15, "F");

      // Salvar PDF
      const fileName = `qrcode-${item.id}-${storeName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      pdf.save(fileName);
      
      toast.success(`PDF do QR Code "${item.title}" exportado com sucesso!`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGeneratingPDF(null);
    }
  };

  const loadImageWithProxy = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Tentar sem crossOrigin se falhar
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = reject;
        img2.src = url;
      };
      
      img.src = url;
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="QR Codes">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="QR Codes">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">QR Codes de Acesso</h1>
            <p className="text-muted-foreground">
              Gere QR Codes para facilitar o acesso às diferentes áreas do sistema
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-accent/50 border border-border">
          <p className="text-sm">
            <span className="font-medium">URL base atual:</span>{" "}
            <code className="px-2 py-1 rounded bg-muted text-xs">{baseUrl}</code>
          </p>
          {storeConfig?.subdomain_slug ? (
            <p className="text-xs text-muted-foreground mt-1">
              Os QR Codes usarão automaticamente o subdomínio configurado nas configurações.
            </p>
          ) : (
            <p className="text-xs text-amber-600 mt-1">
              Configure um subdomínio em Configurações → URL do Cardápio para usar seu domínio personalizado.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodeItems.map((item) => {
            const Icon = item.icon;
            const fullUrl = `${baseUrl}${item.path}`;
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg border border-border">
                    <QRCodeCanvas
                      id={`qr-canvas-${item.id}`}
                      value={fullUrl}
                      size={200}
                      level="H"
                      includeMargin
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground break-all font-mono">
                      {fullUrl}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => generatePDF(item)}
                    disabled={generatingPDF === item.id}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingPDF === item.id ? "Gerando PDF..." : "Exportar PDF"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 Dicas de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Cozinha:</strong> Imprima e cole próximo à área de preparo para que a equipe acesse rapidamente os pedidos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Garçons:</strong> Cada garçom pode escanear para acessar seu painel de atendimento.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Cardápio:</strong> Coloque nas mesas ou na entrada do estabelecimento para os clientes acessarem o cardápio digital.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default QRCodes;
