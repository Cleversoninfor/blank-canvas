import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDownCircle, Loader2 } from 'lucide-react';
import { useSangria } from '@/hooks/useCaixa';
import { useToast } from '@/hooks/use-toast';

interface SangriaModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SangriaModal({ open, onClose, sessionId }: SangriaModalProps) {
  const { toast } = useToast();
  const sangria = useSangria();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSangria = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Informe o motivo', description: 'O motivo da sangria é obrigatório.', variant: 'destructive' });
      return;
    }

    try {
      await sangria.mutateAsync({
        sessionId,
        amount: val,
        description: description.trim(),
      });
      toast({ title: 'Sangria realizada!', description: `Retirada de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrada.` });
      setAmount('');
      setDescription('');
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro ao realizar sangria', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ArrowDownCircle className="h-5 w-5" />
            Realizar Sangria
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor da Retirada</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-lg font-bold text-destructive"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo / Observação</Label>
            <Textarea
              placeholder="Ex: Pagamento de fornecedor, retirada para depósito, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sangria.isPending}>Cancelar</Button>
          <Button 
            variant="destructive"
            onClick={handleSangria}
            disabled={sangria.isPending}
          >
            {sangria.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Retirada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
