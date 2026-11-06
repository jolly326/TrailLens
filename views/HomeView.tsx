import type { ReactNode } from 'react';
import { Map as MapIcon, Play } from 'lucide-react';
import LazyLottie from '../components/LazyLottie';
import { characterWalkingAnimation } from '../lib/animations';
import { asset } from '../lib/asset';

interface HomeViewProps {
  onStartTracking: () => void;
  /** 底部导航（由 App 注入，避免视图依赖导航状态） */
  tabBar?: ReactNode;
}

/** 首页：品牌展示 + 开始记录入口 */
export default function HomeView({ onStartTracking, tabBar }: HomeViewProps) {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-between p-6 pb-24 text-white relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${asset('img/新背景.png')})` }}
    >
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      <header className="mt-10 z-10 text-center">
        <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">TrailLens</h1>
        <p className="text-sm text-red-900 mt-2">AI 驱动的户外行程记录</p>
      </header>
      <div className="z-10 flex flex-col items-center gap-6 mt-60">
        <div className="w-32 h-40 overflow-hidden rounded-full">
          <LazyLottie
            src={characterWalkingAnimation}
            loop={true}
            autoplay={true}
            style={{ width: '150%', height: '150%', margin: '-25%', transform: 'translateZ(0)' }}
          />
        </div>
        <div className="relative group w-72">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl group-hover:opacity-40 transition-opacity duration-500 rounded-2xl"></div>
          <button
            onClick={onStartTracking}
            className="relative w-full py-5 rounded-2xl bg-slate-800/80 border border-emerald-500/40 flex items-center justify-center shadow-xl active:scale-98 transition-all duration-300"
          >
            <div className="text-center flex items-center gap-3">
              <Play size={28} className="text-emerald-400 fill-emerald-400/20" />
              <span className="text-xl font-semibold text-white">开始记录行程</span>
            </div>
          </button>
        </div>
      </div>
      <div className="w-full max-w-md z-10 mb-8">
        <div className="flex flex-col items-center">
          <div className="w-5 h-6 bg-amber-900 rounded-t-sm"></div>
          <div className="w-full bg-amber-800 border-4 border-amber-900 rounded-xl p-2 relative shadow-xl">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1040/800/200')] opacity-30 mix-blend-overlay rounded-lg"></div>
            <div className="flex justify-between items-center">
              <div className="bg-amber-50 text-slate-900 p-4 rounded-md shadow-inner w-[48%]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 90% 100%, 0 95%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-amber-700 flex items-center justify-center">
                    <MapIcon size={24} className="text-amber-100" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-900/70 font-medium">本次运动</p>
                    <p className="text-2xl font-bold text-slate-900">0.00 <span className="text-lg font-normal">km</span></p>
                  </div>
                </div>
              </div>
              <div className="w-[2%]"></div>
              <div className="bg-amber-50 text-slate-900 p-4 rounded-md shadow-inner w-[48%]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 100% 100%, 10% 100%, 0 95%)' }}>
                <div>
                  <p className="text-xs text-amber-900/70 font-medium">累计运动</p>
                  <p className="text-2xl font-bold text-slate-900">128 次 · 456 <span className="text-lg font-normal">km</span></p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-5 h-8 bg-amber-900 rounded-b-sm"></div>
        </div>
      </div>
      {tabBar}
    </div>
  );
}
