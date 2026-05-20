import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapPosition {
  lat: number;
  lng: number;
}

interface Props {
  center: MapPosition | null;
  route: MapPosition[];
  isTracking: boolean;
  activityColor: string;
  distance?: number;
  duration?: number;
  calories?: number;
  expanded?: boolean;
}

// Tính khoảng cách polyline
function calcRouteDistanceKm(route: MapPosition[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const R = 6371;
    const dLat = (route[i].lat - route[i - 1].lat) * Math.PI / 180;
    const dLng = (route[i].lng - route[i - 1].lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(route[i - 1].lat * Math.PI / 180) * Math.cos(route[i].lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

export default function LiveMap({ center, route, isTracking, activityColor, distance, duration, calories, expanded }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const distLabelRef = useRef<L.Marker | null>(null);

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
    }).setView([10.8231, 106.6297], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomleft', prefix: '' })
      .addAttribution('© OSM').addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      polylineRef.current = null;
      pulseRef.current = null;
      startMarkerRef.current = null;
      distLabelRef.current = null;
    };
  }, []);

  // Cập nhật vị trí
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    const latlng: L.LatLngExpression = [center.lat, center.lng];
    map.setView(latlng, map.getZoom(), { animate: true });

    // Marker vị trí hiện tại
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 22px; height: 22px;
          background: ${activityColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markerRef.current = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      markerRef.current.setLatLng(latlng);
    }

    // Pulse
    if (!pulseRef.current) {
      pulseRef.current = L.circleMarker(latlng, {
        radius: 22,
        color: activityColor,
        fillColor: activityColor,
        fillOpacity: 0.12,
        weight: 2,
        opacity: 0.35,
      }).addTo(map);
    } else {
      pulseRef.current.setLatLng(latlng);
    }

    // Marker điểm bắt đầu
    if (route.length > 0 && !startMarkerRef.current) {
      const startIcon = L.divIcon({
        className: 'start-marker',
        html: `<div style="
          width: 30px; height: 30px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        ">🚩</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      startMarkerRef.current = L.marker(
        [route[0].lat, route[0].lng],
        { icon: startIcon }
      ).addTo(map);
    }
  }, [center, activityColor, route]);

  // Polyline lộ trình
  useEffect(() => {
    const map = mapRef.current;
    if (!map || route.length < 2) return;

    const latLngs: L.LatLngExpression[] = route.map(p => [p.lat, p.lng]);

    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latLngs, {
        color: activityColor,
        weight: 6,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latLngs);
      polylineRef.current.setStyle({ color: activityColor });
    }
  }, [route, activityColor]);

  // Label quãng đường trên polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const dist = distance ?? calcRouteDistanceKm(route);
    if (route.length < 2 || dist < 0.01) {
      if (distLabelRef.current) {
        map.removeLayer(distLabelRef.current);
        distLabelRef.current = null;
      }
      return;
    }

    // Đặt label ở giữa lộ trình
    const midIdx = Math.floor(route.length / 2);
    const midPoint = route[midIdx];
    const labelLatlng: L.LatLngExpression = [midPoint.lat, midPoint.lng];

    const labelHtml = `<div style="
      background: ${activityColor};
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      white-space: nowrap;
      border: 2px solid white;
    ">${dist.toFixed(2)} km</div>`;

    const labelIcon = L.divIcon({
      className: 'dist-label',
      html: labelHtml,
      iconSize: [80, 28],
      iconAnchor: [40, 14],
    });

    if (!distLabelRef.current) {
      distLabelRef.current = L.marker(labelLatlng, { icon: labelIcon, interactive: false, zIndexOffset: 500 }).addTo(map);
    } else {
      distLabelRef.current.setLatLng(labelLatlng);
      distLabelRef.current.setIcon(labelIcon);
    }
  }, [route, distance, activityColor]);

  // Invalidate size khi container thay đổi kích thước / mount trong feed
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const timers = [120, 350, 800].map(ms =>
      window.setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore
        }
      }, ms)
    );

    return () => timers.forEach(t => window.clearTimeout(t));
  }, [expanded, center, route.length]);

  // Fit bounds khi kết thúc hoặc khi hiển thị trong Tường
  useEffect(() => {
    const map = mapRef.current;
    if (!map || route.length < 2) return;

    const timer = window.setTimeout(() => {
      try {
        const bounds = L.latLngBounds(route.map(p => [p.lat, p.lng] as L.LatLngExpression));
        map.fitBounds(bounds, { padding: [30, 30] });
      } catch {
        // ignore
      }
    }, isTracking ? 0 : 300);

    return () => window.clearTimeout(timer);
  }, [isTracking, route]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full overflow-hidden" />

      {/* Overlay thông số khi tracking */}
      {isTracking && center && distance !== undefined && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-xs">📏</span>
            <span className="text-sm font-bold">{distance.toFixed(2)} km</span>
          </div>
          {duration !== undefined && (
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-xs">⏱️</span>
              <span className="text-sm font-bold">{formatTime(duration)}</span>
            </div>
          )}
          {calories !== undefined && calories > 0 && (
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-xs">🔥</span>
              <span className="text-sm font-bold">{calories}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {!center && (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center z-[1000]">
          <span className="text-4xl mb-3 animate-pulse">📍</span>
          <span className="text-sm text-gray-500 font-medium">Đang tìm vị trí GPS...</span>
          <span className="text-xs text-gray-400 mt-1">Hãy ra nơi thoáng hơn</span>
        </div>
      )}
    </div>
  );
}
