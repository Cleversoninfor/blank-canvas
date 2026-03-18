import { useState } from 'react';
import { Clock, Phone, MapPin, Bike } from 'lucide-react';
import { StoreConfig } from '@/hooks/useStore';
import { useBusinessHours, getDayName } from '@/hooks/useBusinessHours';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface StoreInfoProps {
  store: StoreConfig;
}

export function StoreInfo({ store }: StoreInfoProps) {
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const { data: businessHours } = useBusinessHours();
  const storeStatus = useStoreStatus();

  const formatPhone = (phone: string | null) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  // Get Brazil current day
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  });
  const dayName = dayFormatter.format(new Date());
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const currentDay = dayMap[dayName] ?? new Date().getDay();
  
  // Get today's active slots for display
  const todaySlots = businessHours?.filter(h => h.day_of_week === currentDay && h.is_active) || [];
  const todaySchedule = todaySlots.length > 0
    ? todaySlots.map(s => `${formatTime(s.open_time)} - ${formatTime(s.close_time)}`).join(' | ')
    : null;

  // Group hours by day for the modal
  const hoursByDay: Record<number, typeof todaySlots> = {};
  if (businessHours) {
    for (const h of businessHours) {
      if (!hoursByDay[h.day_of_week]) hoursByDay[h.day_of_week] = [];
      hoursByDay[h.day_of_week].push(h);
    }
  }

  return (
    <>
      <div className="mt-4 px-4 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${storeStatus.isOpen ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Clock className={`h-5 w-5 ${storeStatus.isOpen ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${storeStatus.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                {storeStatus.isOpen ? 'Aberto' : 'Fechado'}
              </p>
              {!storeStatus.isForcedOpen && (
                <p className="text-xs text-muted-foreground">
                  {storeStatus.isOpen && todaySchedule
                    ? `Horário: ${todaySchedule}`
                    : storeStatus.message
                  }
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setHoursModalOpen(true)}
            className="flex flex-col sm:flex-row items-center gap-0 sm:gap-1 text-xs sm:text-sm font-semibold uppercase text-primary hover:text-primary/80 transition-colors leading-tight"
          >
            <span>Ver</span>
            <span>Horários</span>
          </button>
        </div>

        {/* Phone */}
        {store.phone_whatsapp && (
          <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatPhone(store.phone_whatsapp)}
                </p>
                <p className="text-xs text-muted-foreground">Entre em contato</p>
              </div>
            </div>
            <a 
              href={`https://api.whatsapp.com/send?phone=55${store.phone_whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent('Olá! Vim pelo cardápio digital.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold uppercase text-primary hover:text-primary/80 transition-colors"
            >
              WhatsApp
            </a>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Localização</p>
              <p className="text-xs text-muted-foreground">
                {store.address || 'Endereço não configurado'}
              </p>
            </div>
          </div>
          {store.address && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold uppercase text-primary hover:text-primary/80 transition-colors"
            >
              Direções
            </a>
          )}
        </div>

        {/* Delivery */}
        <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Bike className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Tempo de entrega</p>
              <p className="text-xs text-muted-foreground">
                {store.delivery_time_min || 30}-{store.delivery_time_max || 45} MIN • TAXA: R$ {Number(store.delivery_fee).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hours Modal - grouped by day with multiple slots */}
      <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Funcionamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 mt-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const daySlots = hoursByDay[day] || [];
              const activeSlots = daySlots.filter(s => s.is_active);
              const isToday = day === currentDay;

              return (
                <div 
                  key={day} 
                  className={`flex items-start justify-between p-3 rounded-lg transition-colors ${
                    isToday ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {getDayName(day)}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">Hoje</Badge>
                    )}
                  </div>
                  <div className="text-right space-y-0.5">
                    {activeSlots.length > 0 ? (
                      activeSlots.map((slot) => (
                        <p key={slot.id} className="text-sm text-foreground">
                          {formatTime(slot.open_time)} - {formatTime(slot.close_time)}
                        </p>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Fechado</span>
                    )}
                  </div>
                </div>
              );
            })}

            {(!businessHours || businessHours.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Horários não configurados
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
