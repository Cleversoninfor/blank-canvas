import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Loader2, Mail, Lock, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
});

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailValidation = z.string().email().safeParse(formData.email);
      if (!emailValidation.success) {
        toast({
          title: 'Email inválido',
          description: 'Digite um email válido',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir a senha.',
        });
        setMode('login');
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);

    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: 'Dados inválidos',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já possui uma conta. Tente fazer login.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao criar conta',
            description: error.message,
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Conta criada!',
        description: 'Verifique seu email para confirmar o cadastro.',
      });
      setMode('login');
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      return handleForgotPassword(e);
    }

    if (mode === 'signup') {
      return handleSignUp();
    }

    setIsLoading(true);

    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: 'Dados inválidos',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Erro ao entrar',
            description: 'Email ou senha incorretos',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao entrar',
            description: error.message,
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar no Painel';
      case 'signup': return 'Criar Conta';
      case 'forgot': return 'Recuperar Senha';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Acesse sua conta para gerenciar pedidos';
      case 'signup': return 'Crie sua conta para começar a usar';
      case 'forgot': return 'Digite seu email para receber o link de recuperação';
    }
  };

  return (
    <>
      <Helmet>
        <title>{getTitle()} - Painel Admin</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-3xl shadow-card p-8">
            {(mode === 'forgot' || mode === 'signup') && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            )}

            <h1 className="text-2xl font-bold text-center text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              {getSubtitle()}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-muted/50 border-0 rounded-xl"
                />
              </div>

              {(mode === 'login' || mode === 'signup') && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Crie uma senha (mín. 6 caracteres)' : 'Sua senha'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-0 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-primary hover:underline text-sm"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button
                type="submit"
                size="xl"
                className="w-full rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aguarde...
                  </>
                ) : mode === 'login' ? (
                  'Entrar'
                ) : mode === 'signup' ? (
                  'Criar Conta'
                ) : (
                  'Enviar Link'
                )}
              </Button>

              {mode === 'login' && (
                <div className="text-center pt-2">
                  <span className="text-muted-foreground text-sm">Não tem conta? </span>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Criar conta
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Back to menu */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Voltar ao cardápio
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
