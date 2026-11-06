import { useEffect, useState } from 'react';
import { ChevronLeft, Footprints } from 'lucide-react';
import GaodeMap from '../GaodeMap';
import { Badge } from '../components/ui';
import { haversineDistance } from '../lib/geo';
import type { TrackPoint } from '../types';
import { asset } from '../lib/asset';

export interface HighlightViewProps {
  path: TrackPoint[];
  tripName: string;
  setVlogSubView: (view: 'highlight' | 'aiTemplate') => void;
}

/** 轨迹高光时刻查看页 */
export default function HighlightView({ path, tripName, setVlogSubView }: HighlightViewProps) {
  const [highlightMarkers, setHighlightMarkers] = useState<TrackPoint[]>([]);

  useEffect(() => {
    if (path.length === 0) return;
    const totalPoints = path.length;
    const markerIndices = [
      Math.floor(totalPoints * 0.1),
      Math.floor(totalPoints * 0.3),
      Math.floor(totalPoints * 0.6),
      Math.floor(totalPoints * 0.9)
    ];
    const newMarkers = markerIndices.map((idx, i) => ({
      ...path[Math.min(idx, totalPoints - 1)],
      type: 'viewpoint' as const,
      highlightIndex: i
    }));
    setHighlightMarkers(newMarkers);
  }, [path]);

  const hikeFrames = [
    asset('img/4268b9874cd10a1f952cf551904a197.png'),
    asset('img/b52e248d01db7b60625e4d7175f8caf.png'),
    asset('img/2152be9a1c13691b1f74c2ca9b6b39f.png'),
    asset('img/7ebada638c8de5966b5895c9958a79a.png')
  ];

  const highlightData = [
    { time: '00:19', title: '达到公园', frameIndex: 0, desc: '轻松抵达公园入口，开始愉快的徒步之旅。' },
    { time: '14:35', title: '回首路途', frameIndex: 1, desc: '回望来路，山峦起伏，不禁感慨万千。' },
    { time: '33:22', title: '眺望美景', frameIndex: 2, desc: '登上高点，俯瞰群山与城市交融的壮丽景色。' },
    { time: '50:09', title: '余辉树林', frameIndex: 3, desc: '夕阳余晖洒落林间，金色光芒温暖而宁静。' }
  ];

  const formatDist = (meters: number) => (meters / 1000).toFixed(2);
  const totalDistance = path.length > 0 ? haversineDistance(path[0], path[path.length - 1]) : 0;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-white">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1/1/1')] opacity-5 mix-blend-overlay pointer-events-none" />
      <div className="p-4 pt-8 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10">
        <button onClick={() => setVlogSubView('aiTemplate')} className="flex items-center gap-2 text-white">
          <ChevronLeft size={20} />
          <span>返回风格选择</span>
        </button>
        <h2 className="text-xl font-bold">高光时刻查看</h2>
        <div className="w-8"></div>
      </div>

      <div className="h-48 w-full rounded-b-2xl overflow-hidden relative">
        <GaodeMap path={path} className="w-full h-full" autoFit={true} />
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm p-2 rounded-lg text-xs text-slate-300 z-10">
          {tripName} • 全程 {formatDist(totalDistance)}km | 耗时 1h45m
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Footprints size={24} className="text-emerald-400" />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-slate-200">轨迹高光时刻</h3>
        <div className="space-y-4">
          {highlightData.map((item, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <img src={hikeFrames[item.frameIndex]} alt={item.title} className="w-full h-48 object-cover" onError={(e) => { const img = e.target as HTMLImageElement; img.src = hikeFrames[0]; }} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="success">{item.time}</Badge>
                  <h4 className="text-lg font-bold text-white">{item.title}</h4>
                </div>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
