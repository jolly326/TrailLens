import type { TrackPoint } from './types';

// Simulate a completed path for demo purposes if the user tracks for < 5 seconds
export const MOCK_PATH: TrackPoint[] = Array.from({ length: 50 }, (_, i) => {
    const baseLat = 30.6;
    const baseLng = 104.0;
    // Spiral shape
    const angle = 0.5 * i;
    const radius = 0.002 * i;
    return {
        id: `mock-pt-${i}`,
        lat: baseLat + radius * Math.cos(angle),
        lng: baseLng + radius * Math.sin(angle),
        timestamp: Date.now() - (50 - i) * 1000,
        speed: 4 + Math.random() * 2,
        elevation: 500 + i * 2,
        type: i % 15 === 0 ? 'scenic' : i % 10 === 0 ? 'viewpoint' : 'normal'
    };
});

// Mock risks for the safety page
export const MOCK_RISKS: TrackPoint[] = [
    { ...MOCK_PATH[10], id: 'mock-risk-10', type: 'risk', riskLevel: 2, riskDescription: '急弯且坡度陡峭', riskMedia: ['https://picsum.photos/seed/risk-10/320/200'] },
    { ...MOCK_PATH[35], id: 'mock-risk-35', type: 'risk', riskLevel: 1, riskDescription: '检测到气象突变（强风）', riskMedia: ['https://picsum.photos/seed/risk-35/320/200'] }
];