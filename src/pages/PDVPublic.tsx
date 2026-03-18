import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useComandas, useCreateComandaOrder, useUpdateComandaStatus, Comanda } from '@/hooks/useComandas';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOpenedSession, useCaixaBalance } from '@/hooks/useCaixa';
import { AbrirCaixaModal } from '@/components/pdv/AbrirCaixaModal';

const formatValue = (v: any) => {
  const n = Number(v) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
};

const PDVPublic = () => {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [view, setView] = useState<'main' | 'venda' | 'select-comanda'>('main');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  const { data: comandasData } = useComandas();
  const comandas = Array.isArray(comandasData) ? comandasData : [];
  const { data: productsData } = useProducts();
  const products = Array.isArray(productsData) ? productsData : [];
  const { data: activeSession, isLoading: loadingSession } = useOpenedSession();
  const { data: balanceData } = useCaixaBalance(activeSession?.id);
  const balance = balanceData || { current: 0 };

  const handleLogin = () => {
    // Para teste, qualquer senha ou sem senha se não houver
    setAuthenticated(true);
  };

  const handleSelectComanda = (c: Comanda) => {
    setSelectedComanda(c);
    setView('venda');
  };

  const addToCart = (p: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  if (!authenticated) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl mb-4">Acesso PDV</h1>
        <Input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="max-w-xs mx-auto mb-4" />
        <Button onClick={handleLogin}>Entrar</Button>
      </div>
    );
  }

  if (view === 'venda' && selectedComanda) {
    return (
      <div className="p-6">
        <div className="flex justify-between mb-10">
          <h1 className="text-2xl font-bold">Comanda #{selectedComanda.numero_comanda}</h1>
          <Button onClick={() => { setView('main'); setSelectedComanda(null); setCart([]); }}>Voltar</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl mb-4">Produtos</h2>
            <div className="grid grid-cols-2 gap-4">
              {products.map(p => (
                <Card key={p.id} className="cursor-pointer" onClick={() => addToCart(p)}>
                  <CardContent className="p-4">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-primary">{formatValue(p.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <Card>
              <CardHeader><CardTitle>Carrinho</CardTitle></CardHeader>
              <CardContent>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between mb-2">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>{formatValue(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t mt-4 pt-4 text-xl font-bold">
                  Total: {formatValue(cart.reduce((s, i) => s + i.product.price * i.quantity, 0))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'select-comanda') {
    const livres = comandas.filter(c => c.status === 'livre');
    return (
      <div className="p-10">
        <h1 className="text-2xl mb-6">Selecionar Comanda</h1>
        <Button onClick={() => setView('main')} className="mb-6">Voltar</Button>
        <div className="grid grid-cols-4 gap-4">
          {livres.map(c => (
            <Card key={c.id} className="cursor-pointer p-6 text-center" onClick={() => handleSelectComanda(c)}>
              <span className="text-3xl font-bold">#{c.numero_comanda}</span>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-10">PDV Simplificado</h1>
      <div className="mb-10 p-6 bg-white rounded-lg shadow">
        <p>Saldo em Caixa: {formatValue(balance.current)}</p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <Card className="cursor-pointer p-10 text-center" onClick={() => setView('select-comanda')}>
          <h2 className="text-2xl font-bold">Abrir Venda</h2>
        </Card>
      </div>
      <AbrirCaixaModal open={!loadingSession && !activeSession} />
    </div>
  );
};

export default PDVPublic;
