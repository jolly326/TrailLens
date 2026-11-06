import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import GaodeMap from '../GaodeMap';
import type { TrackPoint } from '../types';
import { asset } from '../lib/asset';

interface ReplayViewProps {
  path: TrackPoint[];
  onBack: () => void;
}

/** 回放中依次弹出的路况提示（毫秒） */
const TIP_SCHEDULE = [20000, 40000, 60000, 80000];
const TIP_VISIBLE_DURATION = 5000;

const TIP_MESSAGES = [
  '当前路段车辆较多，请注意安全',
  '当前路段有下坡，请减速慢行',
  '当前路段碎石较多，请注意脚下',
  '当前路段有植被遮挡视野，请减速慢行',
];

const TIP_IMAGES = [asset('img/车.jpg'), asset('img/2.jpg'), asset('img/3.jpg'), asset('img/4.jpg')];
const TIP_COLORS = [
  'rgba(255, 69, 58, 0.95)',
  'rgba(255, 140, 0, 0.95)',
  'rgba(88, 188, 91, 0.95)',
  'rgba(52, 120, 246, 0.95)',
];

/** 轨迹回放页：地图沉浸回放 + 定时路况提示 */
export default function ReplayView({ path, onBack }: ReplayViewProps) {
  useEffect(() => {
    const showTimers: number[] = [];
    const hideTimers: number[] = [];

    TIP_SCHEDULE.forEach((delay, index) => {
      showTimers.push(
        window.setTimeout(() => {
          const el = document.getElementById(`tip-${index + 1}`);
          if (!el) return;
          el.style.display = 'flex';
          hideTimers.push(
            window.setTimeout(() => {
              el.style.display = 'none';
            }, TIP_VISIBLE_DURATION)
          );
        }, delay)
      );
    });

    return () => {
      showTimers.forEach((t) => clearTimeout(t));
      hideTimers.forEach((t) => clearTimeout(t));
      TIP_SCHEDULE.forEach((_, index) => {
        const el = document.getElementById(`tip-${index + 1}`);
        if (el) el.style.display = 'none';
      });
    };
  }, []);

  if (!path || path.length < 2) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white text-lg">
        暂无轨迹数据，无法回放
      </div>
    );
  }

  const replayStart = { lat: path[0].lat, lng: path[0].lng };
  const replayEnd = { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 relative">
      <div className="p-6 pt-12 pb-4 border-b border-slate-800 bg-slate-900 z-50 sticky top-0 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold text-white">轨迹回放</h2>
      </div>

      <div className="flex-1 relative">
        <GaodeMap
          path={path}
          startPoint={replayStart}
          destination={replayEnd}
          showNavigation={true}
          showUserPath={true}
          autoFit={true}
          showLocation={false}
          showSearch={false}
          plannedPath={[]}
          playbackSpeed={100}
        />

        {TIP_MESSAGES.map((message, index) => (
          <div
            key={index}
            id={`tip-${index + 1}`}
            style={{
              position: 'fixed',
              top: '120px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: TIP_COLORS[index],
              color: 'white',
              padding: '18px 28px',
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
              alignItems: 'center',
              gap: '14px',
              minWidth: '360px'
            }}
          >
            <img src={TIP_IMAGES[index]} style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
