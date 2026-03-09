import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStoreConfig } from './useStore';

// Helper function to convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseHslToHex(hslString: string | null | undefined, fallback: string): string {
  if (!hslString) return fallback;
  
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (match) {
    const h = parseInt(match[1]);
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    return hslToHex(h, s, l);
  }
  
  return fallback;
}

interface PWAConfig {
  name: string;
  shortName: string;
  startUrl: string;
  description: string;
}

// Configurações de PWA para cada página
function getPWAConfig(pathname: string): PWAConfig {
  if (pathname.startsWith('/kitchen')) {
    return {
      name: 'Cozinha',
      shortName: 'Cozinha',
      startUrl: '/kitchen',
      description: 'Painel da Cozinha - Visualização de pedidos'
    };
  }
  
  if (pathname.startsWith('/waiter')) {
    return {
      name: 'Garçons',
      shortName: 'Garçons',
      startUrl: '/waiter',
      description: 'Painel de Garçons - Gerenciamento de mesas'
    };
  }
  
  if (pathname.startsWith('/admin')) {
    return {
      name: 'Administração',
      shortName: 'Admin',
      startUrl: '/admin',
      description: 'Painel Administrativo - Gestão do estabelecimento'
    };
  }
  
  // Padrão - Cardápio
  return {
    name: 'Cardápio Digital',
    shortName: 'Cardápio',
    startUrl: '/',
    description: 'Cardápio digital e delivery - Faça seu pedido online'
  };
}

export function usePWAConfig() {
  const { data: store } = useStoreConfig();
  const location = useLocation();

  useLayoutEffect(() => {
    if (!store) return;

    const pwaConfig = getPWAConfig(location.pathname);
    const themeColor = parseHslToHex(store.primary_color, '#f59e0b');

    // Update document title
    document.title = `${pwaConfig.name} - ${store.name || 'Restaurante'}`;
    
    // Update apple-mobile-web-app-title
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', pwaConfig.shortName);
    }

    // Build and apply dynamic manifest based on current page
    const manifest = {
      name: pwaConfig.name,
      short_name: pwaConfig.shortName,
      description: pwaConfig.description,
      start_url: pwaConfig.startUrl,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: themeColor,
      orientation: 'portrait-primary',
      icons: store.logo_url
        ? [
            { src: store.logo_url, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: store.logo_url, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ]
        : [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
      categories: ['food', 'business'],
      lang: 'pt-BR',
    };

    // IMPORTANT: use a data: URL (not blob:) so the browser can reliably fetch it for installation
    const manifestJson = JSON.stringify(manifest);
    const manifestUrl = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(manifestJson)}`;

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestUrl;

    // Update apple-touch-icon with store logo
    if (store.logo_url) {
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleTouchIcon) {
        appleTouchIcon.href = store.logo_url;
      } else {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = store.logo_url;
        document.head.appendChild(appleTouchIcon);
      }

      // Update favicon with store logo
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = store.logo_url;
        favicon.type = 'image/png';
      } else {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = store.logo_url;
        document.head.appendChild(favicon);
      }
    }

  }, [store, location.pathname]);
}
