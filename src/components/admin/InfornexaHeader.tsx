import { MessageCircle } from 'lucide-react';
import logoInfornexa from '@/assets/logo-infornexa-header.png';

export function InfornexaHeader() {
  const whatsappNumber = '5581996465310';
  const whatsappMessage = encodeURIComponent('Olá, preciso de suporte.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const handleWhatsAppClick = () => {
    console.log('[InfornexaHeader] WhatsApp button clicked');
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <header 
      className="w-full py-2 px-4 relative z-20"
      style={{ backgroundColor: '#23354D' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={logoInfornexa} 
            alt="Logo Infornexa" 
            className="h-10 w-auto"
          />
          <span className="text-white text-sm font-medium hidden sm:block">
            O seu cardápio digital, Boas vendas
          </span>
        </div>
        
        <button
          type="button"
          onClick={handleWhatsAppClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[#25D366] hover:bg-[#20BA5A] text-white transition-colors cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          Suporte
        </button>
      </div>
    </header>
  );
}
