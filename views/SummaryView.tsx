import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, Clock } from 'lucide-react';
import GaodeMap from '../GaodeMap';
import LazyLottie from '../components/LazyLottie';
import { Badge, Card } from '../components/ui';
import { cameraAnimation, emojiWinkAnimation, protectedAnimation, sandyLoadingAnimation, videoEditingAnimation } from '../lib/animations';
import { VIEW, type TabKey, type ViewState } from '../lib/navigation';
import type { AnalysisResult, TrackPoint, TrackingStatsSnapshot } from '../types';

const shareIconWeChat = 'https://api.iconify.design/logos:wechat.svg';
const shareIconQQ = 'https://api.iconify.design/logos:tencent-qq.svg';
const shareIconTrail = 'https://api.iconify.design/mdi:map-marker-path.svg';

interface SummaryViewProps {
  analysisResult: AnalysisResult;
  path: TrackPoint[];
  fixedStats: TrackingStatsSnapshot;
  activeTab: TabKey;
  onNavigate: (view: ViewState) => void;
  onTabChange: (tab: TabKey) => void;
  onSaveTrip: () => void;
  tabBar?: ReactNode;
}

/** 行程总结页：评分、统计、分享与下级入口 */
export default function SummaryView({
  analysisResult,
  path,
  fixedStats,
  activeTab,
  onNavigate,
  onTabChange,
  onSaveTrip,
  tabBar
}: SummaryViewProps) {
  // 分享弹窗/提示属于本页局部状态，无需提升到 App
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareToastVisible, setIsShareToastVisible] = useState(false);
  const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (shareToastTimerRef.current) clearTimeout(shareToastTimerRef.current);
  }, []);

  const displayPath = path;
  const endIndex = displayPath.length > 0 ? displayPath.length - 1 : 0;

  const handleShare = () => {
    setIsShareModalOpen(false);
    setIsShareToastVisible(true);
    if (shareToastTimerRef.current) clearTimeout(shareToastTimerRef.current);
    shareToastTimerRef.current = setTimeout(() => setIsShareToastVisible(false), 2400);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-y-auto no-scrollbar relative">
      <div className="h-[45vh] relative shrink-0 p-0">
        <div className="h-full relative overflow-hidden rounded-b-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] z-10">
          <GaodeMap
            path={displayPath}
            plannedPath={[]}
            autoFit
            currentIndex={endIndex}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="flex justify-between items-end">
              <div className="relative">
                <div className="absolute -top-10 -left-6 w-24 h-24 pointer-events-none opacity-60 mix-blend-screen">
                  <LazyLottie src={emojiWinkAnimation} loop={true} style={{ height: 80 }} />
                </div>
                <Badge variant="success" className="mb-2 bg-emerald-500/30 backdrop-blur-md border-emerald-500/40 text-emerald-100 px-3 py-1">行程解析完成</Badge>
                <h1 className="text-3xl font-black text-white mb-1 tracking-tight drop-shadow-lg">{analysisResult.name}</h1>
                <p className="text-slate-300 text-xs font-medium flex items-center gap-2 drop-shadow-md">
                  <Clock size={12} className="text-emerald-400" /> {new Date().toLocaleDateString()} • {fixedStats.durationLabel}
                </p>
              </div>
              <div className="flex flex-col items-center bg-slate-800/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-slate-600/50 shadow-2xl transform hover:scale-110 transition-all duration-300 hover:shadow-emerald-500/20 hover:border-emerald-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">安全评级</span>
                <span className={`text-4xl font-black leading-none bg-clip-text text-transparent ${analysisResult.safetyRating === 'S' ? 'bg-gradient-to-br from-yellow-300 to-amber-500' : 'bg-gradient-to-br from-emerald-300 to-emerald-500'}`}>
                  {analysisResult.safetyRating}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-32 space-y-6 relative z-0 bg-slate-900">
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex flex-col items-center justify-center py-6 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 rounded-2xl">
            <span className="text-3xl font-black text-white">{fixedStats.distanceKm}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">总里程 (KM)</span>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 rounded-2xl">
            <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">7</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">高光时刻</span>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6 bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10 rounded-2xl">
            <span className="text-3xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]">5</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">安全预警</span>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={onSaveTrip} className="flex-1 p-3.5 bg-emerald-600/90 hover:bg-emerald-500 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20">
              保存行程
            </button>
            <button onClick={() => setIsShareModalOpen(true)} className="flex-1 p-3.5 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white font-bold text-sm transition-colors border border-slate-600/50">
              分享行程
            </button>
          </div>
          <button onClick={() => onNavigate(VIEW.REPLAY)} className="w-full p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-slate-800/90 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <LazyLottie src={sandyLoadingAnimation} loop={true} autoplay={true} style={{ width: 32, height: 32 }} />
              </div>
              <div className="text-left">
                <span className="block font-bold text-white text-lg">回放行程</span>
                <span className="text-xs text-slate-400">交互式地图沉浸回放</span>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </button>
          <button onClick={() => onNavigate(VIEW.VLOG)} className="w-full p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-slate-800/90 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <LazyLottie src={cameraAnimation} loop={true} autoplay={true} style={{ width: 32, height: 32 }} />
              </div>
              <div className="text-left">
                <span className="block font-bold text-white text-lg">查看 Vlog</span>
                <span className="text-xs text-slate-400">AI 自动生成高光集锦</span>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </button>
          <button onClick={() => onNavigate(VIEW.SAFETY)} className="w-full p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-slate-800/90 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <LazyLottie src={protectedAnimation} loop={true} autoplay={true} style={{ width: 32, height: 32 }} />
              </div>
              <div className="text-left">
                <span className="block font-bold text-white text-lg">安全分析</span>
                <span className="text-xs text-slate-400">风险点回溯与专家建议</span>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </button>
        </div>

        <button
          onClick={() => onNavigate(VIEW.HISTORY_LIST)}
          className="w-full p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-slate-800/90 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
              <LazyLottie src={videoEditingAnimation} loop={true} autoplay={true} style={{ width: 32, height: 32 }} />
            </div>
            <div className="text-left">
              <span className="block font-bold text-white text-lg">历史记录</span>
              <span className="text-xs text-slate-400">查看过往行程记录</span>
            </div>
          </div>
          <ChevronLeft className="rotate-180 text-slate-600 group-hover:text-amber-400 transition-colors" />
        </button>

        {activeTab !== 'trips' && (
          <button onClick={() => onTabChange('home')} className="w-full py-4 text-slate-500 font-bold text-sm hover:text-white transition-colors mt-2">
            返回首页
          </button>
        )}
      </div>

      {isShareModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-6 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6">分享你的探险</h3>
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="flex flex-col items-center gap-2">
                <button className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center overflow-hidden shadow-lg hover:scale-105 transition-transform" onClick={handleShare}>
                  <img src={shareIconWeChat} alt="微信" className="w-10 h-10" />
                </button>
                <span className="text-xs font-medium text-slate-300">微信</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center overflow-hidden shadow-lg hover:scale-105 transition-transform" onClick={handleShare}>
                  <img src={shareIconQQ} alt="QQ" className="w-10 h-10" />
                </button>
                <span className="text-xs font-medium text-slate-300">QQ</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center overflow-hidden shadow-lg hover:scale-105 transition-transform" onClick={handleShare}>
                  <img src={shareIconTrail} alt="两步路" className="w-10 h-10" />
                </button>
                <span className="text-xs font-medium text-slate-300">两步路</span>
              </div>
            </div>
            <button onClick={() => setIsShareModalOpen(false)} className="w-full py-3.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">取消分享</button>
          </div>
        </div>
      )}

      <div className={`fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-emerald-500/90 backdrop-blur px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-500 ${isShareToastVisible ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 -translate-y-4 scale-95'}`}>
        已生成分享链接 ✌️
      </div>
      {tabBar}
    </div>
  );
}
