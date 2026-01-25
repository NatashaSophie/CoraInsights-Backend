import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const TrackedPathMap = ({ value }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inicializar mapa
    const map = L.map(mapRef.current, {
      center: [-15.8, -49.5],
      zoom: 8,
      zoomControl: true,
    });

    // Adicionar tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !value) return;

    // Limpar camadas anteriores
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    try {
      const trackedPath = typeof value === 'string' ? JSON.parse(value) : value;
      
      if (!Array.isArray(trackedPath) || trackedPath.length === 0) {
        return;
      }

      // Criar polyline com o caminho
      const coordinates = trackedPath.map(point => [point.lat, point.lon]);
      
      const polyline = L.polyline(coordinates, {
        color: '#e74c3c',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Adicionar marcadores de início e fim
      const startIcon = L.divIcon({
        html: '<div style="background: #27ae60; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">I</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const endIcon = L.divIcon({
        html: '<div style="background: #e74c3c; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">F</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      L.marker(coordinates[0], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Início</b><br>Lat: ${trackedPath[0].lat}<br>Lon: ${trackedPath[0].lon}<br>Tempo: ${new Date(trackedPath[0].timestamp).toLocaleString('pt-BR')}`);

      L.marker(coordinates[coordinates.length - 1], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Fim</b><br>Lat: ${trackedPath[trackedPath.length - 1].lat}<br>Lon: ${trackedPath[trackedPath.length - 1].lon}<br>Tempo: ${new Date(trackedPath[trackedPath.length - 1].timestamp).toLocaleString('pt-BR')}`);

      // Ajustar zoom para mostrar todo o caminho
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    } catch (error) {
      console.error('Erro ao renderizar mapa:', error);
    }
  }, [value]);

  if (!value) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        color: '#6c757d',
      }}>
        📍 Nenhum caminho GPS registrado
      </div>
    );
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <div
        ref={mapRef}
        style={{
          height: '400px',
          width: '100%',
          border: '2px solid #dee2e6',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />
      <div style={{
        marginTop: '10px',
        padding: '10px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6c757d',
      }}>
        📊 <b>{Array.isArray(value) ? value.length : (typeof value === 'string' ? JSON.parse(value).length : 0)}</b> pontos GPS registrados
      </div>
    </div>
  );
};

export default TrackedPathMap;
