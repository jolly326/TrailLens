import type { TabKey } from '../lib/navigation';

interface TabNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const itemClass = (active: boolean, color: string) =>
  `flex-1 flex flex-col items-center gap-1 ${active ? color : 'text-slate-600'} transition-all duration-300 hover:scale-125 hover:brightness-110`;

/** 底部导航栏（纯展示组件，状态由调用方提供） */
export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 pb-safe flex items-center justify-around">
      <button
        onClick={() => onTabChange('home')}
        className={itemClass(activeTab === 'home', 'text-emerald-600')}
        style={{ filter: activeTab === 'home' ? 'drop-shadow(0 0 6px rgba(16,185,129,0.8))' : 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(16,185,129,0.7))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = activeTab === 'home' ? 'drop-shadow(0 0 6px rgba(16,185,129,0.8))' : 'none'; }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute top-0 left-1 w-4 h-3 bg-emerald-500 rounded-t-sm"></div>
          <div className="absolute top-3 left-0 w-6 h-3 bg-emerald-400 rounded-b-sm"></div>
          <div className="absolute bottom-1 left-2 w-2 h-2 bg-yellow-400 rounded-sm"></div>
          <div className="absolute top-4 left-0 w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
          <div className="absolute top-4 right-0 w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
        </div>
        <span className="text-[10px] font-medium">首页</span>
      </button>

      <button
        onClick={() => onTabChange('trips')}
        className={itemClass(activeTab === 'trips', 'text-orange-500')}
        style={{ filter: activeTab === 'trips' ? 'drop-shadow(0 0 6px rgba(234,88,12,0.8))' : 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(234,88,12,0.7))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = activeTab === 'trips' ? 'drop-shadow(0 0 6px rgba(234,88,12,0.8))' : 'none'; }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute top-1 left-0 w-2 h-3 bg-orange-400 rounded-full rotate-12"></div>
          <div className="absolute top-1 right-0 w-2 h-3 bg-orange-400 rounded-full -rotate-12"></div>
          <div className="absolute top-0 left-0.5 w-1 h-1 bg-yellow-200 rounded-full"></div>
          <div className="absolute top-0 right-0.5 w-1 h-1 bg-yellow-200 rounded-full"></div>
          <div className="absolute bottom-0 left-0.5 w-1 h-1 bg-yellow-200 rounded-full"></div>
          <div className="absolute bottom-0 right-0.5 w-1 h-1 bg-yellow-200 rounded-full"></div>
        </div>
        <span className="text-[10px] font-medium">足迹</span>
      </button>

      <button
        onClick={() => onTabChange('vlog')}
        className={itemClass(activeTab === 'vlog', 'text-blue-500')}
        style={{ filter: activeTab === 'vlog' ? 'drop-shadow(0 0 6px rgba(59,130,246,0.8))' : 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(59,130,246,0.7))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = activeTab === 'vlog' ? 'drop-shadow(0 0 6px rgba(59,130,246,0.8))' : 'none'; }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute top-1 left-0 w-4 h-3 bg-blue-400 rounded-sm"></div>
          <div className="absolute top-1 right-0 w-2 h-2 bg-blue-300 rounded-tr-sm rounded-br-sm"></div>
          <div className="absolute top-1.5 right-0.5 w-1 h-1 bg-red-500 rounded-full"></div>
          <div className="absolute bottom-1 left-1 w-2 h-1 bg-blue-500 rounded-sm"></div>
        </div>
        <span className="text-[10px] font-medium">Vlog</span>
      </button>

      <button
        onClick={() => onTabChange('safety')}
        className={itemClass(activeTab === 'safety', 'text-purple-500')}
        style={{ filter: activeTab === 'safety' ? 'drop-shadow(0 0 6px rgba(139,92,246,0.8))' : 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(139,92,246,0.7))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = activeTab === 'safety' ? 'drop-shadow(0 0 6px rgba(139,92,246,0.8))' : 'none'; }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute top-0 left-1 w-4 h-4 bg-purple-400 rounded-t-full"></div>
          <div className="absolute top-3 left-0 w-6 h-3 bg-purple-400 rounded-b-lg"></div>
          <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-300 rounded-full"></div>
        </div>
        <span className="text-[10px] font-medium">守护</span>
      </button>

      <button
        onClick={() => onTabChange('profile')}
        className={itemClass(activeTab === 'profile', 'text-amber-500')}
        style={{ filter: activeTab === 'profile' ? 'drop-shadow(0 0 6px rgba(217,119,6,0.8))' : 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(217,119,6,0.7))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = activeTab === 'profile' ? 'drop-shadow(0 0 6px rgba(217,119,6,0.8))' : 'none'; }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute top-0 left-1.5 w-3 h-3 bg-amber-300 rounded-full"></div>
          <div className="absolute top-3 left-0.5 w-5 h-3 bg-amber-600 rounded-t-lg"></div>
          <div className="absolute top-5 left-1 w-1 h-1.5 bg-amber-600 rounded-b-sm"></div>
          <div className="absolute top-5 right-1 w-1 h-1.5 bg-amber-600 rounded-b-sm"></div>
        </div>
        <span className="text-[10px] font-medium">我的</span>
      </button>
    </div>
  );
}
