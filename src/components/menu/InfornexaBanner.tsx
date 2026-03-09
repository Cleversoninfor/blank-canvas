import logoInfornexa from '@/assets/logo-infornexa.png';
import { MessageCircle } from 'lucide-react';

const InfornexaBanner = () => {
  const whatsappNumber = '5581996465310';
  const whatsappMessage = encodeURIComponent('Olá! Gostaria de ter um cardápio digital.');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div 
      className="mx-4 mt-8 mb-4 rounded-2xl p-6 sm:p-8"
      style={{ backgroundColor: '#23354D' }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img 
            src={logoInfornexa} 
            alt="Infornexa Logo" 
            className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-white text-lg sm:text-xl font-bold mb-2">
            Quer um cardápio digital assim para seu negócio?
          </h3>
          <p className="text-white/80 text-sm sm:text-base mb-4">
            Entre em contato conosco e tenha seu próprio cardápio digital profissional!
          </p>

          {/* WhatsApp Button */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Falar no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export { InfornexaBanner };
