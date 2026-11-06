import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface TrackPoint {
  lat: number;
  lng: number;
  segmentGrade?: 'uphill' | 'downhill' | 'flat';
}

export interface MarkerData {
  lat: number;
  lng: number;
  id: string;
  title?: string;
  description?: string;
}

export interface AMapPlugin {
  createMap(): Promise<{ created: boolean }>;
  showMap(): Promise<void>;
  hideMap(): Promise<void>;
  resizeMap(options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void>;
  setCenter(options: {
    lat: number;
    lng: number;
    zoom?: number;
  }): Promise<void>;
  drawUserPath(options: {
    path: TrackPoint[];
    autoFit?: boolean;
  }): Promise<void>;
  drawPlannedPath(options: {
    path: TrackPoint[];
  }): Promise<void>;
  addMarkers(options: {
    markers: MarkerData[];
  }): Promise<void>;
  setStartEndMarkers(options: {
    startPoint?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
  }): Promise<void>;
  getCurrentLocation(): Promise<{
    lat: number;
    lng: number;
    altitude: number;
  }>;
  calculateRoute(options: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    mode: 'walking' | 'driving';
  }): Promise<{
    distance: number;
    duration: number;
    navPoints: { lat: number; lng: number }[];
  }>;
  startNavigation(options: {
    navPoints: { lat: number; lng: number }[];
    totalDistance: number;
    mode: 'walking' | 'driving';
    speed?: number;
    playbackSpeed?: number;
  }): Promise<void>;
  stopNavigation(): Promise<void>;
  clearRoute(): Promise<void>;
  fitBounds(options: {
    path: TrackPoint[];
    padding?: number;
  }): Promise<void>;
  destroyMap(): Promise<void>;

  // Event listeners
  addListener(
    eventName: 'onLocationChange',
    listenerFunc: (data: { lat: number; lng: number; altitude: number }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onMarkerClick',
    listenerFunc: (data: { id: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onNavigationFinished',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onNavigationPosition',
    listenerFunc: (data: { lat: number; lng: number }) => void
  ): Promise<PluginListenerHandle>;
}

const AMapNative = registerPlugin<AMapPlugin>('AMapPlugin');

export default AMapNative;
