import { MessageCircle } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStore';

export function WhatsAppFloatingButton() {
  const { data: store } = useStoreConfig();

  if (!store?.phone_whatsapp) return null;

  const phone = store.phone_whatsapp.replace(/\D/g, '');
  const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent('Olá! Vim pelo cardápio digital.')}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors animate-in fade-in"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
