import jsPDF from 'jspdf';

// ESC/POS commands for thermal printers (as bytes)
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Command arrays
const INIT = [ESC, 0x40]; // Initialize printer
const CENTER = [ESC, 0x61, 0x01];
const LEFT = [ESC, 0x61, 0x00];
const RIGHT = [ESC, 0x61, 0x02];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const DOUBLE_HEIGHT = [ESC, 0x21, 0x10];
const DOUBLE_WIDTH = [ESC, 0x21, 0x20];
const DOUBLE_SIZE = [ESC, 0x21, 0x30];
const NORMAL_SIZE = [ESC, 0x21, 0x00];
const CUT = [GS, 0x56, 0x00];
const FEED_3 = [ESC, 0x64, 0x03];

export interface PrintOrderData {
  orderNumber: number | string;
  orderType: 'delivery' | 'table' | 'pickup';
  tableName?: string;
  waiterName?: string;
  customerName?: string;
  customerPhone?: string;
  customerCount?: number;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    observation?: string;
  }>;
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  serviceFee?: number;
  total: number;
  paymentMethod?: string;
  changeFor?: number;
  createdAt: Date;
  storeName?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function padRight(str: string, length: number): string {
  return str.substring(0, length).padEnd(length, ' ');
}

function padLeft(str: string, length: number): string {
  return str.substring(0, length).padStart(length, ' ');
}

function formatLine(left: string, right: string, width: number = 32): string {
  const rightLen = right.length;
  const leftLen = width - rightLen - 1;
  return padRight(left, leftLen) + ' ' + right;
}

function dashedLine(width: number = 32): string {
  return '-'.repeat(width);
}

// Wrap text to fit within a specific width
function wrapText(text: string, width: number, indent: string = ''): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(indent + currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(indent + currentLine);
  return lines;
}

// Convert string to bytes using CP437/CP850 compatible encoding
function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const code = text.charCodeAt(i);
    
    // Map common Portuguese characters to CP850/CP437 codes
    const charMap: Record<string, number> = {
      'á': 0xA0, 'à': 0x85, 'â': 0x83, 'ã': 0xC6,
      'é': 0x82, 'è': 0x8A, 'ê': 0x88,
      'í': 0xA1, 'ì': 0x8D, 'î': 0x8C,
      'ó': 0xA2, 'ò': 0x95, 'ô': 0x93, 'õ': 0xC7,
      'ú': 0xA3, 'ù': 0x97, 'û': 0x96,
      'ç': 0x87, 'Ç': 0x80,
      'Á': 0xB5, 'À': 0xB7, 'Â': 0xB6, 'Ã': 0xC7,
      'É': 0x90, 'È': 0xD4, 'Ê': 0xD2,
      'Í': 0xD6, 'Ì': 0xDE, 'Î': 0xD7,
      'Ó': 0xE0, 'Ò': 0xE3, 'Ô': 0xE2, 'Õ': 0xE4,
      'Ú': 0xE9, 'Ù': 0xEB, 'Û': 0xEA,
      'ñ': 0xA4, 'Ñ': 0xA5,
      '°': 0xF8,
      '²': 0xFD,
      '³': 0xFC,
    };
    
    if (charMap[char]) {
      bytes.push(charMap[char]);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      // Fallback for unknown characters
      bytes.push(0x3F); // '?'
    }
  }
  return bytes;
}

function addLine(bytes: number[], text: string): void {
  bytes.push(...textToBytes(text), LF);
}

export function generateReceiptBytes(data: PrintOrderData): Uint8Array {
  const width = 32;
  const bytes: number[] = [];

  // Initialize printer
  bytes.push(...INIT);

  // Set code page to CP850 (Western European)
  bytes.push(ESC, 0x74, 0x02);

  // Header
  bytes.push(...CENTER);
  bytes.push(...DOUBLE_SIZE);
  addLine(bytes, data.orderType === 'delivery' ? 'DELIVERY' : 'COMANDA');
  bytes.push(...NORMAL_SIZE);
  addLine(bytes, `#${data.orderNumber}`);
  bytes.push(LF);

  // Order info
  bytes.push(...LEFT);
  if (data.orderType === 'table' && data.tableName) {
    bytes.push(...BOLD_ON);
    addLine(bytes, `Mesa: ${data.tableName}`);
    bytes.push(...BOLD_OFF);
    if (data.waiterName) {
      addLine(bytes, `Garcom: ${data.waiterName}`);
    }
  } else if (data.orderType === 'delivery') {
    bytes.push(...BOLD_ON);
    addLine(bytes, `Cliente: ${data.customerName || ''}`);
    bytes.push(...BOLD_OFF);
    if (data.customerPhone) {
      addLine(bytes, `Tel: ${data.customerPhone}`);
    }
    if (data.address) {
      addLine(bytes, `${data.address.street}, ${data.address.number}`);
      addLine(bytes, data.address.neighborhood);
      if (data.address.complement) {
        // Wrap complement text to fit within printer width
        const complementLines = wrapText(data.address.complement, width - 2, '  ');
        complementLines.forEach(line => addLine(bytes, line));
      }
    }
  }

  // Date/time
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  addLine(bytes, `Data: ${dateStr} ${timeStr}`);
  addLine(bytes, dashedLine(width));

  // Items header
  bytes.push(...BOLD_ON);
  addLine(bytes, formatLine('ITEM', 'TOTAL', width));
  bytes.push(...BOLD_OFF);
  addLine(bytes, dashedLine(width));

  // Items
  data.items.forEach(item => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    addLine(bytes, `${item.quantity}x ${item.name}`);
    bytes.push(...RIGHT);
    addLine(bytes, itemTotal);
    bytes.push(...LEFT);
    if (item.observation) {
      addLine(bytes, `  Obs: ${item.observation}`);
    }
  });

  addLine(bytes, dashedLine(width));

  // Totals
  addLine(bytes, formatLine('Subtotal:', formatCurrency(data.subtotal), width));
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    addLine(bytes, formatLine('Taxa de entrega:', formatCurrency(data.deliveryFee), width));
  }
  
  if (data.serviceFee && data.serviceFee > 0) {
    addLine(bytes, formatLine('Taxa de servico:', formatCurrency(data.serviceFee), width));
  }
  
  if (data.discount && data.discount > 0) {
    addLine(bytes, formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width));
  }

  addLine(bytes, dashedLine(width));
  bytes.push(...BOLD_ON);
  bytes.push(...DOUBLE_HEIGHT);
  addLine(bytes, formatLine('TOTAL:', formatCurrency(data.total), width));
  bytes.push(...NORMAL_SIZE);
  bytes.push(...BOLD_OFF);

  if (data.paymentMethod) {
    bytes.push(LF);
    addLine(bytes, `Pagamento: ${data.paymentMethod}`);
    if (data.changeFor && data.changeFor > 0) {
      addLine(bytes, `Troco para: ${formatCurrency(data.changeFor)}`);
    }
  }

  // Footer
  bytes.push(LF);
  bytes.push(...CENTER);
  addLine(bytes, 'Obrigado pela preferencia!');
  bytes.push(...FEED_3);

  // Cut paper
  bytes.push(...CUT);

  return new Uint8Array(bytes);
}

// Legacy text version for compatibility
export function generateReceiptText(data: PrintOrderData): string {
  const width = 32;
  let receipt = '';

  // ESC/POS as text (legacy)
  const ESC_T = '\x1B';
  const GS_T = '\x1D';
  
  receipt += ESC_T + '@'; // Init
  receipt += ESC_T + 'a\x01'; // Center
  receipt += ESC_T + '!\x30'; // Double size
  receipt += (data.orderType === 'delivery' ? 'DELIVERY' : 'COMANDA') + '\n';
  receipt += ESC_T + '!\x00'; // Normal
  receipt += `#${data.orderNumber}\n\n`;

  receipt += ESC_T + 'a\x00'; // Left
  if (data.orderType === 'table' && data.tableName) {
    receipt += ESC_T + 'E\x01'; // Bold
    receipt += `Mesa: ${data.tableName}\n`;
    receipt += ESC_T + 'E\x00';
    if (data.waiterName) {
      receipt += `Garcom: ${data.waiterName}\n`;
    }
  } else if (data.orderType === 'delivery') {
    receipt += ESC_T + 'E\x01';
    receipt += `Cliente: ${data.customerName}\n`;
    receipt += ESC_T + 'E\x00';
    if (data.customerPhone) {
      receipt += `Tel: ${data.customerPhone}\n`;
    }
    if (data.address) {
      receipt += `${data.address.street}, ${data.address.number}\n`;
      receipt += `${data.address.neighborhood}\n`;
      if (data.address.complement) {
        receipt += `${data.address.complement}\n`;
      }
    }
  }

  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  receipt += `Data: ${dateStr} ${timeStr}\n`;
  receipt += dashedLine(width) + '\n';

  receipt += ESC_T + 'E\x01';
  receipt += formatLine('ITEM', 'TOTAL', width) + '\n';
  receipt += ESC_T + 'E\x00';
  receipt += dashedLine(width) + '\n';

  data.items.forEach(item => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    receipt += `${item.quantity}x ${item.name}\n`;
    receipt += ESC_T + 'a\x02';
    receipt += `${itemTotal}\n`;
    receipt += ESC_T + 'a\x00';
    if (item.observation) {
      receipt += `  Obs: ${item.observation}\n`;
    }
  });

  receipt += dashedLine(width) + '\n';
  receipt += formatLine('Subtotal:', formatCurrency(data.subtotal), width) + '\n';
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    receipt += formatLine('Taxa de entrega:', formatCurrency(data.deliveryFee), width) + '\n';
  }
  if (data.serviceFee && data.serviceFee > 0) {
    receipt += formatLine('Taxa de servico:', formatCurrency(data.serviceFee), width) + '\n';
  }
  if (data.discount && data.discount > 0) {
    receipt += formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width) + '\n';
  }

  receipt += dashedLine(width) + '\n';
  receipt += ESC_T + 'E\x01' + ESC_T + '!\x10';
  receipt += formatLine('TOTAL:', formatCurrency(data.total), width) + '\n';
  receipt += ESC_T + '!\x00' + ESC_T + 'E\x00';

  if (data.paymentMethod) {
    receipt += `\nPagamento: ${data.paymentMethod}\n`;
  }

  receipt += '\n' + ESC_T + 'a\x01';
  receipt += 'Obrigado pela preferencia!\n\n\n';
  receipt += GS_T + 'V\x00';

  return receipt;
}

export async function printReceipt(data: PrintOrderData): Promise<boolean> {
  try {
    // Check if Web Serial API is supported
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API não suportada neste navegador. Use Chrome ou Edge.');
    }

    // Request port access
    const port = await (navigator as any).serial.requestPort();
    
    // Open the port with common thermal printer settings
    await port.open({ 
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });

    const writer = port.writable.getWriter();
    
    // Generate receipt as raw bytes
    const receiptBytes = generateReceiptBytes(data);
    
    // Send bytes directly (not encoded text)
    await writer.write(receiptBytes);
    
    writer.releaseLock();
    await port.close();

    return true;
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    throw error;
  }
}

// Browser print fallback using window.print()
export function printReceiptBrowser(data: PrintOrderData): void {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    throw new Error('Não foi possível abrir janela de impressão');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido #${data.orderNumber}</title>
      <style>
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          width: 80mm; 
          margin: 0; 
          padding: 10px;
          box-sizing: border-box;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .double { font-size: 18px; font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; }
        .item { margin: 5px 0; }
        .obs { font-size: 10px; color: #666; margin-left: 10px; }
        .complement { 
          word-wrap: break-word; 
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="center double">${data.orderType === 'delivery' ? 'DELIVERY' : 'COMANDA'}</div>
      <div class="center bold">#${data.orderNumber}</div>
      <br>
      ${data.orderType === 'table' && data.tableName ? `
        <div class="bold">Mesa: ${data.tableName}</div>
        ${data.waiterName ? `<div>Garçom: ${data.waiterName}</div>` : ''}
      ` : ''}
      ${data.orderType === 'delivery' ? `
        <div class="bold">Cliente: ${data.customerName || ''}</div>
        ${data.customerPhone ? `<div>Tel: ${data.customerPhone}</div>` : ''}
        ${data.address ? `
          <div>${data.address.street}, ${data.address.number}</div>
          <div>${data.address.neighborhood}</div>
          ${data.address.complement ? `<div class="complement">${data.address.complement}</div>` : ''}
        ` : ''}
      ` : ''}
      <div>Data: ${data.createdAt.toLocaleDateString('pt-BR')} ${data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="line"></div>
      <div class="row bold"><span>ITEM</span><span>TOTAL</span></div>
      <div class="line"></div>
      ${data.items.map(item => `
        <div class="item">
          <div class="row">
            <span>${item.quantity}x ${item.name}</span>
            <span>${formatCurrency(item.quantity * item.unitPrice)}</span>
          </div>
          ${item.observation ? `<div class="obs">Obs: ${item.observation}</div>` : ''}
        </div>
      `).join('')}
      <div class="line"></div>
      <div class="row"><span>Subtotal:</span><span>${formatCurrency(data.subtotal)}</span></div>
      ${data.deliveryFee && data.deliveryFee > 0 ? `<div class="row"><span>Taxa de entrega:</span><span>${formatCurrency(data.deliveryFee)}</span></div>` : ''}
      ${data.serviceFee && data.serviceFee > 0 ? `<div class="row"><span>Taxa de serviço:</span><span>${formatCurrency(data.serviceFee)}</span></div>` : ''}
      ${data.discount && data.discount > 0 ? `<div class="row"><span>Desconto:</span><span>-${formatCurrency(data.discount)}</span></div>` : ''}
      <div class="line"></div>
      <div class="row double"><span>TOTAL:</span><span>${formatCurrency(data.total)}</span></div>
      ${data.paymentMethod ? `
        <div>Pagamento: ${data.paymentMethod}</div>
        ${data.changeFor && data.changeFor > 0 ? `<div>Troco para: ${formatCurrency(data.changeFor)}</div>` : ''}
      ` : ''}
      <br>
      <div class="center">Obrigado pela preferência!</div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Fallback: Generate text for copying or viewing
export function generatePrintableText(data: PrintOrderData): string {
  const width = 32; // Thermal printer width (58mm)
  let text = '';
  
  // Helper for centering text
  const centerText = (str: string): string => {
    const padding = Math.max(0, Math.floor((width - str.length) / 2));
    return ' '.repeat(padding) + str;
  };

  // ========== 1. HEADER ==========
  // Store name centered
  if (data.storeName) {
    const storeName = data.storeName.toUpperCase();
    if (storeName.length <= width) {
      text += centerText(storeName) + '\n';
    } else {
      // Wrap store name if too long
      const wrappedName = wrapText(storeName, width, '');
      wrappedName.forEach(line => text += centerText(line.trim()) + '\n');
    }
  }
  
  // Order type centered
  let orderTypeLabel = 'DELIVERY';
  if (data.orderType === 'table') {
    orderTypeLabel = 'CONSUMIR NO LOCAL';
  } else if (data.orderType === 'pickup') {
    orderTypeLabel = 'RETIRAR NO LOCAL';
  }
  text += centerText(orderTypeLabel) + '\n';
  
  // Order ID centered
  text += centerText(`PEDIDO #${data.orderNumber}`) + '\n';
  text += '-'.repeat(width) + '\n';

  // ========== 2. ORDER INFO ==========
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  text += `Data: ${dateStr}\n`;
  text += `Hora: ${timeStr}\n`;
  text += '-'.repeat(width) + '\n';

  // ========== 3. CUSTOMER INFO ==========
  text += 'CLIENTE\n';
  if (data.customerName) {
    text += `${data.customerName}\n`;
  }
  if (data.customerPhone) {
    text += `Tel: ${data.customerPhone}\n`;
  }
  if (data.orderType === 'table' && data.waiterName) {
    text += `Garcom: ${data.waiterName}\n`;
  }
  if (data.customerCount) {
    text += `Pessoas: ${data.customerCount}\n`;
  }

  // ========== 4. DELIVERY ADDRESS ==========
  if (data.orderType === 'delivery' && data.address) {
    text += '-'.repeat(width) + '\n';
    text += 'ENDERECO DE ENTREGA\n';
    const fullAddress = `${data.address.street}, ${data.address.number} - ${data.address.neighborhood}`;
    const wrappedAddress = wrapText(fullAddress, width, '');
    wrappedAddress.forEach(line => text += line + '\n');
    if (data.address.complement) {
      const wrappedComplement = wrapText(data.address.complement, width, '');
      wrappedComplement.forEach(line => text += line + '\n');
    }
    if (data.address.reference) {
      const wrappedRef = wrapText(`Ref: ${data.address.reference}`, width, '');
      wrappedRef.forEach(line => text += line + '\n');
    }
  }

  text += '-'.repeat(width) + '\n';

  // ========== 5. ORDER ITEMS ==========
  text += 'ITENS DO PEDIDO\n';
  text += '-'.repeat(width) + '\n';

  data.items.forEach((item, index) => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    const itemLine = `${item.quantity}x ${item.name}`;
    
    // Item name (may wrap)
    const wrappedItem = wrapText(itemLine, width - itemTotal.length - 1, '');
    if (wrappedItem.length === 1) {
      // Single line - put price on same line
      text += formatLine(itemLine, itemTotal, width) + '\n';
    } else {
      // Multiple lines - put price on last line
      wrappedItem.forEach((line, i) => {
        if (i === wrappedItem.length - 1) {
          text += formatLine(line, itemTotal, width) + '\n';
        } else {
          text += line + '\n';
        }
      });
    }
    
    // Observation
    if (item.observation) {
      const wrappedObs = wrapText(`Obs: ${item.observation}`, width - 2, '  ');
      wrappedObs.forEach(line => text += line + '\n');
    }
    
    // Separator between items
    if (index < data.items.length - 1) {
      text += '----\n';
    }
  });

  text += '-'.repeat(width) + '\n';

  // ========== 7. TOTAL ITEM QUANTITY ==========
  const totalItemQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  text += `Qtd Total de Itens: ${totalItemQuantity}\n`;
  text += '-'.repeat(width) + '\n';

  // ========== 8. FINANCIAL SUMMARY ==========
  text += formatLine('Subtotal:', formatCurrency(data.subtotal), width) + '\n';
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    text += formatLine('Taxa Entrega:', formatCurrency(data.deliveryFee), width) + '\n';
  }
  
  if (data.serviceFee && data.serviceFee > 0) {
    text += formatLine('Taxa Servico:', formatCurrency(data.serviceFee), width) + '\n';
  }
  
  if (data.discount && data.discount > 0) {
    text += formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width) + '\n';
  }

  text += '='.repeat(width) + '\n';
  text += formatLine('TOTAL:', formatCurrency(data.total), width) + '\n';
  text += '='.repeat(width) + '\n';

  // ========== 9. PAYMENT METHOD ==========
  if (data.paymentMethod) {
    text += `PAGAMENTO: ${data.paymentMethod}\n`;
    if (data.changeFor && data.changeFor > 0) {
      text += `Troco para: ${formatCurrency(data.changeFor)}\n`;
    }
  }

  // ========== 10. FOOTER ==========
  text += '-'.repeat(width) + '\n';
  text += centerText('Obrigado pela preferencia!') + '\n';

  return text;
}

// Generate thermal-optimized PDF for direct printing (dynamic height, no dividers)
export function generateThermalPDF(data: PrintOrderData): void {
  // Thermal paper width: 80mm
  const paperWidth = 80;
  const margin = 3;
  const contentWidth = paperWidth - (margin * 2);
  
  const fontSize = {
    small: 7,
    normal: 8,
    large: 10,
    title: 12
  };
  
  const formatCurrencyPDF = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // First pass: calculate total height needed with more accurate measurements
  // Using approximately 0.35mm per point of font size for line height
  const lineMultiplier = 0.45;
  let estimatedHeight = 5; // Initial top spacing (reduced from 10)
  
  // Header
  if (data.storeName) estimatedHeight += fontSize.title * lineMultiplier;
  estimatedHeight += fontSize.large * lineMultiplier; // Order type
  estimatedHeight += fontSize.normal * lineMultiplier; // Order ID
  estimatedHeight += 3; // Spacing
  
  // Date/time
  estimatedHeight += fontSize.normal * lineMultiplier * 2 + 2;
  
  // Customer info
  estimatedHeight += fontSize.normal * lineMultiplier; // Title
  if (data.orderType === 'table') {
    if (data.tableName) estimatedHeight += fontSize.normal * lineMultiplier;
    if (data.waiterName) estimatedHeight += fontSize.normal * lineMultiplier;
    if (data.customerCount) estimatedHeight += fontSize.normal * lineMultiplier;
  } else {
    if (data.customerName) estimatedHeight += fontSize.normal * lineMultiplier;
    if (data.customerPhone) estimatedHeight += fontSize.normal * lineMultiplier;
  }
  estimatedHeight += 2;
  
  // Address (if delivery)
  if (data.orderType === 'delivery' && data.address) {
    estimatedHeight += fontSize.normal * lineMultiplier + 2; // Title
    estimatedHeight += fontSize.normal * lineMultiplier * 2; // Address lines
    if (data.address.complement) {
      // Estimate wrapped lines for complement
      const complementLines = Math.ceil((data.address.complement.length * fontSize.small * 0.3) / contentWidth);
      estimatedHeight += fontSize.small * lineMultiplier * Math.max(1, complementLines);
    }
    if (data.address.reference) estimatedHeight += fontSize.small * lineMultiplier;
    estimatedHeight += 2;
  }
  
  // Items title
  estimatedHeight += fontSize.normal * lineMultiplier + 2;
  
  // Items - more accurate calculation
  data.items.forEach(item => {
    // Item name line (may wrap)
    const itemText = `${item.quantity}x ${item.name}`;
    const itemLines = Math.ceil((itemText.length * fontSize.normal * 0.25) / contentWidth);
    estimatedHeight += fontSize.normal * lineMultiplier * Math.max(1, itemLines);
    estimatedHeight += fontSize.normal * lineMultiplier; // Price line
    
    if (item.observation) {
      const obsLines = Math.ceil((item.observation.length * fontSize.small * 0.25) / contentWidth);
      estimatedHeight += fontSize.small * lineMultiplier * Math.max(1, obsLines);
    }
    estimatedHeight += 1; // Small spacing between items
  });
  
  // Quantity total
  estimatedHeight += fontSize.normal * lineMultiplier + 2;
  
  // Financial summary
  estimatedHeight += fontSize.normal * lineMultiplier; // Subtotal
  if (data.deliveryFee && data.deliveryFee > 0) estimatedHeight += fontSize.normal * lineMultiplier;
  if (data.serviceFee && data.serviceFee > 0) estimatedHeight += fontSize.normal * lineMultiplier;
  if (data.discount && data.discount > 0) estimatedHeight += fontSize.normal * lineMultiplier;
  estimatedHeight += 1 + fontSize.large * lineMultiplier + 2; // TOTAL
  
  // Payment
  if (data.paymentMethod) {
    estimatedHeight += fontSize.normal * lineMultiplier;
    if (data.changeFor && data.changeFor > 0) estimatedHeight += fontSize.normal * lineMultiplier;
  }
  
  // Footer
  estimatedHeight += 3 + fontSize.normal * lineMultiplier + 3; // Reduced final padding
  
  // Create PDF with calculated height (minimum 40mm, no extra padding)
  const finalHeight = Math.max(40, Math.ceil(estimatedHeight));
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, finalHeight]
  });
  
  let y = 5; // Small initial spacing

  // Helper to add text and advance y
  const addText = (text: string, size: number = fontSize.normal, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false): void => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    
    const textWidth = doc.getTextWidth(text);
    let x = margin;
    
    if (align === 'center') {
      x = (paperWidth - textWidth) / 2;
    } else if (align === 'right') {
      x = paperWidth - margin - textWidth;
    }
    
    doc.text(text, x, y);
    y += size * 0.45;
  };

  // Helper to add wrapped text
  const addWrappedText = (text: string, size: number = fontSize.normal, align: 'left' | 'center' | 'right' = 'left'): void => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      let x = margin;
      if (align === 'center') {
        x = (paperWidth - doc.getTextWidth(line)) / 2;
      } else if (align === 'right') {
        x = paperWidth - margin - doc.getTextWidth(line);
      }
      doc.text(line, x, y);
      y += size * 0.45;
    });
  };

  // Helper to add line with left and right aligned text
  const addLineLeftRight = (left: string, right: string, size: number = fontSize.normal, bold: boolean = false): void => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(left, margin, y);
    const rightWidth = doc.getTextWidth(right);
    doc.text(right, paperWidth - margin - rightWidth, y);
    y += size * 0.45;
  };

  // Helper to add vertical spacing
  const addSpacing = (space: number = 2): void => {
    y += space;
  };

  // ========== 1. HEADER ==========
  // Store name centered
  if (data.storeName) {
    addText(data.storeName.toUpperCase(), fontSize.title, 'center', true);
  }
  
  // Order type
  let orderTypeLabel = 'DELIVERY';
  if (data.orderType === 'table') {
    orderTypeLabel = 'CONSUMIR NO LOCAL';
  } else if (data.orderType === 'pickup') {
    orderTypeLabel = 'RETIRAR NO LOCAL';
  }
  addText(orderTypeLabel, fontSize.large, 'center', true);
  
  // Order ID
  addText(`PEDIDO #${data.orderNumber}`, fontSize.normal, 'center', true);
  
  addSpacing(3);

  // ========== 2. ORDER INFO ==========
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  addText(`Data: ${dateStr}`, fontSize.normal, 'left');
  addText(`Hora: ${timeStr}`, fontSize.normal, 'left');
  
  addSpacing(2);

  // ========== 3. CUSTOMER INFO ==========
  addText('CLIENTE', fontSize.normal, 'left', true);
  
  if (data.orderType === 'table' && data.tableName) {
    addText(`Mesa: ${data.tableName}`, fontSize.normal, 'left');
    if (data.waiterName) {
      addText(`Garcom: ${data.waiterName}`, fontSize.normal, 'left');
    }
    if (data.customerCount) {
      addText(`Pessoas: ${data.customerCount}`, fontSize.normal, 'left');
    }
  } else {
    if (data.customerName) {
      addText(data.customerName, fontSize.normal, 'left');
    }
    if (data.customerPhone) {
      addText(`Tel: ${data.customerPhone}`, fontSize.normal, 'left');
    }
  }

  // ========== 4. DELIVERY ADDRESS ==========
  if (data.orderType === 'delivery' && data.address) {
    addSpacing(2);
    addText('ENDERECO DE ENTREGA', fontSize.normal, 'left', true);
    
    const fullAddress = `${data.address.street}, ${data.address.number} - ${data.address.neighborhood}`;
    addWrappedText(fullAddress, fontSize.normal, 'left');
    
    if (data.address.complement) {
      addWrappedText(data.address.complement, fontSize.small, 'left');
    }
    if (data.address.reference) {
      addWrappedText(`Ref: ${data.address.reference}`, fontSize.small, 'left');
    }
  }

  addSpacing(3);

  // ========== 5. ORDER ITEMS ==========
  addText('ITENS DO PEDIDO', fontSize.normal, 'left', true);
  addSpacing(1);

  data.items.forEach((item) => {
    const itemTotal = formatCurrencyPDF(item.quantity * item.unitPrice);
    const itemText = `${item.quantity}x ${item.name}`;
    
    // Item name and price
    doc.setFontSize(fontSize.normal);
    doc.setFont('helvetica', 'normal');
    
    const itemLines = doc.splitTextToSize(itemText, contentWidth - doc.getTextWidth(itemTotal) - 5);
    
    itemLines.forEach((line: string, i: number) => {
      doc.text(line, margin, y);
      if (i === itemLines.length - 1) {
        const priceWidth = doc.getTextWidth(itemTotal);
        doc.text(itemTotal, paperWidth - margin - priceWidth, y);
      }
      y += fontSize.normal * 0.45;
    });
    
    // Observation
    if (item.observation) {
      doc.setFontSize(fontSize.small);
      doc.setFont('helvetica', 'italic');
      const obsLines = doc.splitTextToSize(`Obs: ${item.observation}`, contentWidth - 4);
      obsLines.forEach((line: string) => {
        doc.text(line, margin + 2, y);
        y += fontSize.small * 0.45;
      });
    }
    
    addSpacing(1);
  });

  addSpacing(2);

  // ========== 6. TOTAL ITEM QUANTITY ==========
  const totalItemQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  addText(`Qtd Total de Itens: ${totalItemQuantity}`, fontSize.normal, 'left', true);
  
  addSpacing(2);

  // ========== 7. FINANCIAL SUMMARY ==========
  addLineLeftRight('Subtotal:', formatCurrencyPDF(data.subtotal), fontSize.normal);
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    addLineLeftRight('Taxa Entrega:', formatCurrencyPDF(data.deliveryFee), fontSize.normal);
  }
  
  if (data.serviceFee && data.serviceFee > 0) {
    addLineLeftRight('Taxa Servico:', formatCurrencyPDF(data.serviceFee), fontSize.normal);
  }
  
  if (data.discount && data.discount > 0) {
    addLineLeftRight('Desconto:', `-${formatCurrencyPDF(data.discount)}`, fontSize.normal);
  }

  addSpacing(1);
  
  // TOTAL highlighted
  addLineLeftRight('TOTAL:', formatCurrencyPDF(data.total), fontSize.large, true);
  
  addSpacing(2);

  // ========== 8. PAYMENT METHOD ==========
  if (data.paymentMethod) {
    addText(`PAGAMENTO: ${data.paymentMethod.toUpperCase()}`, fontSize.normal, 'left', true);
    if (data.changeFor && data.changeFor > 0) {
      addText(`Troco para: ${formatCurrencyPDF(data.changeFor)}`, fontSize.normal, 'left');
    }
  }

  // ========== 9. FOOTER ==========
  addSpacing(3);
  addText('Obrigado pela preferencia!', fontSize.normal, 'center');

  // Direct print - open print dialog immediately
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Generate A4 PDF for order details
export function generateOrderPDF(data: PrintOrderData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const bottomMargin = 20;
  
  let y = margin;
  let currentPage = 1;
  
  const formatCurrencyPDF = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Helper function to check and add new page if needed
  const checkPageBreak = (requiredSpace: number, sectionTitle?: string): void => {
    if (y + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage();
      currentPage++;
      y = margin;
      
      // If we're in the items section, repeat the header
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

  // Get order type label
  const getOrderTypeLabel = () => {
    switch (data.orderType) {
      case 'delivery': return 'Delivery';
      case 'pickup': return 'Retirar no Local';
      case 'table': return 'Consumir no Local';
      default: return 'Pedido';
    }
  };

  // ========== 1. HEADER (Reduced size) ==========
  doc.setFillColor(45, 45, 45);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Store name at top
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const storeName = data.storeName || 'Estabelecimento';
  doc.text(storeName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });
  
  // Order type below store name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(getOrderTypeLabel(), pageWidth / 2, 22, { align: 'center' });
  
  // Order ID
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Pedido #${data.orderNumber}`, pageWidth / 2, 31, { align: 'center' });
  
  y = 45;
  doc.setTextColor(0, 0, 0);
  
  // ========== 2. ORDER INFO (Date/Time) ==========
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y - 2, contentWidth, 14, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Data: ${dateStr}`, margin + 5, y + 5);
  doc.text(`Horário: ${timeStr}`, margin + 80, y + 5);
  
  y += 20;
  
  // ========== 3. CUSTOMER/TABLE INFO ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('INFORMAÇÕES DO CLIENTE', margin, y);
  
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  if (data.orderType === 'table' && data.tableName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Mesa:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tableName, margin + 20, y);
    y += 7;
    
    if (data.waiterName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Garçom:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.waiterName, margin + 25, y);
      y += 7;
    }
    
    if (data.customerCount && data.customerCount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Pessoas:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(data.customerCount), margin + 25, y);
      y += 7;
    }
  } else {
    if (data.customerName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nome:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.customerName, margin + 22, y);
      y += 7;
    }
    
    if (data.customerPhone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.customerPhone, margin + 28, y);
      y += 7;
    }
  }
  
  y += 5;
  
  // ========== 4. DELIVERY ADDRESS (when applicable) ==========
  if (data.orderType === 'delivery' && data.address) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('ENDEREÇO DE ENTREGA', margin, y);
    
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`${data.address.street}, ${data.address.number}`, margin, y);
    y += 6;
    doc.text(`Bairro: ${data.address.neighborhood}`, margin, y);
    y += 6;
    
    if (data.address.complement) {
      doc.setFont('helvetica', 'bold');
      doc.text('Complemento:', margin, y);
      doc.setFont('helvetica', 'normal');
      const complementLines = doc.splitTextToSize(data.address.complement, contentWidth - 35);
      doc.text(complementLines, margin + 35, y);
      y += (complementLines.length * 5) + 2;
    }
    
    if (data.address.reference) {
      doc.setFont('helvetica', 'bold');
      doc.text('Referência:', margin, y);
      doc.setFont('helvetica', 'normal');
      const refLines = doc.splitTextToSize(data.address.reference, contentWidth - 30);
      doc.text(refLines, margin + 30, y);
      y += (refLines.length * 5) + 2;
    }
    
    y += 5;
  }
  
  // ========== 5. ORDER ITEMS ==========
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('ITENS DO PEDIDO', margin, y);
  
  y += 2;
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
  
  // ========== 6. ITEMS WITH PAGE BREAK SUPPORT ==========
  data.items.forEach((item, index) => {
    // Calculate required space for this item
    let itemHeight = 12;
    if (item.observation) {
      itemHeight += 6;
    }
    
    // Check if we need a new page
    checkPageBreak(itemHeight, 'ITENS DO PEDIDO');
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y - 4, contentWidth, itemHeight, 'F');
    }
    
    const itemTotal = item.quantity * item.unitPrice;
    
    // Quantity
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.quantity), margin + 8, y);
    doc.setFont('helvetica', 'normal');
    
    // Item name (with truncation if too long)
    const maxNameLength = 45;
    const itemName = item.name.length > maxNameLength 
      ? item.name.substring(0, maxNameLength) + '...' 
      : item.name;
    doc.text(itemName, margin + 20, y);
    
    // Unit price and total
    doc.text(formatCurrencyPDF(item.unitPrice), pageWidth - margin - 50, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyPDF(itemTotal), pageWidth - margin - 20, y);
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
  
  // ========== 7. FINANCIAL SUMMARY ==========
  // Check if we have enough space for the summary
  checkPageBreak(70);
  
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryX = margin + 100;
  const valueX = pageWidth - margin - 5;
  
  // Calculate total quantity of items
  const totalItemQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Total item quantity
  doc.setFont('helvetica', 'bold');
  doc.text('Quantidade Total de Itens:', summaryX, y);
  doc.text(String(totalItemQuantity), valueX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 10;
  
  // Subtotal
  doc.text('Subtotal:', summaryX, y);
  doc.text(formatCurrencyPDF(data.subtotal), valueX, y, { align: 'right' });
  y += 7;
  
  // Delivery fee (if applicable)
  if (data.deliveryFee && data.deliveryFee > 0) {
    doc.text('Taxa de Entrega:', summaryX, y);
    doc.text(formatCurrencyPDF(data.deliveryFee), valueX, y, { align: 'right' });
    y += 7;
  }
  
  // Service fee (if applicable)
  if (data.serviceFee && data.serviceFee > 0) {
    doc.text('Taxa de Serviço:', summaryX, y);
    doc.text(formatCurrencyPDF(data.serviceFee), valueX, y, { align: 'right' });
    y += 7;
  }
  
  // Discount (if applicable)
  if (data.discount && data.discount > 0) {
    doc.setTextColor(0, 130, 0);
    doc.text('Desconto:', summaryX, y);
    doc.text(`-${formatCurrencyPDF(data.discount)}`, valueX, y, { align: 'right' });
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
  doc.text(formatCurrencyPDF(data.total), valueX, y + 6, { align: 'right' });
  
  y += 25;
  doc.setTextColor(0, 0, 0);
  
  // ========== 8. PAYMENT METHOD ==========
  if (data.paymentMethod) {
    checkPageBreak(25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('FORMA DE PAGAMENTO', margin, y);
    
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(data.paymentMethod, margin, y);
    y += 7;
    
    if (data.changeFor && data.changeFor > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Troco para:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrencyPDF(data.changeFor), margin + 32, y);
    }
  }
  
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
  
  // Download PDF
  const fileName = data.orderType === 'table' 
    ? `comanda-${data.tableName?.replace(/\s/g, '-')}-${data.orderNumber}.pdf`
    : `pedido-${data.orderNumber}.pdf`;
  doc.save(fileName);
}
