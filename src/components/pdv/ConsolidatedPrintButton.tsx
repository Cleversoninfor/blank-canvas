import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStore';
import { useOpenTableOrdersByTableId } from '@/hooks/useTableOrdersByTable';
import { supabase } from '@/integrations/supabase/client';

interface ConsolidatedPrintButtonProps {
  tableId: string;
  tableName: string;
  className?: string;
}

interface ConsolidatedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  observation?: string;
}

export function ConsolidatedPrintButton({ tableId, tableName, className }: ConsolidatedPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { data: storeConfig } = useStoreConfig();
  const { orders } = useOpenTableOrdersByTableId(tableId);

  const fetchAllItems = async () => {
    if (!orders || orders.length === 0) return [];
    
    const orderIds = orders.map(o => o.id);
    const { data: items, error } = await supabase
      .from('table_order_items')
      .select('*')
      .in('table_order_id', orderIds)
      .neq('status', 'cancelled');
    
    if (error) throw error;
    return items || [];
  };

  const consolidateItems = (items: Array<{ product_name: string; quantity: number; unit_price: number; observation: string | null }>): ConsolidatedItem[] => {
    return items.map(item => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      observation: item.observation || undefined,
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const generateConsolidatedText = (items: ConsolidatedItem[], storeName: string) => {
    const width = 32;
    let text = '';
    
    const centerText = (str: string): string => {
      const padding = Math.max(0, Math.floor((width - str.length) / 2));
      return ' '.repeat(padding) + str;
    };

    const formatLine = (left: string, right: string): string => {
      const rightLen = right.length;
      const leftLen = width - rightLen - 1;
      return left.substring(0, leftLen).padEnd(leftLen, ' ') + ' ' + right;
    };

    // Header with store name
    text += centerText(storeName.toUpperCase()) + '\n';
    text += centerText('COMANDA') + '\n';
    text += centerText(tableName.toUpperCase()) + '\n';
    text += '-'.repeat(width) + '\n';

    // Date/time
    const now = new Date();
    text += `Data: ${now.toLocaleDateString('pt-BR')}\n`;
    text += `Hora: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += '-'.repeat(width) + '\n';

    // Items
    text += 'ITENS DO PEDIDO\n';
    text += '-'.repeat(width) + '\n';

    let subtotal = 0;
    items.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;
      
      text += formatLine(`${item.quantity}x ${item.name}`, formatCurrency(itemTotal)) + '\n';
      
      if (item.observation) {
        text += `  Obs: ${item.observation}\n`;
      }
      
      if (index < items.length - 1) {
        text += '----\n';
      }
    });

    text += '-'.repeat(width) + '\n';

    // Total items
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    text += `Qtd Total de Itens: ${totalQuantity}\n`;
    text += '-'.repeat(width) + '\n';

    // Total
    text += '='.repeat(width) + '\n';
    text += formatLine('TOTAL:', formatCurrency(subtotal)) + '\n';
    text += '='.repeat(width) + '\n';

    // Footer
    text += '-'.repeat(width) + '\n';
    text += centerText('Obrigado pela preferencia!') + '\n';

    return { text, subtotal };
  };

  const handleThermalPrint = async () => {
    try {
      setIsPrinting(true);
      const items = await fetchAllItems();
      
      if (items.length === 0) {
        toast({ title: 'Nenhum item para imprimir', variant: 'destructive' });
        return;
      }

      const consolidatedItems = consolidateItems(items);
      const storeName = storeConfig?.name || 'Restaurante';
      const { text, subtotal } = generateConsolidatedText(consolidatedItems, storeName);
      
      const lines = text.split('\n');
      const lineHeight = 14;
      const paddingVertical = 20;
      const dynamicHeight = (lines.length * lineHeight) + paddingVertical;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Comanda ${tableName}</title>
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
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({ title: 'Erro ao imprimir', variant: 'destructive' });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const jsPDF = (await import('jspdf')).default;
      
      const items = await fetchAllItems();
      
      if (items.length === 0) {
        toast({ title: 'Nenhum item para exportar', variant: 'destructive' });
        return;
      }

      const consolidatedItems = consolidateItems(items);
      const storeName = storeConfig?.name || 'Restaurante';
      
      // Calculate dynamic height
      const pageWidth = 80; // mm
      const margin = 5;
      const lineHeight = 4;
      let estimatedHeight = 30; // Header
      
      estimatedHeight += consolidatedItems.length * lineHeight * 2; // Items
      consolidatedItems.forEach(item => {
        if (item.observation) estimatedHeight += lineHeight;
      });
      estimatedHeight += 40; // Footer and totals
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, Math.max(estimatedHeight, 100)]
      });

      let y = margin;
      const contentWidth = pageWidth - (margin * 2);

      // Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(storeName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 5;
      
      doc.setFontSize(10);
      doc.text('COMANDA', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(tableName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 5;
      
      // Date
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const now = new Date();
      doc.text(`Data: ${now.toLocaleDateString('pt-BR')} - ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, y);
      y += 5;
      
      // Items header
      doc.setFont('helvetica', 'bold');
      doc.text('ITENS DO PEDIDO', margin, y);
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
      
      // Items
      doc.setFont('helvetica', 'normal');
      let subtotal = 0;
      consolidatedItems.forEach(item => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        
        doc.text(`${item.quantity}x ${item.name}`, margin, y);
        doc.text(formatCurrency(itemTotal), pageWidth - margin, y, { align: 'right' });
        y += 4;
        
        if (item.observation) {
          doc.setFontSize(7);
          doc.text(`  Obs: ${item.observation}`, margin, y);
          y += 3;
          doc.setFontSize(8);
        }
      });
      
      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      
      // Total items
      const totalQuantity = consolidatedItems.reduce((sum, item) => sum + item.quantity, 0);
      doc.text(`Qtd Total de Itens: ${totalQuantity}`, margin, y);
      y += 5;
      
      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL:', margin, y);
      doc.text(formatCurrency(subtotal), pageWidth - margin, y, { align: 'right' });
      y += 6;
      
      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Obrigado pela preferência!', pageWidth / 2, y, { align: 'center' });
      
      doc.save(`comanda-${tableName.replace(/\s/g, '-')}.pdf`);
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleThermalPrint}
        disabled={isPrinting}
      >
        {isPrinting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        <span className="ml-2">Imprimir (Térmica)</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span className="ml-2">Exportar PDF</span>
      </Button>
    </div>
  );
}
