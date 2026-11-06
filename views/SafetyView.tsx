import type { ReactNode } from 'react';
import { ChevronLeft, Shield, Zap } from 'lucide-react';
import GaodeMap from '../GaodeMap';
import LazyLottie from '../components/LazyLottie';
import { Card } from '../components/ui';
import { liveChatbotAnimation } from '../lib/animations';
import { VIEW, type ViewState } from '../lib/navigation';
import type { MapPopupData, SavedTrip } from '../types';
import { asset } from '../lib/asset';

interface SafetyViewProps {
  savedTrips: SavedTrip[];
  mapPopup: MapPopupData | null;
  onOpenPopup: (data: MapPopupData) => void;
  onClosePopup: () => void;
  onNavigate: (view: ViewState) => void;
  tabBar?: ReactNode;
}

/** 安全分析页：风险点回溯、AI 建议 */
export default function SafetyView({ savedTrips, mapPopup, onOpenPopup, onClosePopup, onNavigate, tabBar }: SafetyViewProps) {
  const latestTrip = savedTrips.length > 0 ? savedTrips[savedTrips.length - 1] : null;
  const primaryPath = latestTrip?.path || [];

  // 精准匹配：将地图点位与下方四宫格的内容/图片一一对应
  const safetyMapMarkers = (latestTrip?.risks || []).map((risk, index) => {
    const warning = index === 0 ? '检测现在上升风险路况'
      : index === 1 ? '当前路段有大量碎石'
        : index === 2 ? '当前存在下坡风险' : '植被遮挡视野';
    return {
      lat: risk.lat,
      lng: risk.lng,
      id: risk.id,
      title: `风险点 ${index + 1}`,
      description: warning,
      image: asset(`img/${index + 1}.jpg`),
      onClick: () => {
        onOpenPopup({
          kind: 'safety',
          origin: 'safety',
          point: risk,
          title: `风险点 ${index + 1}`,
          locationLabel: `风险点 ${index + 1}`,
          timeLabel: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          warning,
          photoUrl: asset(`img/${index + 1}.jpg`),
          level: risk.riskLevel,
          stats: { heartRate: 110, bodyTemp: 36.6, elevation: risk.elevation ?? 0 }
        });
      }
    };
  });

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 relative">
      <div className="p-6 pt-12 pb-4 border-b border-slate-800 bg-slate-900 z-10 sticky top-0 flex items-center gap-4">
        <button onClick={() => onNavigate(VIEW.SUMMARY)} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <ChevronLeft />
        </button>
        <h2 className="text-xl font-bold text-white">安全分析</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28 no-scrollbar">
        {/* 地图：增加打点 */}
        <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-700 relative shadow-lg">
          <GaodeMap path={primaryPath} plannedPath={[]} markers={safetyMapMarkers} autoFit />
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-slate-400 border border-slate-800">
            点击橙色点位查看详情
          </div>
        </div>

        {latestTrip && (
          <Card className="flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="p-3 bg-slate-900 rounded-full"><Shield size={24} className="text-emerald-500" /></div>
            <div>
              <h3 className="text-white font-bold">最新行程安全评级: {latestTrip.safetyRating}</h3>
              <p className="text-slate-400 text-xs">基于近期行程综合分析</p>
            </div>
          </Card>
        )}

        {/* 风险因素识别四宫格 */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">风险因素识别</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <img src={asset('img/1.jpg')} alt="风险点1" className="w-full h-24 object-cover rounded-lg" />
              <p className="text-white text-sm font-medium">风险点1：检测现在上升风险路况</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <img src={asset('img/2.jpg')} alt="风险点2" className="w-full h-24 object-cover rounded-lg" />
              <p className="text-white text-sm font-medium">风险点2：当前路段有大量碎石</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <img src={asset('img/3.jpg')} alt="风险点3" className="w-full h-24 object-cover rounded-lg" />
              <p className="text-white text-sm font-medium">风险点3：当前存在下坡风险</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <img src={asset('img/4.jpg')} alt="风险点4" className="w-full h-24 object-cover rounded-lg" />
              <p className="text-white text-sm font-medium">风险点4：植被遮挡视野</p>
            </div>
          </div>
        </div>

        {/* AI 建议 */}
        <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
          <h4 className="text-blue-300 font-bold text-sm mb-2 flex items-center gap-2"><Zap size={14} /> AI 建议</h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            建议在碎石与湿滑区域保持稳定步幅，避免突然加速或急停。对连续台阶区域可采用“短步小跨”的节奏，减轻踝关节冲击。
          </p>
        </div>

        {/* 户外小智 */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12"><LazyLottie src={liveChatbotAnimation} loop /></div>
          <div className="flex-1">
            <h4 className="text-white text-sm font-bold">户外小智</h4>
            <p className="text-slate-400 text-xs">随时为你解答路线安全问题</p>
          </div>
          <button className="px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg font-bold">咨询</button>
        </div>
      </div>

      {mapPopup && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClosePopup}>
          <div className="w-[85%] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={mapPopup.photoUrl} className="w-full h-40 object-cover" />
            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-2">{mapPopup.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{mapPopup.warning}</p>
              <button onClick={onClosePopup} className="mt-4 w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-bold">我知道了</button>
            </div>
          </div>
        </div>
      )}
      {tabBar}
    </div>
  );
}
