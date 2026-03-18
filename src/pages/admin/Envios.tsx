import { useState, useEffect } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

const AdminEnvios = () => {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  
  const [pixMessage, setPixMessage] = useState('');

  useEffect(() => {
    if (store) {
      setPixMessage(store.pix_message || '');
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    updateStore.mutate({
      pix_message: pixMessage
    }, {
      onSuccess: () => {
        toast({
          title: "Configurações salvas",
          description: "As mensagens de envio foram atualizadas com sucesso.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar",
          description: "Ocorreu um erro ao atualizar as configurações.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Envios">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Envios">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-heading">Configurações de Envios</h2>
            <p className="text-muted-foreground text-sm">Personalize as mensagens automáticas enviadas aos seus clientes.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4 border border-border/50">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Mensagem de Cobrança PIX (WhatsApp)
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground block mb-2 font-medium">Mensagem personalizada para cobrança</label>
              <Textarea 
                value={pixMessage} 
                onChange={e => setPixMessage(e.target.value)} 
                placeholder="Olá {nome}! 🍔&#10;&#10;Pedido #{pedido} recebido!&#10;&#10;Total: {total}&#10;&#10;💠 Chave Pix: {chave_pix} ({tipo_chave})&#10;&#10;Aguardamos o comprovante para iniciar o preparo!"
                className="mt-1 min-h-[180px] font-mono text-sm leading-relaxed bg-muted/20 border-border focus:border-primary transition-all"
                rows={8}
              />
              
              <div className="mt-6 p-5 rounded-xl bg-muted/30 border border-border/50 space-y-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Variáveis Disponíveis
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Insira as tags abaixo no seu texto para que elas sejam substituídas pelos dados reais do pedido.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{nome}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Nome do cliente</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{pedido}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Nº do pedido</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{total}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Valor total</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{itens}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Produtos do pedido</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{endereco}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Endereço de entrega</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{link}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Link de acompanhamento</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{chave_pix}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Sua chave vinculada</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <code className="text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit group-hover:bg-primary group-hover:text-white transition-all">{'{tipo_chave}'}</code>
                    <span className="text-[10px] text-muted-foreground font-medium">Tipo da chave (CPF, etc)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <Button type="submit" size="lg" className="min-w-[200px] shadow-lg shadow-primary/20" disabled={updateStore.isPending}>
              {updateStore.isPending ? <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </> : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminEnvios;
