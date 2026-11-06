// 演示数据的模拟生成逻辑（生理指标、关键节点、高光时刻、安全告警）
import type {
  SegmentType,
  SafetyLevel,
  KeyNode,
  HighlightMoment,
  SafetyAlert,
  LiveStats,
  TrackPoint
} from '../types';

export function simulateBiometrics(segmentType: SegmentType, currentElevation: number, currentSpeed: number = 5) {
  let baseHR: number;
  let baseTemp: number;

  switch (segmentType) {
    case 'risk':
      baseHR = 140 + Math.random() * 15;
      baseTemp = 36.8 + Math.random() * 0.3;
      break;
    case 'rest':
      baseHR = 70 + Math.random() * 8;
      baseTemp = 36.2 + Math.random() * 0.2;
      break;
    case 'scenic':
      baseHR = 95 + Math.random() * 10;
      baseTemp = 36.5 + Math.random() * 0.2;
      break;
    case 'viewpoint':
      baseHR = 100 + Math.random() * 10;
      baseTemp = 36.6 + Math.random() * 0.2;
      break;
    default:
      baseHR = 105 + Math.random() * 12;
      baseTemp = 36.6 + Math.random() * 0.2;
  }

  const speedFactor = currentSpeed * 2;
  const elevDelta = (currentElevation - 500) / 100;
  const hrElevFactor = elevDelta * 1.5;
  const tempElevFactor = elevDelta * -0.05;
  const hrRandom = (Math.random() - 0.5) * 5;
  const tempRandom = (Math.random() - 0.5) * 0.1;

  const heartRate = Math.round(baseHR + speedFactor + hrElevFactor + hrRandom);
  const bodyTemp = +(baseTemp + tempElevFactor + tempRandom).toFixed(2);

  return { heartRate, bodyTemp };
}

export function createKeyNode(oldType: SegmentType, newType: SegmentType, location: TrackPoint): KeyNode {
  return {
    eventType: 'KEY_NODE',
    id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    lat: location.lat,
    lng: location.lng,
    changeType: { from: oldType, to: newType },
    metadata: {
      segmentName: `路段-${newType}-${Math.floor(Math.random() * 1000)}`,
      description: `由 ${oldType} 变为 ${newType}，请注意路况`,
      avgSpeed: location.speed
    },
    thumbnail: undefined
  };
}

export function createHighlight(location: TrackPoint): HighlightMoment {
  const score = +(0.6 + Math.random() * 0.4).toFixed(2);
  const keyframes = Array.from({ length: 4 }, (_, i) => `https://picsum.photos/seed/${Math.floor(Math.random() * 10000) + i}/200/150`);
  return {
    eventType: 'HIGHLIGHT',
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    lat: location.lat,
    lng: location.lng,
    visualScore: score,
    media: {
      keyframes,
      videoClip: '',
      caption: `捕捉到精彩时刻（评分 ${Math.round(score * 100)}）`
    }
  };
}

export function createSafetyAlert(level: 1 | 2, msg: string, stats: LiveStats, location: TrackPoint): SafetyAlert {
  return {
    eventType: 'SAFETY',
    level: level as SafetyLevel,
    id: `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    lat: location.lat,
    lng: location.lng,
    message: msg,
    biometrics: {
      heartRate: stats.heartRate,
      bodyTemp: stats.bodyTemp,
      elevation: stats.elevation
    }
  };
}
