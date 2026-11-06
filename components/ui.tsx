import type { ReactNode } from 'react';

/** 通用卡片容器 */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

/** 小标签 */
export const Badge = ({
  children,
  className = '',
  variant = 'default'
}: {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'success';
}) => {
  const variants = {
    default: 'bg-slate-700 text-slate-300 border-slate-600',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

/** 懒加载视图的占位骨架屏 */
export const ViewFallback = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
    <span className="text-xs">页面加载中…</span>
  </div>
);

/** 全局滚动条与地图弹窗过渡样式 */
export const GlobalStyles = () => (
  <style>
    {`
      @keyframes dash {
        to { stroke-dashoffset: 0; }
      }
      .map-popup-callout .popup-shell {
        transition: opacity 0.35s ease, transform 0.35s ease;
        opacity: 1;
      }
      .map-popup-callout .popup-fade-out {
        opacity: 0;
        transform: translate(-50%, -120%) scale(0.98);
      }
      .map-popup-callout .popup-fade-in {
        opacity: 1;
      }
    `}
  </style>
);
