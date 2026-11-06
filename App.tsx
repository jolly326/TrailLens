import React, { useState, useEffect, useRef, useMemo , useCallback, lazy, Suspense } from 'react';
import GaodeMap from './GaodeMap';
import {
  Play, Square, Map as MapIcon, Shield, Video, Navigation, Clock, Share2,
  Download, AlertTriangle, AlertCircle, ChevronLeft, LocateFixed, Zap,
  Home, FileText, User, Settings, LogOut, Footprints, SkipBack, SkipForward,
  RotateCw, Maximize2, Volume2, Image, Film, Scissors, Timer, Star,
  Filter, Text, Plus, Calendar, MapPin, Camera, ShieldCheck, Activity, Watch, Eye,
  Gauge, Sparkles, Palette, Type, Music, Layers, Wand2, FileVideo, Sticker, Info,
  Trash2, ZoomIn, ZoomOut, X,
} from 'lucide-react';
import { MOCK_PATH, MOCK_RISKS } from './constants';
import { Card, GlobalStyles, ViewFallback } from './components/ui';
import LazyLottie from './components/LazyLottie';
import {
  walkingAvocadoAnimation,
  liveChatbotAnimation,
  emojiWinkAnimation
} from './lib/animations';
import { clamp, clampToBBox, haversineDistance } from './lib/geo';
import { simulateBiometrics, createKeyNode, createHighlight, createSafetyAlert } from './lib/simulation';
import { VIEW, type TabKey, type ViewState } from './lib/navigation';
import { preloadNextViews } from './lib/preload';
import TabNav from './components/TabNav';
import { asset } from './lib/asset';
import type {
  AnalysisResult,
  SavedTrip,
  MapPopupData,
  TrackingStatsSnapshot,
  SegmentType,
  SafetyLevel,
  KeyNode,
  HighlightMoment,
  SafetyAlert,
  LiveStats,
  TrackPoint
} from './types';

// 页面级视图按需加载：首屏只保留 Home，其余进入时再拉取
const HomeView = lazy(() => import('./views/HomeView'));
const AnalyzingView = lazy(() => import('./views/AnalyzingView'));
const SummaryView = lazy(() => import('./views/SummaryView'));
const ReplayView = lazy(() => import('./views/ReplayView'));
const SafetyView = lazy(() => import('./views/SafetyView'));
const HighlightView = lazy(() => import('./views/HighlightView'));
const AITemplateView = lazy(() => import('./views/AITemplateView'));

// --- Main Application ---
export default function App() {
  GlobalStyles();
  const [view, setView] = useState<ViewState>(VIEW.HOME);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // Vlog 子视图状态
const [vlogSubView, setVlogSubView] = useState<'highlight' | 'aiTemplate'>('aiTemplate');

  // 预热下一屏 chunk，减少跳转时的加载等待
  useEffect(() => {
    preloadNextViews(view);
  }, [view]);

  // --- Simple Auth ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [sendCodeCountdown, setSendCodeCountdown] = useState(0);
  const [authError, setAuthError] = useState('')














  // Tracking State
  const [isTracking, setIsTracking] = useState(false);
   const [isCameraOpen, setIsCameraOpen] = useState(false); // 控制弹窗开关
    const [cameraIp, setCameraIp] = useState('192.168.43.160'); // 记录硬件的局域网 IP
  const [currentPath, setCurrentPath] = useState<TrackPoint[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [plannedPath, setPlannedPath] = useState<TrackPoint[]>([]);
  const plannedPathRef = useRef<TrackPoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [simulatedElevation, setSimulatedElevation] = useState<number>(50);
  const mapInstance = useRef<any>(null);
   /*
   新加的双搜索框状态列表
    */
  const [startPoint, setStartPoint] = useState<any>(null);
  const [startSearchValue, setStartSearchValue] = useState('');
  const [startSearchResults, setStartSearchResults] = useState<any[]>([]);
  const [showStartResults, setShowStartResults] = useState(false);
  const [destination, setDestination] = useState<any>(null);
  const [endSearchValue, setEndSearchValue] = useState('');
  const [endSearchResults, setEndSearchResults] = useState<any[]>([]);
  const [showEndResults, setShowEndResults] = useState(false);



// 选择起点

  // Analysis State
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Replay State
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [replaySpeed, setReplaySpeed] = useState<number>(3);
  const [autoFitTracking, setAutoFitTracking] = useState(true);
  const replayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mapPopup, setMapPopup] = useState<MapPopupData | null>(null);
  const [mapPopupFadeOut, setMapPopupFadeOut] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  // Refs for intervals
  const trackingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const replayInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpecialIndexRef = useRef<number | null>(null);
  const hasReachedEndRef = useRef(false);

  const fixedTrackingStatsRef = useRef<TrackingStatsSnapshot | null>(null);
  const markerSeedRef = useRef(91113);

  const formatHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!fixedTrackingStatsRef.current) {
    const durationSeconds = Math.floor(35 * 60 + Math.random() * 75 * 60);
    const distanceKm = 3.5 + Math.random() * 8.5;
    const speedKmh = 2.8 + Math.random() * 3.5;
    fixedTrackingStatsRef.current = {
      durationLabel: formatHMS(durationSeconds),
      distanceKm: distanceKm.toFixed(2),
      speedKmh: speedKmh.toFixed(1),
      heartRate: Math.round(88 + Math.random() * 28),
      bodyTemp: +(36.2 + Math.random() * 0.7).toFixed(2),
      elevation: Math.round(420 + Math.random() * 180)
    };
  }

  const [showForm, setShowForm] = useState<'login' | 'register' | null>(null);
  const [panelHeight, setPanelHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // ✅ 在这里添加历史记录相关的 state
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [showPointModal, setShowPointModal] = useState(false);
// 历史记录详情相关状态（用于真实路线规划）
const [dynamicPathPoints, setDynamicPathPoints] = useState<TrackPoint[]>([]);
const [isLoadingRoute, setIsLoadingRoute] = useState(false);
const [routeInfoDetail, setRouteInfoDetail] = useState({ distance: '查询中...', duration: '查询中...' });
  const [playbackSpeed, setPlaybackSpeed] = useState(20);

 // 真实路线查询（坐标方案，支持三个不同终点）
useEffect(() => {
  if (view !== VIEW.HISTORY_DETAIL || !selectedHistoryId) return;
  if (dynamicPathPoints.length > 0) return;
  if (isLoadingRoute) return;

  if (!window.AMap || !window.AMap.Driving) {
    const timer = setTimeout(() => {
      if (window.AMap && window.AMap.Driving && view === VIEW.HISTORY_DETAIL && selectedHistoryId && dynamicPathPoints.length === 0) {
        setIsLoadingRoute(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }

  setIsLoadingRoute(true);
  setRouteInfoDetail({ distance: '查询中...', duration: '查询中...' });

  // 起点固定为北京交通大学
  const beijingJiaotong: [number, number] = [116.345, 39.952];
  let end: [number, number];
  let endName = '';

  switch (selectedHistoryId) {
    case '1':
      end = [116.185, 39.985]; // 西山森林公园
      endName = '西山森林公园';
      break;
    case '2':
      end = [116.205, 39.992]; // 香山公园
      endName = '香山公园';
      break;
    case '3':
      end = [116.322, 39.919]; // 玉渊潭公园
      endName = '玉渊潭公园';
      break;
    default:
      return;
  }

  console.log(`开始驾车查询：北京交通大学 → ${endName}`, beijingJiaotong, end);

  const driving = new window.AMap.Driving({ policy: window.AMap.DrivingPolicy.LEAST_TIME });
  driving.search(beijingJiaotong, end, (status: string, result: any) => {
    setIsLoadingRoute(false);
    if (status === 'complete' && result.routes && result.routes.length > 0) {
      const route = result.routes[0];
      const points: TrackPoint[] = [];
      let totalDistance = 0, totalTime = 0;

      route.steps.forEach((step: any) => {
        if (step.path) {
          step.path.forEach((coord: any) => {
            let lng, lat;
            if (Array.isArray(coord)) { lng = coord[0]; lat = coord[1]; }
            else if (coord && typeof coord === 'object') { lng = coord.lng; lat = coord.lat; }
            else return;
            points.push({
              id: `route-${points.length}`,
              lat, lng,
              timestamp: Date.now() + points.length * 100,
              elevation: 0,
              type: 'normal',
            } as TrackPoint);
          });
        }
        totalDistance += step.distance;
        totalTime += step.time;
      });

      console.log(`查询成功，获取 ${points.length} 个点，距离 ${(totalDistance/1000).toFixed(2)} km`);
      setDynamicPathPoints(points);
      setRouteInfoDetail({
        distance: `${(totalDistance / 1000).toFixed(1)} km`,
        duration: `${Math.round(totalTime / 60)}分钟`,
      });
    } else {
      console.error('驾车查询失败', status, result);
      setRouteInfoDetail({ distance: '规划失败', duration: '请检查网络' });
      setDynamicPathPoints([]);
    }
  });
}, [view, selectedHistoryId, dynamicPathPoints.length, isLoadingRoute]);


  const convertRouteToTrackPoints = (route: any): TrackPoint[] => {
    const points: TrackPoint[] = [];
    const now = Date.now();
    let index = 0;

    if (!route || !route.steps) return points;

    route.steps.forEach((step: any) => {
      // 对路线随机分段，为这一段路赋予上坡或下坡的属性
      const currentGrade = Math.random() > 0.5 ? 'uphill' : 'downhill';
      let coords: { lng: number; lat: number }[] = [];

      if (typeof step.path === 'string') {
        const pathStr = step.path;
        coords = pathStr.split(';').map((coord: string) => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lng, lat };
        });
      } else if (Array.isArray(step.path)) {
        coords = step.path
          .map((point: any) => {
            if (Array.isArray(point)) {
              return { lng: point[0], lat: point[1] };
            } else if (point && typeof point === 'object' && 'lng' in point && 'lat' in point) {
              return { lng: point.lng, lat: point.lat };
            }
            return null;
          })
          .filter(Boolean);
      }

      coords.forEach((coord) => {
        points.push({
          id: `route-${now}-${index++}`,
          lat: coord.lat,
          lng: coord.lng,
          timestamp: now + index * 100,
          type: 'normal',
          segmentGrade: currentGrade // 将上/下坡信息绑定到当前点上
        } as any);
      });
    });

    return points;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = startYRef.current - e.clientY;
      let newHeight = startHeightRef.current + delta;
      newHeight = Math.min(Math.max(newHeight, 160), window.innerHeight * 0.7);
      setPanelHeight(newHeight);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Tracking Logic
  useEffect(() => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (trackingTimeout.current) clearTimeout(trackingTimeout.current);

    if (isTracking) {
      timerInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (trackingTimeout.current) clearTimeout(trackingTimeout.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isTracking]);

  useEffect(() => {
    if (!isTracking) return;
    if (!currentPath || currentPath.length === 0) return;

    const curr = currentPath[currentPath.length - 1];
    const segmentType = (curr.type || 'normal') as SegmentType;
    const avgSpeed = elapsedTime > 0 ? (distance / elapsedTime) * 3.6 : 5;
    const biometrics = simulateBiometrics(segmentType, simulatedElevation, avgSpeed);

    setLiveStats({
      currentSegment: segmentType,
      heartRate: biometrics.heartRate,
      bodyTemp: biometrics.bodyTemp,
      elevation: simulatedElevation,
      isDeviating: false
    });
  }, [currentPath.length, isTracking, distance, elapsedTime, simulatedElevation]);

  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      const newElevation = Math.round((48 + Math.random() * 7) * 10) / 10;
      setSimulatedElevation(newElevation);
    }, 30000);
    return () => clearInterval(interval);
  }, [isTracking]);

  useEffect(() => {
    if (view !== VIEW.TRACKING) return;
    setAutoFitTracking(true);
    const t = setTimeout(() => setAutoFitTracking(false), 800);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    if (replayTimeout.current) {
      clearTimeout(replayTimeout.current as ReturnType<typeof setTimeout>);
      replayTimeout.current = null;
    }
    if (view !== VIEW.REPLAY) return;
    if (!isPlayingReplay) return;
    if (!currentPath || currentPath.length === 0) return;

    const scheduleNext = () => {
      const idx = replayIndex;
      if (idx >= currentPath.length - 1) {
        setIsPlayingReplay(false);
        return;
      }
      const nowTs = currentPath[idx].timestamp || Date.now();
      const nextTs = currentPath[idx + 1].timestamp || nowTs + 1000;
      let delay = Math.max(50, (nextTs - nowTs) / replaySpeed);
      if (!isFinite(delay) || delay <= 0) delay = 200;

      replayTimeout.current = setTimeout(() => {
        setReplayIndex(i => Math.min(i + 1, currentPath.length - 1));
      }, delay);
    };
    scheduleNext();
    return () => {
      if (replayTimeout.current) clearTimeout(replayTimeout.current as ReturnType<typeof setTimeout>);
      replayTimeout.current = null;
    };
  }, [view, isPlayingReplay, replayIndex, currentPath, replaySpeed]);

  useEffect(() => {
    if (sendCodeCountdown <= 0) return;
    const id = setInterval(() => setSendCodeCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [sendCodeCountdown]);

  const getSemanticLocation = (p: TrackPoint) => {
    if (p.lat > 40.5) return '古北口—司马台长城段';
    if (p.lat > 39.97 && p.lng < 116.12) return '西山国家森林公园林间道';
    if (p.lat > 39.93) return '香山山野步道';
    return '西山山径';
  };

  const buildRiskPoints = (path: TrackPoint[], seedBase = 0): TrackPoint[] => {
    if (!path || path.length < 4) return [];
    const total = path.length;
    const markerIndices = [
      Math.floor(total * 0.18),
      Math.floor(total * 0.36),
      Math.floor(total * 0.58),
      Math.floor(total * 0.8)
    ];
    const riskTemplates = [
      { title: '碎石密集', desc: '碎石松动，重心不稳时容易打滑。' },
      { title: '急弯下坡', desc: '转弯后坡度突然增大，注意刹步。' },
      { title: '湿滑路面', desc: '局部有湿滑苔藓，避免急停。' },
      { title: '台阶落差', desc: '连续台阶落差大，容易崴脚。' },
      { title: '遮挡视线', desc: '植被遮挡前路，提前放慢速度。' },
      { title: '风力增强', desc: '侧风明显，注意身体平衡。' }
    ];
    const riskKeyframePool = [
      "https://picsum.photos/id/10/400/800?category=nature",
      "https://picsum.photos/id/11/400/800?category=nature",
      "https://picsum.photos/id/12/400/800?category=nature",
      "https://picsum.photos/id/13/400/800?category=nature",
      "https://picsum.photos/id/14/400/800?category=nature",
      "https://picsum.photos/id/15/400/800?category=nature"
    ];
    return markerIndices.map((idx, i) => {
      const base = path[Math.min(idx, total - 1)];
      const template = riskTemplates[(i + seedBase) % riskTemplates.length];
      const level = i % 3 === 0 ? 2 : 1;
      const frameSeed = (i * 7 + seedBase * 3) % riskKeyframePool.length;
      return {
        ...base,
        id: `risk-${Date.now()}-${idx}-${i}`,
        type: 'risk' as const,
        riskLevel: level as SafetyLevel,
        riskDescription: `${template.title}：${template.desc}`,
        riskMedia: [
          riskKeyframePool[frameSeed],
          riskKeyframePool[(frameSeed + 3) % riskKeyframePool.length],
          riskKeyframePool[(frameSeed + 5) % riskKeyframePool.length]
        ]
      };
    });
  };

  const buildTripSnapshot = (
    path: TrackPoint[],
    name: string,
    safetyRating: 'S' | 'A' | 'B' | 'C' | 'D',
    seedBase = 0
  ): SavedTrip => {
    const risks = buildRiskPoints(path, seedBase);
    return {
      id: Date.now() + Math.floor(Math.random() * 999),
      name,
      path,
      risks,
      safetyRating,
      createdAt: Date.now()
    };
  };

  const handleTabChange = (tab: TabKey) => {
  if (isTracking) return;
  setActiveTab(tab);
  if (tab === 'home') {
    setView(VIEW.HOME);
  } else {
    // 只在需要展示数据时才加载模拟数据，但不要覆盖已有真实轨迹
    if (currentPath.length === 0) {
      loadMockData();
    }
    if (tab === 'trips') setView(VIEW.SUMMARY);
    else if (tab === 'vlog') setView(VIEW.VLOG);
    else if (tab === 'safety') setView(VIEW.SAFETY);
    else if (tab === 'profile') setView(VIEW.PROFILE);
  }
};

  const startTracking = () => {
    setIsTracking(true);
    setView(VIEW.TRACKING);
    setCurrentPath([]);
    setElapsedTime(0);
    setDistance(0);
    setPlannedPath([]);
    plannedPathRef.current = [];
    setLiveStats(null);
    setMapPopup(null);
  };

  const loadMockData = () => {
    setCurrentPath(MOCK_PATH);
    setDistance(5430);
    setElapsedTime(3600 + 45 * 60);
    setAnalysisResult({
      name: "晨间山径探险",
      safetyRating: "A",
      summary: "天气晴朗，这是一次穿越螺旋山径的愉快徒步。",
      vlogCaption: "大自然的呼唤！🌲 看看我最新的螺旋探险。 #TrailLens",
      highlights: MOCK_PATH.filter(p => p.type !== 'normal'),
      risks: MOCK_RISKS,
    });
  };

  const endTracking = () => {
    setIsTracking(false);
    setView(VIEW.ANALYZING);
    runAnalysis();
  };

  const runAnalysis = async () => {
    setAnalysisStep(0);
    await new Promise(r => setTimeout(r, 1500));
    setAnalysisStep(1);
    await new Promise(r => setTimeout(r, 1500));
    setAnalysisStep(2);

    // 优先使用实际规划产生的轨迹，如果没有的话再退回 MOCK 数据
    const finalPath = plannedPathRef.current.length > 0 
      ? plannedPathRef.current 
      : (currentPath.length < 5 ? MOCK_PATH : currentPath);
      
    setCurrentPath(finalPath);
    setReplayIndex(0);

    let genName = "晨间探险";
    let genSummary = "在山丘间的一次轻快徒步。";
    let genSafety = "S";
    let genCaption = "追逐阳光！☀️ #TrailLens";

    try {
      if (process.env.API_KEY) {
        // @google/genai 体积较大，仅在真正调用 AI 时按需加载
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          I just finished a hike. 
          Distance: ${(distance/1000).toFixed(2)}km. 
          Duration: ${formatTime(elapsedTime)}.
          Generate a JSON response with the following fields (all values must be in Simplified Chinese):
          1. "name": A creative short name for this trip (e.g., "City Night Run", "Mountain Conquest").
          2. "safety_rating": A letter grade (S, A, B, C, D) based on simulated normal hiking conditions.
          3. "summary": One sentence summary in Chinese.
          4. "vlog_caption": A social media caption for a vlog of this trip in Chinese.
        `;
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        const text = result.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          genName = data.name || genName;
          genSafety = data.safety_rating || genSafety;
          genSummary = data.summary || genSummary;
          genCaption = data.vlog_caption || genCaption;
        }
      }
    } catch (e) {
      console.error("Gemini API Error (using defaults):", e);
    }

    setAnalysisResult({
      name: genName,
      safetyRating: genSafety as any,
      summary: genSummary,
      vlogCaption: genCaption,
      highlights: finalPath.filter(p => p.type !== 'normal'),
      risks: MOCK_RISKS,
    });

    setSavedTrips(prev => [...prev, buildTripSnapshot(finalPath, genName, genSafety as any, prev.length + 1)]);

    await new Promise(r => setTimeout(r, 1000));
    setView(VIEW.SUMMARY);
    setActiveTab('trips');
  };

  const saveCurrentTrip = (name?: string) => {
    const tripName = name || `行程 ${savedTrips.length + 1}`;
    const rating = analysisResult?.safetyRating || 'A';
    const snapshot = buildTripSnapshot(currentPath, tripName, rating, savedTrips.length + 2);
    setSavedTrips(prev => [...prev, snapshot]);
    alert(`已保存: ${tripName}`);
  };

  const exportCurrentTrip = () => {
    if (!currentPath || currentPath.length === 0) { alert('当前没有轨迹可导出'); return; }
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: currentPath.map(p => [p.lng, p.lat])
      },
      properties: {
        name: analysisResult?.name || `TrailLens Export ${new Date().toISOString()}`
      }
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(analysisResult?.name || 'trail')}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDist = (meters: number) => {
    return (meters / 1000).toFixed(2);
  };

  // ================== 认证页面（未登录） ==================
  if (!isAuthenticated) {
    const bgAnimationStyle = `
    @keyframes rotateEarth {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .earth-circle {
      width: 600px;                
      height: 600px;
      border-radius: 50%;
      position: absolute;
      top: 70%;                    
      left: -25%;                   
      transform: translate(-50%, -50%); 
      animation: rotateEarth 80s linear infinite;
      opacity: 0.8;
      box-shadow: 0 0 120px rgba(0, 191, 255, 0.5);
      z-index: 5;
    }
    .space-bg {
      background: #000000;
      overflow: hidden;            
    }
    .flash-text {
      font-size: 64px;
      font-weight: 900;
      background: linear-gradient(90deg, #10b981, #86efac, #10b981);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: flash 3s linear infinite;
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 25;
    }
    @keyframes flash {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .version-text {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
    }
    .bubble-btn {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #10b981;
      font-weight: 900;
      font-size: 48px;
      font-family: "Comic Sans MS", "幼圆", "微软雅黑", sans-serif;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      z-index: 30;
      transition: all 0.3s ease;
    }
    .bubble-btn:nth-child(1) {
      animation: float1 3s ease-in-out infinite;
    }
    .bubble-btn:nth-child(2) {
      animation: float2 3s ease-in-out infinite 0.5s;
    }
    @keyframes float1 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(2deg); }
    }
    @keyframes float2 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(-2deg); }
    }
    .bubble-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: lightSweep 2.5s linear infinite;
    }
    @keyframes lightSweep {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    .bubble-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
    }
    @keyframes formSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .form-popup {
      animation: formSlideUp 0.4s ease-out forwards;
    }
  `;

    return (
      <div className="h-screen w-full flex items-center justify-center text-white p-6 relative overflow-hidden space-bg">
        <style dangerouslySetInnerHTML={{ __html: bgAnimationStyle }} />
        <div
          className="earth-circle"
          style={{
            backgroundImage: `url(${asset('img/地球圆形图.png')})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        ></div>
        <LazyLottie
          src={walkingAvocadoAnimation}
          loop={true}
          autoplay={true}
          style={{
            width: '100px',
            height: '100px',
            position: 'absolute',
            top: '67%',
            left: '50%',
            marginLeft: '-50px',
            marginTop: '-50px',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
        {!showForm && <div className="flash-text">Trailens</div>}
        <div className="version-text">version 1.1.0</div>
        {!showForm ? (
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div
              className="bubble-btn pointer-events-auto absolute top-[45%] left-[45%]"
              onClick={() => {
                setShowForm('login');
                setAuthMode('login');
              }}
            >
              登录
            </div>
            <div
              className="bubble-btn pointer-events-auto absolute bottom-[-15%] right-[-5%]"
              onClick={() => {
                setShowForm('register');
                setAuthMode('register');
              }}
            >
              注册
            </div>
          </div>
        ) : (
          <div className="form-popup w-full max-w-md bg-[#0a1028]/-10 backdrop-blur-md p-8 rounded-2xl border border-[#1e293b] shadow-2xl relative z-20">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              onClick={() => setShowForm(null)}
            >
              ✕
            </button>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#10b981] mb-2">TrailLens</h1>
              <p className="text-slate-300 text-sm">记录每一次徒步，发现更多路径灵感</p>
            </div>
            <div className="w-full flex rounded-full bg-[#1e293b]/70 p-1 mb-6">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 text-center px-4 py-3 rounded-full font-medium transition-all duration-300 ${
                  authMode === 'login'
                    ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 text-center px-4 py-3 rounded-full font-medium transition-all duration-300 ${
                  authMode === 'register'
                    ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                注册
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-200 mb-2 text-sm">账号</label>
                <input
                  className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                  placeholder="请输入账号"
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-200 mb-2 text-sm">密码</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                  placeholder="请输入密码"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                />
              </div>
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-slate-200 mb-2 text-sm">确认密码</label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                      placeholder="请再次输入密码"
                      value={authConfirm}
                      onChange={e => setAuthConfirm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-slate-200 mb-2 text-sm">手机号</label>
                      <input
                        className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                        placeholder="手机号"
                        value={authPhone}
                        onChange={e => setAuthPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <button
                        aria-label="发送验证码"
                        disabled={sendCodeCountdown > 0}
                        onClick={() => {
                          if (!authPhone) { setAuthError('请输入手机号以接收验证码'); return; }
                          setAuthError('');
                          setSendCodeCountdown(60);
                        }}
                        className={`w-full py-3 rounded-lg bg-[#1e293b]/80 border border-[#334155] text-sm text-slate-200 transition-all ${
                          sendCodeCountdown > 0
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:bg-[#334155] hover:border-[#10b981]/50'
                        }`}
                      >
                        {sendCodeCountdown > 0 ? `${sendCodeCountdown}s` : '发送验证码'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-200 mb-2 text-sm">手机验证码</label>
                    <input
                      className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[#334155] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all"
                      placeholder="请输入手机验证码"
                      value={authCode}
                      onChange={e => setAuthCode(e.target.value)}
                    />
                  </div>
                </>
              )}
              {authError && (
                <div className="text-sm text-red-400 mt-1">{authError}</div>
              )}
              <button
                className="w-full py-3 bg-[#10b981] rounded-lg font-bold text-black hover:bg-[#059669] transition-all shadow-lg shadow-[#10b981]/20 mt-2"
                onClick={() => {
                  setAuthError('');
                  if (authMode === 'login') {
                    if (!authUsername || !authPassword) { setAuthError('请输入账号和密码'); return; }
                    setIsAuthenticated(true);
                    setView(VIEW.HOME);
                    setActiveTab('home');
                  } else {
                    if (!authUsername || !authPassword || !authConfirm) { setAuthError('请完整填写注册信息'); return; }
                    if (authPassword !== authConfirm) { setAuthError('两次输入的密码不一致'); return; }
                    if (!authPhone || !authCode) { setAuthError('请输入手机号与验证码'); return; }
                    setIsAuthenticated(true);
                    setView(VIEW.HOME);
                    setActiveTab('home');
                  }
                }}
              >
                {authMode === 'login' ? '登录' : '创建账户'}
              </button>
              <div className="text-xs text-slate-400 mt-4 text-center">
                安全地记录您的行程与回放，隐私仅存本地。
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  const tabViews = [VIEW.HOME, VIEW.SUMMARY, VIEW.PROFILE, VIEW.VLOG, VIEW.SAFETY] as const;
  const shouldShowTabs = tabViews.includes(view as typeof tabViews[number]);

  // ================== Views ==================
  // 1. Home View
  if (view === VIEW.HOME) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <HomeView
          onStartTracking={startTracking}
          tabBar={shouldShowTabs && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
        />
      </Suspense>
    );
  }

  // 2. Tracking View
  if (view === VIEW.TRACKING)
  {
    const fixedStats = fixedTrackingStatsRef.current!;
    const displayPath = currentPath;
    const endIndex = displayPath.length > 0 ? displayPath.length - 1 : 0;
    const lastPoint = displayPath.length > 0 ? displayPath[endIndex] : null;
    const durationLabel = formatHMS(elapsedTime);
    const distanceKm = formatDist(distance);
    const speedKmh = currentSpeed;
    const liveHeart = liveStats?.heartRate ?? fixedStats.heartRate;
    const liveTemp = liveStats?.bodyTemp ?? fixedStats.bodyTemp;
    const liveElevation = liveStats?.elevation ?? fixedStats.elevation;

    const onDragStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;
      startHeightRef.current = panelHeight;
    };



// 起点搜索
    // 起点搜索
    const handleStartSearch = () => {
      if (!window.AMap || !startSearchValue.trim()) return;
      const search = new window.AMap.PlaceSearch({ city: '全国', pageSize: 10 });

      search.search(startSearchValue, (status: string, result: any) => {
        console.log("=== 【起点搜索返回】 ===", { status, result }); // 👈 测试输出
        if (status === 'complete' && result.poiList?.pois) {
          const fixedPois = result.poiList.pois.map((p : any) => ({
            ...p,
            name: p.name || p.address || '未知地点'
          }));
          console.log("=== 【起点修复后POI】 ===", fixedPois[0]); // 👈 测试输出
          setStartSearchResults(fixedPois);
          setShowStartResults(true);
        } else {
          setShowStartResults(false);
        }
      });
    };

// 终点搜索
    const handleEndSearch = () => {
      if (!window.AMap || !endSearchValue.trim()) return;
      const search = new window.AMap.PlaceSearch({ city: '全国', pageSize: 10 });

      search.search(endSearchValue, (status: string, result: any) => {
        console.log("=== 【终点搜索返回】 ===", { status, result }); // 👈 测试输出
        if (status === 'complete' && result.poiList?.pois) {
          const fixedPois = result.poiList.pois.map((p: any) => ({
            ...p,
            name: p.name || p.address || '未知地点'
          }));
          console.log("=== 【终点修复后POI】 ===", fixedPois[0]); // 👈 测试输出
          setEndSearchResults(fixedPois);
          setShowEndResults(true);
        } else {
          setShowEndResults(false);
        }
      });
    };

// 选择起点
    const handleSelectStartPoint = (poi: any) => {
      console.log("=== 【点击起点】 ===", poi); // 👈 测试输出
      const displayName = poi.name || poi.address || '未知地点';
      setStartPoint({
        lat: poi.location.lat,
        lng: poi.location.lng,
        name: displayName,
      });
      setStartSearchValue(displayName);
    };

// 选择终点
    const handleSelectDestination = (poi: any) => {
      console.log("=== 【点击终点】 ===", poi); // 👈 测试输出
      const displayName = poi.name || poi.address || '未知地点';
      setDestination({
        lat: poi.location.lat,
        lng: poi.location.lng,
        name: displayName,
      });
      setEndSearchValue(displayName);
    };

// 定位到当前位置作为起点
    const handleStartLocation = () => {
      if (!window.AMap) return;
      const geo = new window.AMap.Geolocation({ enableHighAccuracy: true });
      geo.getCurrentPosition((status: string, res: any) => {
        console.log("=== 【定位返回】 ===", { status, res }); // 👈 测试输出
        if (status === 'complete') {
          const lat = res.position.getLat();
          const lng = res.position.getLng();
          setStartPoint({ lat, lng, name: '我的位置' });
          setStartSearchValue('我的位置');
          if (mapInstance.current) {
            mapInstance.current.setCenter([lng, lat]);
            mapInstance.current.setZoom(16);
          }
        }
      });
    };

















    return(
        <div className="h-screen w-full flex flex-col bg-slate-900 relative overflow-hidden">
          <div className="flex-1 relative z-0">
            <div className="h-full w-full relative">
              <GaodeMap
                  path={currentPath}
                  plannedPath={plannedPath}
                  autoFit={autoFitTracking}
                  currentIndex={endIndex}
                  showLocation={true}
                  showSearch={false}
                  showNavigation={true}
                  showUserPath={true}
                  startPoint={startPoint}
                  destination={destination}

                  onLocationChange={(lat, lng, altitude) => {
                    const newPoint: TrackPoint = {
                      id: `loc-${Date.now()}`,
                      lat,
                      lng,
                      timestamp: Date.now(),
                      elevation: altitude,
                      type: 'normal'
                    };
                    setCurrentPath(prev => {
                      if (prev.length > 0) {
                        const last = prev[prev.length - 1];
                        const d = haversineDistance(last, newPoint);
                        const timeDiffSeconds = (newPoint.timestamp - last.timestamp) / 1000;
                        if (timeDiffSeconds > 0) {
                          const speedKmh = (d / timeDiffSeconds) * 3.6;
                          setCurrentSpeed(speedKmh);
                        }
                        setDistance(prevDist => prevDist + d);
                      }
                      return [...prev, newPoint];
                    });
                  }}
                  onSearchResult={(result) => console.log('搜索结果:', result)}
                  onRouteCalculated={(route) => {
                    console.log('路线计算完成:', route);
                    const trackPoints = convertRouteToTrackPoints(route);
                    setPlannedPath(trackPoints);
                    plannedPathRef.current = trackPoints;
                  }}
                  onNavigationStart={() => console.log('开始导航')}
                  onNavigationStop={() => console.log('停止导航')}
              />

              {/* === 双搜索框：起点 + 终点 完全对称功能 === */}
              <div
                  className="absolute top-24 left-4 right-4 z-[9999] space-y-2"
                  style={{ pointerEvents: 'auto' }}
              >
                {/* 起点：输入 + 搜索 + 定位 */}
                <div
                    className="bg-white/95 backdrop-blur-md rounded-lg p-3 flex items-center shadow-xl border border-slate-200 gap-2"
                    style={{ pointerEvents: 'auto' }}
                >
                  <div className="w-4 h-4 rounded-full bg-green-500 mr-1 flex-shrink-0"></div>
                  <input
                      type="text"
                      className="flex-1 outline-none text-base px-1 bg-transparent border-none"
                      placeholder="输入起点"
                      value={startSearchValue}
                      onChange={(e) => setStartSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStartSearch()}
                      style={{ pointerEvents: 'auto', cursor: 'text', color: '#000' }}
                  />
                  {/* 起点搜索按钮 */}
                  <button
                      className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      onClick={handleStartSearch}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    搜索
                  </button>
                  {/* 定位按钮 */}
                  <button
                      className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      onClick={handleStartLocation}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    📍定位
                  </button>
                </div>

                {/* 终点 */}
                <div
                    className="bg-white/95 backdrop-blur-md rounded-lg p-3 flex items-center shadow-xl border border-slate-200"
                    style={{ pointerEvents: 'auto' }}
                >
                  <div className="w-4 h-4 rounded-full bg-red-500 mr-3 flex-shrink-0"></div>
                  <input
                      type="text"
                      className="flex-1 outline-none text-base px-2 bg-transparent border-none"
                      placeholder="输入终点"
                      value={endSearchValue}
                      onChange={(e) => setEndSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEndSearch()}
                      style={{ pointerEvents: 'auto', cursor: 'text', color: '#000' }}
                  />
                  <button
                      className="text-sm px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      onClick={handleEndSearch}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    搜索
                  </button>
                </div>

                {/* 起点搜索结果 - 强制两行显示，永不空白 */}
                {showStartResults && startSearchResults.length > 0 && (
                    <div className="bg-white rounded-lg shadow-xl max-h-40 overflow-y-auto border border-slate-200 z-[10000]" style={{ pointerEvents: 'auto' }}>
                      {startSearchResults.map((poi, i) => (
                          <div
                              key={i}
                              className="px-4 py-3 border-b hover:bg-gray-100 cursor-pointer text-base"
                              onClick={() => {
                                handleSelectStartPoint(poi);
                                setShowStartResults(false);
                                if (mapInstance.current) {
                                  mapInstance.current.setCenter([poi.location.lng, poi.location.lat]);
                                  mapInstance.current.setZoom(16);
                                }
                              }}
                          >
                            {/* 🔴 强制两行，用兜底逻辑，永远显示 */}
                            <div className="font-medium text-gray-900 mb-1">
                              {poi.name ?? poi.address?.split(',')[0] ?? poi.address ?? '未知地点'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {poi.address ?? ''}
                            </div>
                          </div>
                      ))}
                    </div>
                )}

                {/* 终点搜索结果 - 同步强制显示 */}
                {showEndResults && endSearchResults.length > 0 && (
                    <div className="bg-white rounded-lg shadow-xl max-h-40 overflow-y-auto border border-slate-200 z-[10000]" style={{ pointerEvents: 'auto' }}>
                      {endSearchResults.map((poi, i) => (
                          <div
                              key={i}
                              className="px-4 py-3 border-b hover:bg-gray-100 cursor-pointer text-base"
                              onClick={() => {
                                handleSelectDestination(poi);
                                setShowEndResults(false);
                                if (mapInstance.current) {
                                  mapInstance.current.setCenter([poi.location.lng, poi.location.lat]);
                                  mapInstance.current.setZoom(16);
                                }
                              }}
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {poi.name ?? poi.address?.split(',')[0] ?? poi.address ?? '未知地点'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {poi.address ?? ''}
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>

              {/* 顶部标题栏 */}
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-transparent pt-12 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-md w-fit shadow-lg shadow-emerald-500/10">
                    <div className="w-4 h-4 relative flex items-center justify-center">
                      <LazyLottie src={walkingAvocadoAnimation} loop={true} style={{ height: 40 }} />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 tracking-wider">正在记录行程</span>
                  </div>
                  <h2 className="text-2xl font-black text-white drop-shadow-md">当前行程</h2>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-xl">
                  <Shield size={16} className="text-emerald-400" />
                  <span className="text-xs font-medium text-slate-200">生命守望系统</span>
                </div>
              </div>
            </div>
          </div>

          {/* === 底部滑动面板 === */}
          <div
              style={{ height: panelHeight }}
              className="bg-slate-900/90 backdrop-blur-2xl border-t border-slate-700/50 rounded-t-[2.5rem] shadow-[0_-15px_50px_rgba(0,0,0,0.5)] z-20 -mt-10 relative transition-all"
          >
            <div
                onMouseDown={onDragStart}
                className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-5 cursor-ns-resize z-30 flex justify-center items-center"
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
            </div>

            <div className="pt-8 px-6 pb-10 h-full overflow-y-auto no-scrollbar">
              {/* 1. 顶部三个数据统计 */}
              <div className="grid grid-cols-3 gap-4 mb-6 mt-2">
                <div className="text-center flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center mb-2 text-slate-400">
                    <Clock size={14} />
                  </div>
                  <p className="text-2xl font-mono font-black text-white tracking-tight">{durationLabel}</p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">总用时</p>
                </div>
                <div className="text-center border-x border-slate-700/50 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center mb-2 text-blue-400">
                    <Navigation size={14} />
                  </div>
                  <p className="text-2xl font-mono font-black text-white tracking-tight">
                    {speedKmh.toFixed(1)} <span className="text-xs text-slate-500 font-medium">km/h</span>
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">实时速度</p>
                </div>
                <div className="text-center flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center mb-2 text-emerald-400">
                    <Activity size={14} />
                  </div>
                  <p className="text-2xl font-mono font-black text-white tracking-tight">
                    {distanceKm} <span className="text-xs text-slate-500 font-medium">km</span>
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">累计距离</p>
                </div>
              </div>

              {/* 2. 摄像头模块 */}
              <div className="mb-8 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xs font-bold uppercase text-purple-400 tracking-widest flex items-center gap-2">
                    <Camera size={16} /> 实时监控视图
                  </div>

                  <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] hover:scale-110 active:scale-95 transition-all animate-pulse"
                  >
                    <Video size={22} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 rounded-xl p-1.5 shadow-inner relative">
                    <div className="w-20 h-16 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700">
                      <img
                          src={`http://${cameraIp}:81/stream`}
                          alt="实时画面"
                          className="w-24 h-20 rounded-lg object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white tracking-wider flex items-center gap-1 border border-white/10 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></span>
                        LIVE
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-100 mb-1">实时行程画面</div>
                    <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      点击右侧紫色按钮开启
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 生命体征监测 */}
              <div className="mb-8">
                <div className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-amber-400" /> 生命体征监测
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="text-center py-4 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-center mb-1 h-6">
                      <LazyLottie src={liveChatbotAnimation} loop={true} style={{ height: 40 }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">心率</div>
                    <div className="text-lg font-black text-rose-400">
                      {liveHeart} <span className="text-[10px] text-slate-500 font-normal">bpm</span>
                    </div>
                  </Card>
                  <Card className="text-center py-4 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105">
                    <div className="flex justify-center mb-1 h-6 items-center text-amber-300 opacity-80">
                      <Zap size={16} />
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">体温</div>
                    <div className="text-lg font-black text-amber-300">
                      {liveTemp} <span className="text-[10px] text-slate-500 font-normal">°C</span>
                    </div>
                  </Card>
                  <Card className="text-center py-4 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105">
                    <div className="flex justify-center mb-1 h-6 items-center text-emerald-300 opacity-80">
                      <MapPin size={16} />
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">海拔</div>
                    <div className="text-lg font-black text-emerald-300">
                      {liveElevation} <span className="text-[10px] text-slate-500 font-normal">m</span>
                    </div>
                  </Card>
                </div>
              </div>

              {/* 4. 结束按钮 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-red-500/20 blur-xl group-hover:bg-red-500/30 transition-colors duration-500 rounded-2xl"></div>
                <button
                    onClick={endTracking}
                    className="relative w-full py-4 bg-red-500/10 border border-red-500/40 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-red-500/20 hover:shadow-red-500/20 active:scale-98 transition-all duration-300"
                >
                  <Square fill="#f87171" className="text-red-400" size={18} />
                  <span className="text-lg font-bold text-red-100 tracking-wide">结束本次行程</span>
                </button>
              </div>
            </div>
          </div>

          {/* ====== 视频流全屏弹窗 ====== */}
          {isCameraOpen && (
              <div className="absolute inset-0 z-[100] bg-slate-950/95 flex flex-col items-center justify-center p-6">
                {/* 顶栏 */}
                <div className="w-full max-w-md flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                    实时行程画面
                  </div>
                  <button
                      onClick={() => setIsCameraOpen(false)}
                      className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 视频显示区 */}
                <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden border-2 border-slate-800 aspect-video flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <img
                      src={`http://${cameraIp}:81/stream`}
                      alt="等待视频流..."
                      className="w-full h-full object-cover z-10 relative"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                      }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm">
                    <Video size={32} className="mb-2 opacity-50" />
                    <span>正在连接摄像头 (端口: 81)...</span>
                  </div>
                </div>
              </div>
          )}
        </div>
    );


  }

  // 3. Analyzing View
  if (view === VIEW.ANALYZING) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <AnalyzingView />
      </Suspense>
    );
  }

  // 4. Summary View
  if (view === VIEW.SUMMARY && analysisResult) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <SummaryView
          analysisResult={analysisResult}
          path={currentPath}
          fixedStats={fixedTrackingStatsRef.current!}
          activeTab={activeTab}
          onNavigate={setView}
          onTabChange={handleTabChange}
          onSaveTrip={() => saveCurrentTrip()}
          tabBar={shouldShowTabs && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
        />
      </Suspense>
    );
  }
  if (view === VIEW.REPLAY) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <ReplayView path={currentPath} onBack={() => setView(VIEW.SUMMARY)} />
      </Suspense>
    );
  }
// ================== Vlog 主视图（直接进入 AI 模板） ==================
if (view === VIEW.VLOG && analysisResult) {
  // 使用当前实际路径（如果存在）或最后保存的行程路径
  const displayPath = currentPath.length > 0 ? currentPath : (savedTrips.length > 0 ? savedTrips[savedTrips.length - 1].path : MOCK_PATH);
  const tripName = analysisResult?.name || (savedTrips.length > 0 ? savedTrips[savedTrips.length - 1].name : '默认行程');
  return (
    <Suspense fallback={<ViewFallback />}>
      {vlogSubView === 'highlight'
        ? <HighlightView path={displayPath} tripName={tripName} setVlogSubView={setVlogSubView} />
        : <AITemplateView setVlogSubView={setVlogSubView} onBack={() => setView(VIEW.SUMMARY)} />}
    </Suspense>
  );
}

  // 7. Safety Analysis View
  if (view === VIEW.SAFETY) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <SafetyView
          savedTrips={savedTrips}
          mapPopup={mapPopup}
          onOpenPopup={setMapPopup}
          onClosePopup={() => setMapPopup(null)}
          onNavigate={setView}
          tabBar={<TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
        />
      </Suspense>
    );
  }
  // 8. Profile View
  if (view === VIEW.PROFILE) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-900 text-white relative">
        <header className="pt-16 px-6 pb-6 bg-slate-900 border-b border-slate-800">
          <h1 className="text-3xl font-bold">我的</h1>
        </header>
        <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-24">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600 overflow-hidden">
              <LazyLottie src={emojiWinkAnimation} style={{ width: '100%', height: '100%' }} loop={true} autoplay={true} renderer="svg" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Trail Explorer</h2>
              <p className="text-sm text-slate-400">Lv.5 徒步者</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">荣誉墙</p>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-yellow-300 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-bold text-yellow-900">第{i}名</span>
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                <Plus size={20} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center py-6">
              <p className="text-2xl font-bold text-emerald-400">124</p>
              <p className="text-xs text-slate-400 uppercase mt-1">总行程</p>
            </Card>
            <Card className="text-center py-6">
              <p className="text-2xl font-bold text-blue-400">856</p>
              <p className="text-xs text-slate-400 uppercase mt-1">累计里程 (KM)</p>
            </Card>
          </div>
          <div className="space-y-2">
            <button className="w-full p-4 bg-slate-800 rounded-xl flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <span className="text-xs">✉</span>
                </div>
                <span>微信分享</span>
              </div>
              <ChevronLeft className="rotate-180 text-slate-500" />
            </button>
            <button className="w-full p-4 bg-slate-800 rounded-xl flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <span className="text-xs">Q</span>
                </div>
                <span>QQ分享</span>
              </div>
              <ChevronLeft className="rotate-180 text-slate-500" />
            </button>
            <button className="w-full p-4 bg-slate-800 rounded-xl flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-emerald-400" />
                <span>成长记录</span>
              </div>
              <ChevronLeft className="rotate-180 text-slate-500" />
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">我的设备</p>
            <div className="p-4 bg-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Watch size={24} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">运动手表（设备1）</p>
                  <p className="text-xs text-emerald-400">蓝牙在线</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30 transition-colors">连接</button>
                <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors">断开</button>
              </div>
            </div>
            <div className="p-4 bg-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Eye size={24} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">运动眼镜</p>
                  <p className="text-xs text-emerald-400">蓝牙在线</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30 transition-colors">连接</button>
                <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors">断开</button>
              </div>
            </div>
            <button className="w-full p-4 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
              <Plus size={20} />
              <span>发现新设备</span>
            </button>
          </div>
          <div className="space-y-2">
            <button className="w-full p-4 bg-slate-800 rounded-xl flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3"><Settings size={20} /><span>设置</span></div>
              <ChevronLeft className="rotate-180 text-slate-500" />
            </button>
            <button onClick={() => { setIsAuthenticated(false); setAuthUsername(''); setAuthPassword(''); setAuthConfirm(''); setAuthPhone(''); setAuthCode(''); setSendCodeCountdown(0); setView(VIEW.HOME); setActiveTab('home'); }} className="w-full p-4 bg-slate-800 rounded-xl flex items-center justify-between text-red-400 hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3"><LogOut size={20} /><span>退出登录</span></div>
            </button>
          </div>
        </div>
        {shouldShowTabs && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
      </div>
    );
  }

// 历史记录列表视图（写死三条记录）
if (view === VIEW.HISTORY_LIST) {
  // 真实规划路径：北京交通大学 -> 西山森林公园（模拟一组经纬度点，实际应与回放路径一致）
  // 这里使用与回放页面相同的路径点（来自之前规划的路线）
  const beijingJiaotongToXishanPath: TrackPoint[] = [
    {
      lat: 39.951, lng: 116.340, elevation: 50, timestamp: Date.now() - 7200000,
      id: ''
    }, // 北京交通大学
    {
      lat: 39.955, lng: 116.330, elevation: 60, timestamp: Date.now() - 7100000,
      id: ''
    },
    {
      lat: 39.960, lng: 116.320, elevation: 80, timestamp: Date.now() - 7000000,
      id: ''
    },
    {
      lat: 39.965, lng: 116.310, elevation: 100, timestamp: Date.now() - 6900000,
      id: ''
    },
    {
      lat: 39.970, lng: 116.300, elevation: 120, timestamp: Date.now() - 6800000,
      id: ''
    },
    {
      lat: 39.975, lng: 116.290, elevation: 150, timestamp: Date.now() - 6700000,
      id: ''
    },
    {
      lat: 39.978, lng: 116.270, elevation: 180, timestamp: Date.now() - 6600000,
      id: ''
    },
    {
      lat: 39.980, lng: 116.250, elevation: 210, timestamp: Date.now() - 6500000,
      id: ''
    },
    {
      lat: 39.982, lng: 116.230, elevation: 240, timestamp: Date.now() - 6400000,
      id: ''
    },
    {
      lat: 39.983, lng: 116.210, elevation: 260, timestamp: Date.now() - 6300000,
      id: ''
    },
    {
      lat: 39.983, lng: 116.190, elevation: 280, timestamp: Date.now() - 6200000,
      id: ''
    },
    {
      lat: 39.983, lng: 116.187, elevation: 300, timestamp: Date.now() - 6100000,
      id: ''
    }, // 西山森林公园
  ];

  const historyRecords = [
  {
    id: '1',
    name: '西山森林公园徒步',
    date: '2024年3月15日',
    distance: '15.2 km',      // 写死
    duration: '3小时20分',    // 写死
    safetyRating: 'S' as const,
    coverImage: asset('img/xishan.jpg'),
  },
  {
    id: '2',
    name: '香山红叶之旅',
    date: '2024年3月10日',
    distance: '8.5 km',
    duration: '2小时10分',
    safetyRating: 'A' as const,
    coverImage: asset('img/xiangshan.jpg'),
  },
  {
    id: '3',
    name: '玉渊潭春游',
    date: '2024年3月5日',
    distance: '6.8 km',
    duration: '1小时40分',
    safetyRating: 'B' as const,
    coverImage: asset('img/yuyuan.jpg'),
  },
];

  const getRatingColor = (rating: string) => {
    switch(rating) {
      case 'S': return 'from-yellow-300 to-amber-500';
      case 'A': return 'from-emerald-300 to-emerald-500';
      case 'B': return 'from-blue-300 to-blue-500';
      default: return 'from-gray-300 to-gray-500';
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900">
      {/* 顶部导航栏 */}
      <div className="p-6 pt-12 pb-4 border-b border-slate-800 bg-slate-900 z-10 sticky top-0 flex items-center gap-4">
        <button 
          onClick={() => setView(VIEW.SUMMARY)} 
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-white">历史记录</h2>
      </div>

      {/* 历史记录列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyRecords.map((record) => (
          <button
            key={record.id}
            onClick={() => {
              setSelectedHistoryId(record.id);
              setView(VIEW.HISTORY_DETAIL);
            }}
            className="w-full bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-amber-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="relative h-32 overflow-hidden">
              <img 
                src={record.coverImage} 
                alt={record.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-bold text-white">{record.name}</h3>
                    <p className="text-xs text-slate-300">{record.date}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${getRatingColor(record.safetyRating)} text-white text-xs font-bold shadow-lg`}>
                    安全评级 {record.safetyRating}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <Footprints size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-300">{record.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-300">{record.duration}</span>
                </div>
              </div>
              <ChevronLeft className="rotate-180 text-slate-500" size={16} />
            </div>
          </button>
        ))}
      </div>

      {/* 底部占位 */}
      <div className="h-20" />
      {shouldShowTabs && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}

// 历史记录详情视图
if (view === VIEW.HISTORY_DETAIL && selectedHistoryId) {
  const baseRecords: { [key: string]: any } = {
  '1': {
    name: '西山森林公园徒步',
    date: '2024年3月15日',
    safetyRating: 'S',
    distance: '15.2 km',
    duration: '3小时20分',
    startName: '北京交通大学',
    endName: '西山森林公园',
  },
  '2': {
    name: '香山红叶之旅',
    date: '2024年3月10日',
    safetyRating: 'A',
    distance: '8.5 km',
    duration: '2小时10分',
    startName: '北京交通大学',
    endName: '香山公园',
  },
  '3': {
    name: '玉渊潭春游',
    date: '2024年3月5日',
    safetyRating: 'B',
    distance: '6.8 km',
    duration: '1小时40分',
    startName: '北京交通大学',
    endName: '玉渊潭公园',
  },
};

  const selectedBase = baseRecords[selectedHistoryId];
  if (!selectedBase) {
    setView(VIEW.HISTORY_LIST);
    return null;
  }

  // 统一使用动态规划（所有记录都依赖真实路线）
if (isLoadingRoute) {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-white text-lg">正在查询徒步路线...</p>
      <p className="text-slate-400 text-sm mt-2">{selectedBase.startName} → {selectedBase.endName}</p>
    </div>
  );
}
if (dynamicPathPoints.length === 0) {
  const errorMsg = routeInfoDetail.duration !== '查询中...' ? routeInfoDetail.duration : '请检查网络连接';
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <p className="text-white text-lg">路线查询失败</p>
      <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
      <button onClick={() => setView(VIEW.HISTORY_LIST)} className="mt-4 px-4 py-2 bg-blue-500 rounded-lg">返回</button>
    </div>
  );
}

const pathPoints = dynamicPathPoints;
const distanceDisplay = selectedBase.distance;
const durationDisplay = selectedBase.duration;

  const { name, date, safetyRating } = selectedBase;

  // 计算在路径上均匀分布的5个点
  const getUniformPoints = (points: TrackPoint[], numPoints: number = 5) => {
    if (points.length === 0) return [];
    const totalPoints = points.length;
    const indices: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      const index = Math.floor((i / (numPoints - 1)) * (totalPoints - 1));
      indices.push(Math.min(index, totalPoints - 1));
    }
    return indices.map(idx => points[idx]);
  };

  const uniformPoints = getUniformPoints(pathPoints, 5);

  const pointData: { [key: number]: { image: string; title: string; description: string; time: string; elevation: number } } = {
  0: {
    image: asset('img/bj.jpg'),
    title: '起点 - 北京交通大学',
    description: '从北京交通大学出发，开始愉快的徒步之旅。',
    time: '09:00',
    elevation: 50,
  },
  1: {
    image: asset('img/haidian.jpg'),
    title: '途经点 - 外国语实验学校',
    description: '途经外国语实验学校，校门外绿树成荫，环境清幽。',
    time: '10:30',
    elevation: 120,
  },
  2: {
    image: asset('img/xishanjiao.jpg'),
    title: '西山脚下',
    description: '抵达西山脚下，抬头可见山峦起伏，准备开始登山。',
    time: '11:45',
    elevation: 210,
  },
  3: {
    image: asset('img/xiaojing.jpg'),
    title: '森林小径',
    description: '穿行在茂密的森林中，空气清新。',
    time: '13:00',
    elevation: 270,
  },
  4: {
    image: asset('img/xishan.jpg'),
    title: '终点 - 西山森林公园',
    description: '抵达西山森林公园，完成愉快的徒步。',
    time: '14:20',
    elevation: 320,
  },
};

  // 构建 markers 数据
  const mapMarkers = uniformPoints.map((point, idx) => ({
    lat: point.lat,
    lng: point.lng,
    id: `history-marker-${idx}`,
    title: pointData[idx]?.title || `标记点 ${idx + 1}`,
    description: pointData[idx]?.description,
    image: pointData[idx]?.image,
    onClick: () => {
      setSelectedPoint({ ...point, dataIndex: idx });
      setShowPointModal(true);
    },
  }));

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900">
      {/* 顶部导航栏 */}
      <div className="p-6 pt-12 pb-4 border-b border-slate-800 bg-slate-900 z-10 sticky top-0 flex items-center gap-4">
        <button
          onClick={() => {
            setView(VIEW.HISTORY_LIST);
            // 重置路线相关状态
            setDynamicPathPoints([]);
            setIsLoadingRoute(false);
            setRouteInfoDetail({ distance: '查询中...', duration: '查询中...' });
          }}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <p className="text-xs text-slate-400">{date}</p>
        </div>
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${
          safetyRating === 'S' ? 'from-yellow-300 to-amber-500' :
          safetyRating === 'A' ? 'from-emerald-300 to-emerald-500' :
          'from-blue-300 to-blue-500'
        } text-white text-sm font-bold shadow-lg`}>
          评级 {safetyRating}
        </div>
      </div>

      {/* 地图区域 */}
      <div className="flex-1 relative">
        {pathPoints.length > 0 && (
          <GaodeMap
            path={pathPoints}
            plannedPath={[]}
            autoFit={true}
            showLocation={false}
            showSearch={false}
            showNavigation={false}
            showUserPath={true}
            markers={mapMarkers}
          />
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4">
        <div className="flex justify-around">
          <div className="text-center">
            <Footprints size={20} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">总里程</p>
            <p className="text-white font-bold">{distanceDisplay || '--'}</p>
          </div>
          <div className="text-center">
            <Clock size={20} className="text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">总用时</p>
            <p className="text-white font-bold">{durationDisplay || '--'}</p>
          </div>
          <div className="text-center">
            <MapPin size={20} className="text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">标记点</p>
            <p className="text-white font-bold">5个</p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">点击地图上的标记点查看详情</p>
      </div>

      {/* 弹窗模态框 */}
      {showPointModal && selectedPoint && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPointModal(false)}
        >
          <div
            className="w-[85%] max-w-md bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={pointData[selectedPoint.dataIndex]?.image || 'https://picsum.photos/400/300'}
                alt="标记点照片"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setShowPointModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-2">
                {pointData[selectedPoint.dataIndex]?.title || `标记点 ${selectedPoint.dataIndex + 1}`}
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {pointData[selectedPoint.dataIndex]?.description || '这里记录了徒步过程中的精彩瞬间。'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between text-xs text-slate-500">
  <span>海拔: {pointData[selectedPoint.dataIndex]?.elevation || '--'} m</span>
  <span>时间: {pointData[selectedPoint.dataIndex]?.time || '--:--'}</span>
</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


  return null;
}