import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banknote, Loader2 } from 'lucide-react';
import { useOpenCaixa } from '@/hooks/useCaixa';
import { useToast } from '@/hooks/use-toast';

interface AbrirCaixaModalProps {
  open: boolean;
}

export function AbrirCaixaModal({ open }: AbrirCaixaModalProps) {
  const { toast } = useToast();
  const openCaixa = useOpenCaixa();
  const [balance, setBalance] = useState('');

  const handleOpen = async () => {
    const val = parseFloat(balance) || 0;
    try {
      await openCaixa.mutateAsync(val);
      toast({ title: 'Caixa aberto!', description: `Caixa iniciado com R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
    } catch (err: any) {
      toast({ title: 'Erro ao abrir caixa', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Abrir Caixa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Para iniciar as operações no PDV, informe o valor inicial disponível no caixa (troco).
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor Inicial em Dinheiro</label>
            <Input
              type="number"
              placeholder="0,00"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              className="text-lg font-bold"
              autoFocus
            />
          </div>
          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={handleOpen}
            disabled={openCaixa.isPending}
          >
            {openCaixa.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Abrir PDV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
