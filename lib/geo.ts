// 地理计算与范围约束工具

export interface LatLng {
  lat: number;
  lng: number;
}

// 北京西山区域的粗略包围盒
export const XISHAN_BBOX = {
  minLat: 39.88,
  maxLat: 39.95,
  minLng: 116.07,
  maxLng: 116.15
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function clampToBBox(pt: LatLng): LatLng {
  return {
    lat: clamp(pt.lat, XISHAN_BBOX.minLat, XISHAN_BBOX.maxLat),
    lng: clamp(pt.lng, XISHAN_BBOX.minLng, XISHAN_BBOX.maxLng)
  };
}

/** 两坐标点间的球面距离（单位：米） */
export function haversineDistance(a: LatLng, b: LatLng) {
  const R = 6371e3;
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const Δφ = (b.lat - a.lat) * Math.PI / 180;
  const Δλ = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}
