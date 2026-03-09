import { useStoreConfig } from './useStore';
import { useBusinessHours, isStoreCurrentlyOpen } from './useBusinessHours';

export interface StoreStatus {
  isOpen: boolean;
  reason: 'open' | 'manual_closed' | 'hours_closed';
  message: string;
  isForcedOpen: boolean;
}

/**
 * Hook que combina o status manual da loja (is_open) com os horários de funcionamento.
 * 
 * REGRAS (NOVA LÓGICA - Horários são prioridade):
 * 1. Se fora do horário de funcionamento -> Loja FECHADA (automaticamente)
 * 2. Se dentro do horário e is_open = TRUE -> Loja ABERTA (operação normal)
 * 3. Se dentro do horário e is_open = FALSE -> Loja FECHADA (fechamento manual)
 * 
 * O botão is_open funciona como "fechamento manual":
 * - Quando ATIVADO: loja segue os horários de funcionamento
 * - Quando DESATIVADO: fecha a loja manualmente (mesmo dentro do horário)
 */
export function useStoreStatus(): StoreStatus {
  const { data: store } = useStoreConfig();
  const { data: businessHours } = useBusinessHours();

  // Default: loja fechada se não tiver dados
  if (!store) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      message: 'Loja não configurada',
      isForcedOpen: false,
    };
  }

  // Verificar horário de funcionamento
  const hasBusinessHours = businessHours && businessHours.length > 0;
  const isWithinBusinessHours = hasBusinessHours 
    ? isStoreCurrentlyOpen(businessHours) 
    : true; // Se não tem horários configurados, considera aberto

  // REGRA 1: Se fora do horário -> FECHADA (horários são prioridade)
  if (hasBusinessHours && !isWithinBusinessHours) {
    return {
      isOpen: false,
      reason: 'hours_closed',
      message: 'Fora do horário de funcionamento',
      isForcedOpen: false,
    };
  }

  // REGRA 2: Dentro do horário (ou sem horários configurados) e is_open = TRUE -> ABERTA
  if (store.is_open) {
    return {
      isOpen: true,
      reason: 'open',
      message: 'Recebendo pedidos',
      isForcedOpen: true,
    };
  }

  // REGRA 3: Dentro do horário mas fechada manualmente
  return {
    isOpen: false,
    reason: 'manual_closed',
    message: 'Loja fechada temporariamente',
    isForcedOpen: false,
  };
}

/**
 * Hook simples que retorna apenas se a loja está aberta ou não.
 * Usa a mesma lógica combinada de status + horário.
 */
export function useIsStoreOpen(): boolean {
  const status = useStoreStatus();
  return status.isOpen;
}
