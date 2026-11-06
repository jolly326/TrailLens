import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import AMapNative, { TrackPoint, MarkerData } from './AMapPlugin';

// Legacy Web JS API support (for browser dev)
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

interface GaodeMapProps {
  path: TrackPoint[];
  plannedPath?: TrackPoint[];
  currentIndex?: number;
  autoFit?: boolean;
  className?: string;
  showLocation?: boolean;
  showSearch?: boolean;
  showNavigation?: boolean;
  showUserPath?: boolean;
  onLocationChange?: (lat: number, lng: number, altitude?: number) => void;
  onSearchResult?: (result: any) => void;
  onRouteCalculated?: (route: any) => void;
  onNavigationStart?: () => void;
  onNavigationStop?: () => void;
  startPoint?: any;
  destination?: any;
  onMapInstance?: (map: any) => void;
  playbackSpeed?: number;
  markers?: Array<{
    lat: number;
    lng: number;
    id: string;
    title?: string;
    description?: string;
    image?: string;
    onClick?: (marker: any) => void;
  }>;
}

const NAV_WALK_SPEED = 1.4;
const NAV_DRIVE_SPEED = 10.0;

const GaodeMap: React.FC<GaodeMapProps> = ({
                                             path,
                                             plannedPath,
                                             currentIndex,
                                             autoFit = true,
                                             className = '',
                                             showLocation = true,
                                             showSearch = false,
                                             showNavigation = false,
                                             showUserPath = true,
                                             onLocationChange,
                                             onSearchResult,
                                             onRouteCalculated,
                                             onNavigationStart,
                                             onNavigationStop,
                                             startPoint,
                                             destination,
                                             onMapInstance,
                                             playbackSpeed = 1,
                                             markers,
                                           }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userPathLineRef = useRef<any>(null);
  const plannedPathLineRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const drivingRouteRef = useRef<any>(null);
  const pathStartMarkerRef = useRef<any>(null);
  const pathEndMarkerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Navigation refs (Web fallback)
  const animationRef = useRef<any>(null);
  const animationFrameId = useRef<number | null>(null);
  const navMarkerRef = useRef<any>(null);
  const navPointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const navTotalDistanceRef = useRef(0);
  const navStartTimeRef = useRef<number | null>(null);
  const navSpeedRef = useRef(NAV_WALK_SPEED);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [navMode, setNavMode] = useState<'driving' | 'walking'>('walking');

  const isUserInteracting = useRef(false);
  const autoFitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =================== Native Android Map Logic ===================

  const isNative = Capacitor.isNativePlatform();

  // Map container ref for native overlay positioning
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize native map
  useEffect(() => {
    if (!isNative) return;

    let mounted = true;

    const initNativeMap = async () => {
      try {
        await AMapNative.createMap();
        await AMapNative.showMap();
        if (mounted) setMapLoaded(true);
      } catch (e) {
        console.error('Native map init failed:', e);
      }
    };

    initNativeMap();

    // Listen for native events
    const locationSub = AMapNative.addListener?.('onLocationChange', (data: any) => {
      setCurrentLocation({ lat: data.lat, lng: data.lng });
      onLocationChange?.(data.lat, data.lng, data.altitude);
    });

    const markerClickSub = AMapNative.addListener?.('onMarkerClick', (data: any) => {
      const markerData = markers?.find(m => m.id === data.id);
      if (markerData?.onClick) markerData.onClick(markerData);
    });

    const navFinishSub = AMapNative.addListener?.('onNavigationFinished', () => {
      setIsNavigating(false);
      setRouteInfo(null);
      onNavigationStop?.();
    });

    return () => {
      mounted = false;
      locationSub?.then?.((s: any) => s?.remove?.());
      markerClickSub?.then?.((s: any) => s?.remove?.());
      navFinishSub?.then?.((s: any) => s?.remove?.());
      AMapNative.destroyMap().catch(() => {});
    };
  }, []);

  // Update native map position/size when container changes
  useEffect(() => {
    if (!isNative || !mapLoaded) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      AMapNative.resizeMap({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }).catch(() => {});
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [mapLoaded, className]);

  // Native: draw user path
  useEffect(() => {
    if (!isNative || !mapLoaded) return;

    AMapNative.drawUserPath({
      path: showUserPath ? path : [],
      autoFit,
    }).catch(() => {});
  }, [path, mapLoaded, autoFit, showUserPath, isNative]);

  // Native: draw planned path
  useEffect(() => {
    if (!isNative || !mapLoaded) return;

    if (plannedPath && plannedPath.length > 1) {
      AMapNative.drawPlannedPath({ path: plannedPath }).catch(() => {});
    }
  }, [plannedPath, mapLoaded, isNative]);

  // Native: start/end markers
  useEffect(() => {
    if (!isNative || !mapLoaded) return;

    AMapNative.setStartEndMarkers({
      startPoint: startPoint ? { lat: startPoint.lat, lng: startPoint.lng } : undefined,
      destination: destination ? { lat: destination.lat, lng: destination.lng } : undefined,
    }).catch(() => {});
  }, [startPoint, destination, mapLoaded, isNative]);

  // Native: custom markers
  useEffect(() => {
    if (!isNative || !mapLoaded) return;

    const nativeMarkers: MarkerData[] = (markers || []).map(m => ({
      lat: m.lat,
      lng: m.lng,
      id: m.id,
      title: m.title,
    }));

    AMapNative.addMarkers({ markers: nativeMarkers }).catch(() => {});
  }, [markers, mapLoaded, isNative]);

  // Native: get current location
  const getNativeLocation = useCallback(async () => {
    try {
      const loc = await AMapNative.getCurrentLocation();
      setCurrentLocation({ lat: loc.lat, lng: loc.lng });
      onLocationChange?.(loc.lat, loc.lng, loc.altitude);
    } catch (e) {
      console.error('Native location failed:', e);
    }
  }, [onLocationChange]);

  // Native: start navigation
  const handleNativeStartNavigation = async () => {
    if (!startPoint || !destination) {
      alert("请先设置起点和终点！");
      return;
    }

    try {
      setIsNavigating(true);
      onNavigationStart?.();
      await AMapNative.clearRoute();

      const result = await AMapNative.calculateRoute({
        start: { lat: startPoint.lat, lng: startPoint.lng },
        end: { lat: destination.lat, lng: destination.lng },
        mode: navMode,
      });

      setRouteInfo({
        distance: `${(result.distance / 1000).toFixed(1)}km`,
        duration: `${Math.round(result.duration / 60)}分钟`
      });
      onRouteCalculated?.(result);

      await AMapNative.startNavigation({
        navPoints: result.navPoints,
        totalDistance: result.distance,
        mode: navMode,
        speed: navMode === 'driving' ? NAV_DRIVE_SPEED : NAV_WALK_SPEED,
        playbackSpeed,
      });
    } catch (e) {
      alert("路线查询失败！");
      setIsNavigating(false);
    }
  };

  // Native: stop navigation
  const handleNativeStopNavigation = async () => {
    setIsNavigating(false);
    setRouteInfo(null);
    onNavigationStop?.();
    await AMapNative.stopNavigation().catch(() => {});
    await AMapNative.clearRoute().catch(() => {});
  };

  // =================== Web JS API Fallback Logic ===================

  // 暴露地图实例给父组件
  useEffect(() => {
    if (mapInstance.current && onMapInstance) {
      onMapInstance(mapInstance.current);
    }
  }, [mapLoaded, onMapInstance]);

  // 监听起点，渲染起点标记 (Web)
  useEffect(() => {
    if (isNative || !mapInstance.current || !mapLoaded) return;

    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }

    if (startPoint) {
      const marker = new window.AMap.Marker({
        position: [startPoint.lng, startPoint.lat],
        icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
        offset: new window.AMap.Pixel(-13, -30),
        zIndex: 100
      });
      marker.setMap(mapInstance.current);
      startMarkerRef.current = marker;
    }
  }, [startPoint, mapLoaded, isNative]);

  // 监听终点，渲染终点标记 (Web)
  useEffect(() => {
    if (isNative || !mapInstance.current || !mapLoaded) return;

    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }

    if (destination) {
      const marker = new window.AMap.Marker({
        position: [destination.lng, destination.lat],
        icon: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
        offset: new window.AMap.Pixel(-13, -30),
        zIndex: 100
      });
      marker.setMap(mapInstance.current);
      endMarkerRef.current = marker;
    }
  }, [destination, mapLoaded, isNative]);

  // 渲染自定义标记点 (Web)
  useEffect(() => {
    if (isNative || !mapInstance.current || !mapLoaded) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (markers && markers.length > 0) {
      markers.forEach((markerData) => {
        const circleDiv = document.createElement('div');
        circleDiv.style.width = '16px';
        circleDiv.style.height = '16px';
        circleDiv.style.backgroundColor = '#f97316';
        circleDiv.style.borderRadius = '50%';
        circleDiv.style.border = '2px solid white';
        circleDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        circleDiv.style.cursor = 'pointer';
        circleDiv.style.transition = 'transform 0.2s';
        circleDiv.onmouseenter = () => { circleDiv.style.transform = 'scale(1.2)'; };
        circleDiv.onmouseleave = () => { circleDiv.style.transform = 'scale(1)'; };

        const marker = new window.AMap.Marker({
          position: [markerData.lng, markerData.lat],
          content: circleDiv,
          offset: new window.AMap.Pixel(-8, -8),
          zIndex: 100
        });

        marker.on('click', () => {
          if (markerData.onClick) {
            markerData.onClick(markerData);
          }
        });

        marker.setMap(mapInstance.current);
        markersRef.current.push(marker);
      });
    }
  }, [markers, mapLoaded, isNative]);

  // 距离计算 (Web)
  const haversineDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    const aa = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  // 解析路线点 (Web)
  const parsePathToPoints = (route: any): { lat: number; lng: number }[] => {
    const points: { lat: number; lng: number }[] = [];
    if (!route.steps) return points;
    route.steps.forEach((step: any) => {
      if (step.path) {
        step.path.forEach((coord: any) => {
          if (Array.isArray(coord)) {
            points.push({ lng: coord[0], lat: coord[1] });
          } else if (coord && typeof coord === 'object') {
            points.push({ lng: coord.lng, lat: coord.lat });
          }
        });
      }
    });
    return points;
  };

  // 地图交互 (Web)
  const onUserInteractionStart = useCallback(() => {
    isUserInteracting.current = true;
    if (autoFitTimeout.current) {
      clearTimeout(autoFitTimeout.current);
      autoFitTimeout.current = null;
    }
  }, []);

  const onUserInteractionEnd = useCallback(() => {
    if (autoFitTimeout.current) clearTimeout(autoFitTimeout.current);
    autoFitTimeout.current = setTimeout(() => {
      isUserInteracting.current = false;
    }, 500);
  }, []);

  // 初始化 Web JS API 地图
  useEffect(() => {
    if (isNative) return;

    const amapKey = import.meta.env.VITE_AMAP_KEY;
    const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;

    if (!amapKey) {
      console.warn('未配置 VITE_AMAP_KEY，Web 端高德地图将不可用。请在 .env.local 中填写后再启动。');
      return;
    }

    if (securityCode) {
      window._AMapSecurityConfig = {
        securityJsCode: securityCode,
      };
    }

    if (mapInstance.current) return;

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.Driving,AMap.Walking,AMap.Geocoder`;
    script.async = true;

    script.onload = () => {
      if (!mapRef.current) return;

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 13,
        center: [116.397428, 39.90923],
        viewMode: '2D',
      });

      map.on('zoomstart', onUserInteractionStart);
      map.on('dragstart', onUserInteractionStart);
      map.on('zoomend', onUserInteractionEnd);
      map.on('dragend', onUserInteractionEnd);

      mapInstance.current = map;
      setMapLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, [isNative, onUserInteractionStart, onUserInteractionEnd]);

  // 获取当前位置 (Web)
  const getWebLocation = useCallback(() => {
    if (!mapInstance.current) return;

    const geolocation = new window.AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      showButton: false,
    });

    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete') {
        const pos = result.position;
        const lat = pos.getLat();
        const lng = pos.getLng();
        const altitude = result?.altitude || 0;

        setCurrentLocation({ lat, lng });
        onLocationChange?.(lat, lng, altitude);

        if (currentMarkerRef.current) currentMarkerRef.current.setMap(null);
        const marker = new window.AMap.Marker({
          position: [lng, lat],
          icon: 'https://webapi.amap.com/theme/v1.3/markers/n/loc.png',
          offset: new window.AMap.Pixel(-13, -30),
        });
        marker.setMap(mapInstance.current);
        currentMarkerRef.current = marker;

        mapInstance.current.setCenter([lng, lat]);
        mapInstance.current.setZoom(16);
      }
    });
  }, [onLocationChange]);

  // 渲染用户轨迹 (Web)
  useEffect(() => {
    if (isNative || !mapInstance.current || !mapLoaded) return;

    [pathStartMarkerRef, pathEndMarkerRef, plannedPathLineRef].forEach(ref => {
      if (ref.current) { ref.current.setMap(null); ref.current = null; }
    });
    if (userPathLineRef.current) {
      const lines = Array.isArray(userPathLineRef.current) ? userPathLineRef.current : [userPathLineRef.current];
      lines.forEach(line => line.setMap(null));
      userPathLineRef.current = null;
    }

    const overlaysToFit: any[] = [];

    if (showUserPath && path.length > 0) {
      pathStartMarkerRef.current = new window.AMap.Marker({
        position: [path[0].lng, path[0].lat],
        icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
        offset: new window.AMap.Pixel(-13, -30), zIndex: 101
      });
      pathStartMarkerRef.current.setMap(mapInstance.current);
      overlaysToFit.push(pathStartMarkerRef.current);

      if (path.length > 1) {
        pathEndMarkerRef.current = new window.AMap.Marker({
          position: [path[path.length - 1].lng, path[path.length - 1].lat],
          icon: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
          offset: new window.AMap.Pixel(-13, -30), zIndex: 101
        });
        pathEndMarkerRef.current.setMap(mapInstance.current);
        overlaysToFit.push(pathEndMarkerRef.current);

        const hasSegments = path.some(p => p.segmentGrade);
        if (hasSegments) {
          const lines: any[] = [];
          let currentSegment = [path[0]];
          let currentGrade = path[0].segmentGrade || 'flat';

          for (let i = 1; i < path.length; i++) {
            currentSegment.push(path[i]);
            const grade = path[i].segmentGrade || 'flat';
            if (grade !== currentGrade || i === path.length - 1) {
              const linePath = currentSegment.map(p => [p.lng, p.lat]);
              const color = currentGrade === 'uphill' ? '#ef4444' : currentGrade === 'downhill' ? '#22c55e' : '#3366FF';
              const polyline = new window.AMap.Polyline({
                path: linePath, strokeColor: color, strokeWeight: 6, lineJoin: 'round', lineCap: 'round'
              });
              polyline.setMap(mapInstance.current);
              lines.push(polyline);
              currentSegment = [path[i - 1], path[i]];
              currentGrade = grade;
            }
          }
          userPathLineRef.current = lines;
        } else {
          const linePath = path.map(p => [p.lng, p.lat]);
          userPathLineRef.current = new window.AMap.Polyline({
            path: linePath, strokeColor: '#3366FF', strokeWeight: 6, lineJoin: 'round', lineCap: 'round'
          });
          userPathLineRef.current.setMap(mapInstance.current);
        }
      }
    }

    if (plannedPath && plannedPath.length > 1) {
      const linePath = plannedPath.map(p => [p.lng, p.lat]);
      plannedPathLineRef.current = new window.AMap.Polyline({
        path: linePath, strokeColor: '#FFA500', strokeWeight: 3, strokeStyle: 'dashed', strokeDasharray: [8, 8]
      });
      plannedPathLineRef.current.setMap(mapInstance.current);
      overlaysToFit.push(plannedPathLineRef.current);
    }

    if (autoFit && !isUserInteracting.current && overlaysToFit.length > 0) {
      setTimeout(() => {
        mapInstance.current?.setFitView(overlaysToFit, false, [60, 60, 60, 60]);
      }, 600);
    }
  }, [path, plannedPath, mapLoaded, autoFit, showUserPath, isNative]);

  // 开始导航 (Web)
  const handleWebStartNavigation = () => {
    if (!startPoint || !destination) {
      alert("请先设置起点和终点！");
      return;
    }

    setIsNavigating(true);
    onNavigationStart?.();

    // Stop previous
    if (navMarkerRef.current) { navMarkerRef.current.setMap(null); navMarkerRef.current = null; }
    if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
    if (drivingRouteRef.current) { drivingRouteRef.current.clear(); drivingRouteRef.current = null; }

    const routeService = navMode === 'driving'
        ? new window.AMap.Driving({ map: mapInstance.current, hideMarkers: true, policy: window.AMap.DrivingPolicy.LEAST_TIME })
        : new window.AMap.Walking({ map: mapInstance.current, hideMarkers: true });

    drivingRouteRef.current = routeService;

    routeService.search(
        [startPoint.lng, startPoint.lat],
        [destination.lng, destination.lat],
        (status: string, result: any) => {
          if (status === 'complete' && result.routes?.[0]) {
            const route = result.routes[0];
            setRouteInfo({
              distance: `${(route.distance / 1000).toFixed(1)}km`,
              duration: `${Math.round(route.time / 60)}分钟`
            });
            onRouteCalculated?.(route);
            navPointsRef.current = parsePathToPoints(route);
            navTotalDistanceRef.current = route.distance;
            navStartTimeRef.current = Date.now();
            navSpeedRef.current = navMode === 'driving' ? NAV_DRIVE_SPEED : NAV_WALK_SPEED;

            const marker = new window.AMap.Marker({
              position: [startPoint.lng, startPoint.lat],
              icon: 'https://webapi.amap.com/theme/v1.3/markers/n/loc.png',
              offset: new window.AMap.Pixel(-13, -30),
            });
            marker.setMap(mapInstance.current);
            navMarkerRef.current = marker;

            const update = () => {
              if (!navPointsRef.current.length || !navStartTimeRef.current) return;
              const elapsed = (Date.now() - navStartTimeRef.current) / 1000;
              const traveled = navSpeedRef.current * elapsed * playbackSpeed;
              if (traveled >= navTotalDistanceRef.current) return;

              let sum = 0;
              let target = navPointsRef.current[0];
              for (let i = 0; i < navPointsRef.current.length - 1; i++) {
                const p1 = navPointsRef.current[i];
                const p2 = navPointsRef.current[i + 1];
                const d = haversineDistance(p1, p2);
                if (traveled <= sum + d) {
                  const t = (traveled - sum) / d;
                  target = { lng: p1.lng + (p2.lng - p1.lng) * t, lat: p1.lat + (p2.lat - p1.lat) * t };
                  break;
                }
                sum += d;
              }
              navMarkerRef.current?.setPosition([target.lng, target.lat]);
              animationFrameId.current = requestAnimationFrame(update);
            };
            animationFrameId.current = requestAnimationFrame(update);
          } else {
            alert("路线查询失败！");
            setIsNavigating(false);
          }
        }
    );
  };

  // 停止导航 (Web)
  const handleWebStopNavigation = () => {
    setIsNavigating(false);
    setRouteInfo(null);
    onNavigationStop?.();
    if (drivingRouteRef.current) { drivingRouteRef.current.clear(); drivingRouteRef.current = null; }
    if (navMarkerRef.current) { navMarkerRef.current.setMap(null); navMarkerRef.current = null; }
    if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
    navPointsRef.current = [];
  };

  // =================== Unified handlers ===================

  const handleStartNavigation = isNative ? handleNativeStartNavigation : handleWebStartNavigation;
  const handleStopNavigation = isNative ? handleNativeStopNavigation : handleWebStopNavigation;

  // Expose speed ref for backward compatibility
  (window as any).navSpeedRef = navSpeedRef;

  return (
      <div ref={containerRef} className={`relative w-full h-full ${className}`}>
        {/* Web: map div container (invisible on native since map is behind WebView) */}
        {!isNative && <div ref={mapRef} className="w-full h-full" />}
        {/* Native: transparent overlay to allow WebView interactions to pass through */}

        {/* 导航控制面板 */}
        {showNavigation && startPoint && destination && !isNavigating && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-white p-3 rounded-xl shadow-xl w-64">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setNavMode('walking')} className={`flex-1 py-2 rounded-lg text-sm ${navMode === 'walking' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>步行</button>
                <button onClick={() => setNavMode('driving')} className={`flex-1 py-2 rounded-lg text-sm ${navMode === 'driving' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>驾车</button>
              </div>
              <button onClick={handleStartNavigation} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold">开始</button>
            </div>
        )}

        {/* 导航信息 */}
        {isNavigating && routeInfo && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center gap-4">
              <span className="text-sm font-bold">{routeInfo.distance}</span>
              <span className="text-sm text-gray-500">{routeInfo.duration}</span>
              <button onClick={handleStopNavigation} className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">✕</button>
            </div>
        )}
      </div>
  );
};

export default GaodeMap;
