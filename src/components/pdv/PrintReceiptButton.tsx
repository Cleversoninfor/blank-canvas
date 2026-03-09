import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Printer, Copy, Loader2 } from 'lucide-react';
import { printReceipt, generatePrintableText, PrintOrderData } from '@/utils/thermalPrinter';

interface PrintReceiptButtonProps {
  orderData: PrintOrderData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function PrintReceiptButton({ orderData, variant = 'outline', size = 'default', className }: PrintReceiptButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const isSerialAvailable = () => {
    try {
      // Check if we're in an iframe (like Lovable preview)
      if (window.self !== window.top) {
        return false;
      }
      return 'serial' in navigator;
    } catch {
      return false;
    }
  };

  const handlePrint = () => {
    // Go directly to browser print - skip Web Serial API
    handleBrowserPrint();
  };

  const handleCopy = () => {
    const text = generatePrintableText(orderData);
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const handleBrowserPrint = () => {
    const text = generatePrintableText(orderData);
    const lines = text.split('\n');
    const lineHeight = 14; // pixels por linha
    const paddingVertical = 20; // padding top + bottom
    const dynamicHeight = (lines.length * lineHeight) + paddingVertical;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comanda #${orderData.orderNumber}</title>
            <style>
              @page { 
                size: 80mm ${dynamicHeight}px; 
                margin: 0; 
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body { 
                width: 80mm;
                height: ${dynamicHeight}px;
                margin: 0;
                padding: 0;
              }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: ${lineHeight}px;
                white-space: pre;
                padding: 10px;
              }
              @media print {
                html, body {
                  width: 80mm;
                  height: auto;
                }
                body { 
                  margin: 0; 
                  padding: 10px; 
                }
              }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 100);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={isPrinting}
        className={className}
      >
        {isPrinting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        {size !== 'icon' && <span className="ml-2">Imprimir (Térmica)</span>}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visualização da Comanda</DialogTitle>
            <DialogDescription>
              Copie o texto ou use a impressão do navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-auto max-h-96 whitespace-pre">
            {generatePrintableText(orderData)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleBrowserPrint} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
