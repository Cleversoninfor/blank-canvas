import { useLayoutEffect } from 'react';
import { useStoreConfig } from './useStore';
// Convert HSL string like "45 100% 51%" to proper CSS variable value
function parseHslColor(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  return color;
}

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

export function useTheme() {
  const { data: store } = useStoreConfig();

  useLayoutEffect(() => {
    if (!store) return;

    const root = document.documentElement;

    // Apply primary color
    if (store.primary_color) {
      root.style.setProperty('--primary', parseHslColor(store.primary_color, '45 100% 51%'));
      root.style.setProperty('--ring', parseHslColor(store.primary_color, '45 100% 51%'));
      root.style.setProperty('--sidebar-ring', parseHslColor(store.primary_color, '45 100% 51%'));
    }

    // Apply secondary color
    if (store.secondary_color) {
      root.style.setProperty('--secondary', parseHslColor(store.secondary_color, '142 76% 49%'));
      root.style.setProperty('--whatsapp', parseHslColor(store.secondary_color, '142 76% 49%'));
    }

    // Apply accent color
    if (store.accent_color) {
      root.style.setProperty('--accent', parseHslColor(store.accent_color, '45 100% 95%'));
    }

    // Update theme-color meta tag
    const themeColor = parseHslToHex(store.primary_color, '#f59e0b');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor);
    }

    // Update document title and apple-mobile-web-app-title
    if (store.pwa_name || store.name) {
      document.title = store.pwa_name || store.name || 'Cardápio';
      
      const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitleMeta) {
        appleTitleMeta.setAttribute('content', store.pwa_short_name || store.pwa_name || store.name || 'Cardápio');
      }
    }

    // Build and apply dynamic manifest
    const manifest = {
      name: store.pwa_name || store.name || 'Cardápio Digital',
      short_name:
        store.pwa_short_name ||
        store.pwa_name?.slice(0, 12) ||
        store.name?.slice(0, 12) ||
        'Cardápio',
      description: 'Cardápio digital e delivery - Faça seu pedido online',
      start_url: '/',
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
      categories: ['food', 'shopping'],
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

      // Update Open Graph image meta tag to show store logo in link previews
      const ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (ogImageMeta) {
        ogImageMeta.setAttribute('content', store.logo_url);
      }

      const twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
      if (twitterImageMeta) {
        twitterImageMeta.setAttribute('content', store.logo_url);
      }
    }

  }, [store]);
}
