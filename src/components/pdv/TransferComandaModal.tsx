import { useState } from 'react';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Comanda, useComandas, useTransferOrders } from '@/hooks/useComandas';
import { useToast } from '@/hooks/use-toast';

interface TransferComandaModalProps {
  sourceComanda: Comanda;
  open: boolean;
  onClose: () => void;
}

export function TransferComandaModal({ sourceComanda, open, onClose }: TransferComandaModalProps) {
  const { toast } = useToast();
  const { data: comandas = [], isLoading } = useComandas();
  const transferOrders = useTransferOrders();
  const [targetComanda, setTargetComanda] = useState<Comanda | null>(null);

  // List only occupied comandas, excluding the current one
  const targetOptions = comandas.filter(c => c.status === 'ocupada' && c.id !== sourceComanda.id);

  const handleTransfer = async () => {
    if (!targetComanda) return;

    try {
      await transferOrders.mutateAsync({
        sourceComandaId: sourceComanda.id,
        targetComandaId: targetComanda.id,
      });

      toast({
        title: 'Transferência concluída!',
        description: `Pedidos transferidos da Comanda #${sourceComanda.numero_comanda} para a #${targetComanda.numero_comanda}.`,
      });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Erro na transferência',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir Comanda #{sourceComanda.numero_comanda}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Origem</p>
              <p className="text-lg font-bold">#{sourceComanda.numero_comanda}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Destino</p>
              {targetComanda ? (
                <p className="text-lg font-bold text-primary">#{targetComanda.numero_comanda}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Selecione...</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Comandas Ativas</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : targetOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma outra comanda ocupada disponível para transferência.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {targetOptions.map(comanda => (
                  <Card
                    key={comanda.id}
                    className={`cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all ${
                      targetComanda?.id === comanda.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setTargetComanda(comanda)}
                  >
                    <CardContent className="p-3 text-center">
                      <Lock className="h-5 w-5 mx-auto mb-1 text-orange-400" />
                      <p className="font-bold">#{comanda.numero_comanda}</p>
                      <Badge variant="secondary" className="text-[10px] py-0">Ocupada</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!targetComanda || transferOrders.isPending}
            onClick={handleTransfer}
          >
            {transferOrders.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar Transferência
          </Button>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
