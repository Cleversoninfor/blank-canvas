import { UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StoreConfig } from '@/hooks/useStore';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import defaultFloatingImg from '@/assets/espetinho.png';

interface HeroHeaderProps {
  store: StoreConfig & { 
    floating_image_url?: string | null;
    floating_image_size?: number | null;
    floating_image_position?: number | null;
    floating_image_vertical_position?: number | null;
    floating_image_size_mobile?: number | null;
    floating_image_position_mobile?: number | null;
    floating_image_vertical_position_mobile?: number | null;
  };
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&h=800&fit=crop';

export function HeroHeader({ store }: HeroHeaderProps) {
  const { totalItems } = useCart();
  const isMobile = useIsMobile();
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const coverUrl = store.cover_url || DEFAULT_COVER;
  const floatingImageUrl = store.floating_image_url || defaultFloatingImg;

  // Use appropriate settings based on device - sizes are now in pixels
  const floatingImageSize = isMobile
    ? (store.floating_image_size_mobile ?? 300)
    : (store.floating_image_size ?? 300);

  // Desktop uses % (CSS left/top). Mobile uses px offsets from screen center.
  const floatingImageHorizontalPosition = isMobile
    ? (store.floating_image_position_mobile ?? 0)
    : (store.floating_image_position ?? 50);
  const floatingImageVerticalPosition = isMobile
    ? (store.floating_image_vertical_position_mobile ?? 0)
    : (store.floating_image_vertical_position ?? 50);

  // Use texts from store config or defaults
  const rotatingTexts = useMemo(() => {
    return [
      store.hero_text_1 || 'Carne macia',
      store.hero_text_2 || 'Suculenta',
      store.hero_text_3 || 'Sabor Irresistível',
    ].filter(Boolean);
  }, [store.hero_text_1, store.hero_text_2, store.hero_text_3]);

  const heroSlogan = store.hero_slogan || 'O segredo está no tempero';

  // Rotating text animation
  useEffect(() => {
    if (rotatingTexts.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [rotatingTexts.length]);

  // Mouse parallax effect for desktop
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = (e.clientY - rect.top - rect.height / 2) / 20;
    setImagePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setImagePosition({ x: 0, y: 0 });
  };

  // Device motion for mobile
  useEffect(() => {
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      if (e.accelerationIncludingGravity) {
        const x = (e.accelerationIncludingGravity.x || 0) * 2;
        const y = (e.accelerationIncludingGravity.y || 0) * 2;
        setImagePosition({ x: -x, y });
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, []);

  const scrollToMenu = () => {
    const menuSection = document.querySelector('[data-menu-section]');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  // Calculate image width - now using direct pixel value from admin
  const imageWidth = floatingImageSize;
  
  return (
    <header className="relative w-screen" style={{ marginLeft: 'calc(-50vw + 50%)' }}>
      {/* Full Hero Section - Full viewport width and height */}
      <div 
        className="relative h-screen w-screen overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${coverUrl}')` }}
        />

        {/* Dark Overlay with texture effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

        {/* Navigation Bar */}
        <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 sm:h-14 sm:w-14 rounded-full border-2 border-primary bg-background shadow-lg overflow-hidden flex-shrink-0">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={`Logo ${store.name}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                  <span className="text-xl">🍔</span>
                </div>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-6 sm:gap-6">
            <button
              onClick={scrollToMenu}
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              <UtensilsCrossed className="h-6 w-6 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cardápio</span>
            </button>
            <Link
              to="/my-orders"
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              <ShoppingBag className="h-6 w-6 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Meus pedidos</span>
              {totalItems > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </nav>

        {/* Hero Content - Left-aligned, positioned higher */}
        <div className="relative z-10 flex flex-col items-start text-left justify-start pt-24 md:pt-8 md:justify-center h-[calc(100%-80px)] px-6 sm:px-8 md:px-12 lg:px-16">
          {/* Slogan */}
          <p className="text-lg sm:text-xl lg:text-2xl italic text-white/80 mb-4">
            {heroSlogan}
          </p>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-3 drop-shadow-lg"
              style={{ fontFamily: "'Poppins', sans-serif", textShadow: '2px 4px 8px rgba(0,0,0,0.4)' }}>
            {store.name}
          </h1>

          {/* Animated Subtitle */}
          <div className="h-14 sm:h-16 lg:h-20 mb-4 overflow-hidden">
            <p 
              className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary drop-shadow-md transition-all duration-300 ${
                isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              style={{ fontFamily: "'Poppins', sans-serif", textShadow: '2px 4px 8px rgba(0,0,0,0.3)' }}
            >
              {rotatingTexts[currentTextIndex]}
            </p>
          </div>

          {/* Info Line */}
          <p className="text-white/90 mb-6 text-lg sm:text-xl font-medium">
            Entrega Rápida!
          </p>

          {/* CTA Button */}
          <Button
            onClick={scrollToMenu}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-4 text-lg rounded-full shadow-lg transition-transform hover:scale-105"
          >
            Cardápio
          </Button>

        </div>

        {/* Floating Image - Positioned based on admin settings */}
        {floatingImageUrl && (
          <img
            ref={imageRef}
            src={floatingImageUrl}
            alt="Destaque"
            className="absolute drop-shadow-2xl transition-transform duration-200 ease-out pointer-events-none z-0"
            style={
              isMobile
                ? {
                    width: `${imageWidth}px`,
                    maxWidth: 'none',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${floatingImageHorizontalPosition}px + ${imagePosition.x}px), calc(-50% + ${floatingImageVerticalPosition}px + ${imagePosition.y}px)) rotate(-15deg)`,
                  }
                : {
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) rotate(-15deg)`,
                    width: `${imageWidth}px`,
                    maxWidth: 'none',
                    left: `${floatingImageHorizontalPosition}%`,
                    top: `${floatingImageVerticalPosition}%`,
                    marginLeft: `${-imageWidth / 2}px`,
                    marginTop: `${-imageWidth / 2}px`,
                  }
            }
            onError={(e) => {
              console.log('Floating image failed to load:', floatingImageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}

        {/* Decorative dots pattern */}
        <div className="absolute right-4 sm:right-12 bottom-20 md:bottom-20 flex flex-col gap-2 opacity-40">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="w-1.5 h-1.5 rounded-full bg-white/60" />
              ))}
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
}