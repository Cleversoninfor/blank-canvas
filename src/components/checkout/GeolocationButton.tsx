import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GeoAddress {
  street: string;
  number: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

interface GeolocationButtonProps {
  onAddressFound: (address: GeoAddress) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<Omit<GeoAddress, 'latitude' | 'longitude'>> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { 'Accept-Language': 'pt-BR' } }
  );
  const data = await res.json();
  const addr = data.address || {};
  return {
    street: addr.road || addr.pedestrian || addr.footway || '',
    number: addr.house_number || '',
    neighborhood: addr.suburb || addr.neighbourhood || addr.city_district || addr.town || '',
  };
}

export function GeolocationButton({ onAddressFound }: GeolocationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const updateAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const addr = await reverseGeocode(lat, lng);
      onAddressFound({ ...addr, latitude: lat, longitude: lng });
    } catch {
      // Keep coords even if reverse geocoding fails
      onAddressFound({ street: '', number: '', neighborhood: '', latitude: lat, longitude: lng });
    }
  }, [onAddressFound]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador não suporta geolocalização.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        await updateAddressFromCoords(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permissão de localização negada. Preencha o endereço manualmente.');
        } else {
          setError('Não foi possível obter sua localização. Tente novamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Render interactive Leaflet map when coords are available
  useEffect(() => {
    if (!coords || !mapRef.current) return;

    // Destroy previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([coords.lat, coords.lng], 17);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: '<div style="color:hsl(var(--primary));display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg></div>',
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const marker = L.marker([coords.lat, coords.lng], { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
      updateAddressFromCoords(pos.lat, pos.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat !== undefined ? 'has-coords' : 'no-coords']);

  // Update marker position when coords change without recreating map
  useEffect(() => {
    if (!coords || !markerRef.current || !mapInstanceRef.current) return;
    markerRef.current.setLatLng([coords.lat, coords.lng]);
    mapInstanceRef.current.setView([coords.lat, coords.lng]);
  }, [coords]);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGetLocation}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
        {loading ? 'Obtendo localização...' : 'Usar minha localização'}
      </Button>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {coords && (
        <>
          <div
            ref={mapRef}
            className="w-full h-48 rounded-xl overflow-hidden border border-border touch-none"
          />
          <p className="text-sm font-bold text-foreground text-center">
            Arraste o marcador para ajustar sua localização exata
          </p>
        </>
      )}
    </div>
  );
}
