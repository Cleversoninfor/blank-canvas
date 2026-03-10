import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InfornexaHeader } from '@/components/admin/InfornexaHeader';
import logoInfornexa from '@/assets/logo-infornexa.png';
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
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/admin');
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigate('/admin');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const emailValidation = z.string().email().safeParse(formData.email);
      if (!emailValidation.success) {
        toast({ title: 'Email inválido', description: 'Digite um email válido', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir a senha.' });
        setMode('login');
      }
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente mais tarde', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        toast({ title: 'Dados inválidos', description: validation.error.errors[0].message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) {
        toast({
          title: error.message.includes('User already registered') ? 'Email já cadastrado' : 'Erro ao criar conta',
          description: error.message.includes('User already registered') ? 'Este email já possui uma conta. Tente fazer login.' : error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar o cadastro.' });
      setMode('login');
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente mais tarde', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') return handleForgotPassword(e);
    if (mode === 'signup') return handleSignUp();

    setIsLoading(true);
    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        toast({ title: 'Dados inválidos', description: validation.error.errors[0].message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        toast({
          title: 'Erro ao entrar',
          description: error.message.includes('Invalid login credentials') ? 'Email ou senha incorretos' : error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso' });
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente mais tarde', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: 'Entrar no Painel',
    signup: 'Criar Conta',
    forgot: 'Recuperar Senha',
  };

  const subtitles: Record<AuthMode, string> = {
    login: 'Acesse sua conta para gerenciar pedidos',
    signup: 'Crie sua conta para começar a usar',
    forgot: 'Digite seu email para receber o link de recuperação',
  };

  return (
    <>
      <Helmet>
        <title>{titles[mode]} - Painel Admin</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#23354D' }}>
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img
                src={logoInfornexa}
                alt="Logo do sistema"
                className="h-28 sm:h-36 w-auto drop-shadow-lg"
              />
            </div>

            {/* Card */}
            <div className="bg-card rounded-2xl shadow-xl p-8">
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

              <h1 className="text-2xl font-bold text-center text-foreground mb-1">
                {titles[mode]}
              </h1>
              <p className="text-center text-muted-foreground text-sm mb-8">
                {subtitles[mode]}
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
                  ) : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Enviar Link'}
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
                className="text-white/70 hover:text-white text-sm transition-colors"
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
