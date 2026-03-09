import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { Globe, Copy, Check, ExternalLink, Info, Loader2, Server, FolderUp, FileCode } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function SubdomainSettings() {
  const { data: storeConfig } = useStoreConfig();
  const updateConfig = useUpdateStoreConfig();
  const { toast } = useToast();
  
  const [subdomain, setSubdomain] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (storeConfig?.subdomain_slug) {
      setSubdomain(storeConfig.subdomain_slug);
    }
  }, [storeConfig?.subdomain_slug]);

  const handleSubdomainChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleanValue);
  };

  const handleSave = async () => {
    try {
      const updateData: any = {
        subdomain_slug: subdomain || null,
      };
      
      if (storeConfig?.id) {
        updateData.id = storeConfig.id;
      }
      
      await updateConfig.mutateAsync(updateData);
      toast({ title: 'Subdomínio salvo com sucesso!' });
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar o subdomínio.',
        variant: 'destructive' 
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copiado!' });
  };

  const fullDomain = subdomain ? `${subdomain}.infornexa.com.br` : '';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">URL do Cardápio</CardTitle>
        </div>
        <CardDescription>
          Configure o subdomínio e veja como hospedar seu cardápio na Hostgator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subdomain Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subdomínio</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center">
              <Input
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="meucardapio"
                className="rounded-r-none"
              />
              <span className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm text-muted-foreground whitespace-nowrap">
                .infornexa.com.br
              </span>
            </div>
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : 'Salvar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use apenas letras minúsculas, números e hífens.
          </p>
        </div>

        {/* Preview URL */}
        {subdomain && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                <ExternalLink className="h-3 w-3 mr-1" />
                URL Final do Cardápio
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background px-3 py-2 rounded text-sm border font-semibold">
                https://{fullDomain}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(`https://${fullDomain}`, 'url')}
              >
                {copied === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Deployment Instructions */}
        {subdomain && (
          <Accordion type="single" collapsible className="w-full">
            {/* Step 1: Create Subdomain */}
            <AccordionItem value="step-1">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </div>
                  <span>Criar subdomínio na Hostgator</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse o <strong>cPanel</strong> da sua conta Hostgator</li>
                  <li>Vá em <strong>Domínios → Subdomínios</strong></li>
                  <li>No campo "Subdomínio", digite: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{subdomain}</code></li>
                  <li>No campo "Domínio", selecione: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">infornexa.com.br</code></li>
                  <li>O campo "Raiz do documento" será preenchido automaticamente</li>
                  <li>Clique em <strong>Criar</strong></li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Upload Files */}
            <AccordionItem value="step-2">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </div>
                  <span>Fazer upload dos arquivos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>No cPanel, vá em <strong>Arquivos → Gerenciador de Arquivos</strong></li>
                  <li>Navegue até a pasta: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">public_html/{subdomain}.infornexa.com.br</code></li>
                  <li>Faça upload de todos os arquivos da pasta <code className="bg-muted px-1.5 py-0.5 rounded font-mono">dist/</code> do projeto</li>
                  <li>Certifique-se que o arquivo <code className="bg-muted px-1.5 py-0.5 rounded font-mono">index.html</code> está na raiz</li>
                </ol>
                <div className="bg-accent/50 border border-accent rounded-lg p-3 mt-2">
                  <p className="text-xs text-accent-foreground">
                    <strong>💡 Dica:</strong> Para gerar a pasta <code>dist/</code>, execute <code>npm run build</code> no projeto.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Configure .htaccess */}
            <AccordionItem value="step-3">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </div>
                  <span>Configurar redirecionamento (SPA)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Crie um arquivo <code className="bg-muted px-1.5 py-0.5 rounded font-mono">.htaccess</code> na raiz do subdomínio com o seguinte conteúdo:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => copyToClipboard(`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`, 'htaccess')}
                  >
                    {copied === 'htaccess' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Isso garante que todas as rotas funcionem corretamente (ex: /cart, /checkout).
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: SSL Certificate */}
            <AccordionItem value="step-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    4
                  </div>
                  <span>Ativar certificado SSL (HTTPS)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>No cPanel, vá em <strong>Segurança → SSL/TLS Status</strong></li>
                  <li>Localize o subdomínio <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{fullDomain}</code></li>
                  <li>Clique em <strong>Run AutoSSL</strong> ou <strong>Instalar Certificado</strong></li>
                  <li>Aguarde alguns minutos para ativação</li>
                </ol>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-2">
                  <p className="text-xs text-destructive">
                    <strong>⚠️ Importante:</strong> O SSL é obrigatório para o cardápio funcionar corretamente (conexão com o banco de dados).
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Backend Info */}
        {subdomain && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Informações do Backend</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              O backend (banco de dados, autenticação e funções) permanece hospedado na nuvem. 
              O frontend na Hostgator se conecta automaticamente.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                API URL
              </Badge>
              <code className="text-xs bg-background px-2 py-1 rounded border truncate max-w-[250px]">
                {supabaseUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(supabaseUrl, 'api')}
              >
                {copied === 'api' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
