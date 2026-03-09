import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStore';
import { TableOrderItem } from '@/types/pdv';
import jsPDF from 'jspdf';

interface CheckoutPrintButtonProps {
  tableName: string;
  items: TableOrderItem[];
  subtotal: number;
  discountAmount: number;
  serviceFeeEnabled: boolean;
  serviceFee: number;
  total: number;
  className?: string;
}

export function CheckoutPrintButton({
  tableName,
  items,
  subtotal,
  discountAmount,
  serviceFeeEnabled,
  serviceFee,
  total,
  className,
}: CheckoutPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { data: storeConfig } = useStoreConfig();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const activeItems = items.filter(i => i.status !== 'cancelled');

  const generateReceiptText = (storeName: string) => {
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
    text += centerText('CONTA') + '\n';
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

    activeItems.forEach((item, index) => {
      const itemTotal = item.quantity * Number(item.unit_price);
      text += formatLine(`${item.quantity}x ${item.product_name}`, formatCurrency(itemTotal)) + '\n';

      if (item.observation) {
        text += `  Obs: ${item.observation}\n`;
      }

      if (index < activeItems.length - 1) {
        text += '----\n';
      }
    });

    text += '-'.repeat(width) + '\n';

    // Total items
    const totalQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    text += `Qtd Total de Itens: ${totalQuantity}\n`;
    text += '-'.repeat(width) + '\n';

    // Subtotal
    text += formatLine('Subtotal:', formatCurrency(subtotal)) + '\n';

    // Discount
    if (discountAmount > 0) {
      text += formatLine('Desconto:', `-${formatCurrency(discountAmount)}`) + '\n';
    }

    // Service fee
    if (serviceFeeEnabled && serviceFee > 0) {
      text += formatLine('Taxa de Servico (10%):', formatCurrency(serviceFee)) + '\n';
    }

    text += '='.repeat(width) + '\n';
    text += formatLine('TOTAL:', formatCurrency(total)) + '\n';
    text += '='.repeat(width) + '\n';

    // Footer
    text += '-'.repeat(width) + '\n';
    text += centerText('Obrigado pela preferencia!') + '\n';

    return text;
  };

  const handleThermalPrint = async () => {
    if (activeItems.length === 0) {
      toast({ title: 'Nenhum item para imprimir', variant: 'destructive' });
      return;
    }

    try {
      setIsPrinting(true);
      const storeName = storeConfig?.name || 'Restaurante';
      const text = generateReceiptText(storeName);

      const lines = text.split('\n');
      const lineHeight = 14;
      const paddingVertical = 20;
      const dynamicHeight = lines.length * lineHeight + paddingVertical;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Conta ${tableName}</title>
              <style>
                @page { 
                  size: 80mm ${dynamicHeight}px; 
                  margin: 0; 
                }
                @media print {
                  html, body {
                    width: 80mm;
                    height: ${dynamicHeight}px;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden;
                  }
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
    if (activeItems.length === 0) {
      toast({ title: 'Nenhum item para exportar', variant: 'destructive' });
      return;
    }

    try {
      setIsExporting(true);
      const storeName = storeConfig?.name || 'Restaurante';

      // A4 page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const bottomMargin = 25;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let y = margin;

      // Helper function to check and add new page if needed
      const checkPageBreak = (requiredSpace: number, sectionTitle?: string): void => {
        if (y + requiredSpace > pageHeight - bottomMargin) {
          doc.addPage();
          y = margin;

          if (sectionTitle) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text(sectionTitle + ' (continuação)', margin, y);
            y += 3;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;

            // Repeat table header
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, contentWidth, 10, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text('QTD', margin + 5, y + 2);
            doc.text('ITEM', margin + 25, y + 2);
            doc.text('UNIT.', pageWidth - margin - 50, y + 2);
            doc.text('TOTAL', pageWidth - margin - 20, y + 2);
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
          }
        }
      };

      // ========== 1. HEADER ==========
      doc.setFillColor(45, 45, 45);
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Store name at top
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(storeName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

      // Order type below store name
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTA - CONSUMIR NO LOCAL', pageWidth / 2, 22, { align: 'center' });

      // Table name
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(tableName.toUpperCase(), pageWidth / 2, 31, { align: 'center' });

      y = 45;
      doc.setTextColor(0, 0, 0);

      // ========== 2. ORDER INFO (Date/Time) ==========
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 2, contentWidth, 14, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Data: ${dateStr}`, margin + 5, y + 5);
      doc.text(`Horário: ${timeStr}`, margin + 80, y + 5);

      y += 20;

      // ========== 3. ITEMS SECTION ==========
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('ITENS DO PEDIDO', margin, y);

      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, contentWidth, 10, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('QTD', margin + 5, y + 2);
      doc.text('ITEM', margin + 25, y + 2);
      doc.text('UNIT.', pageWidth - margin - 50, y + 2);
      doc.text('TOTAL', pageWidth - margin - 20, y + 2);

      y += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // ========== 4. ITEMS WITH PAGE BREAK SUPPORT ==========
      activeItems.forEach((item, index) => {
        let itemHeight = 12;
        if (item.observation) {
          itemHeight += 6;
        }

        checkPageBreak(itemHeight, 'ITENS DO PEDIDO');

        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y - 4, contentWidth, itemHeight, 'F');
        }

        const itemTotal = item.quantity * Number(item.unit_price);

        // Quantity
        doc.setFont('helvetica', 'bold');
        doc.text(String(item.quantity), margin + 8, y);
        doc.setFont('helvetica', 'normal');

        // Item name (with truncation if too long)
        const maxNameLength = 45;
        const itemName = item.product_name.length > maxNameLength
          ? item.product_name.substring(0, maxNameLength) + '...'
          : item.product_name;
        doc.text(itemName, margin + 20, y);

        // Unit price and total
        doc.text(formatCurrency(Number(item.unit_price)), pageWidth - margin - 50, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(itemTotal), pageWidth - margin - 20, y);
        doc.setFont('helvetica', 'normal');

        y += 6;

        // Observation if exists
        if (item.observation) {
          doc.setFontSize(9);
          doc.setTextColor(120, 90, 0);
          const obsLines = doc.splitTextToSize(`Obs: ${item.observation}`, contentWidth - 25);
          doc.text(obsLines, margin + 20, y);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          y += obsLines.length * 4 + 2;
        }

        y += 4;
      });

      y += 5;

      // ========== 5. FINANCIAL SUMMARY ==========
      checkPageBreak(70);

      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const summaryX = margin + 100;
      const valueX = pageWidth - margin - 5;

      // Calculate total quantity of items
      const totalItemQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);

      // Total item quantity
      doc.setFont('helvetica', 'bold');
      doc.text('Quantidade Total de Itens:', summaryX, y);
      doc.text(String(totalItemQuantity), valueX, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 10;

      // Subtotal
      doc.text('Subtotal:', summaryX, y);
      doc.text(formatCurrency(subtotal), valueX, y, { align: 'right' });
      y += 7;

      // Service fee (if applicable)
      if (serviceFeeEnabled && serviceFee > 0) {
        doc.text('Taxa de Serviço (10%):', summaryX, y);
        doc.text(formatCurrency(serviceFee), valueX, y, { align: 'right' });
        y += 7;
      }

      // Discount (if applicable)
      if (discountAmount > 0) {
        doc.setTextColor(0, 130, 0);
        doc.text('Desconto:', summaryX, y);
        doc.text(`-${formatCurrency(discountAmount)}`, valueX, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 7;
      }

      y += 3;

      // Total highlight box
      doc.setFillColor(45, 45, 45);
      doc.rect(summaryX - 10, y - 4, pageWidth - margin - summaryX + 15, 16, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL:', summaryX, y + 6);
      doc.text(formatCurrency(total), valueX, y + 6, { align: 'right' });

      y += 25;
      doc.setTextColor(0, 0, 0);

      // Footer on last page
      const footerY = pageHeight - 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.setFont('helvetica', 'italic');
      doc.text('Obrigado pela preferência!', pageWidth / 2, footerY - 2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 3, { align: 'center' });

      doc.save(`conta-${tableName.replace(/\s/g, '-')}.pdf`);
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
      <Button variant="outline" size="sm" onClick={handleThermalPrint} disabled={isPrinting}>
        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span className="ml-2">Imprimir (Térmica)</span>
      </Button>

      <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        <span className="ml-2">Exportar PDF</span>
      </Button>
    </div>
  );
}
