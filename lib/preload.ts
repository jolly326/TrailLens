import { VIEW, type ViewState } from './navigation';

/**
 * 视图 chunk 预热表：进入某屏后，提前拉取最可能跳转的下一屏，
 * 避免用户点击时再等一次 chunk 下载（网络空闲时执行，不阻塞首屏）。
 */
const NEXT_VIEW_LOADERS: Partial<Record<ViewState, Array<() => Promise<unknown>>>> = {
  [VIEW.ANALYZING]: [() => import('../views/SummaryView')],
  [VIEW.SUMMARY]: [
    () => import('../views/ReplayView'),
    () => import('../views/SafetyView'),
    () => import('../views/AITemplateView'),
  ],
  [VIEW.REPLAY]: [() => import('../views/SummaryView')],
  [VIEW.SAFETY]: [() => import('../views/SummaryView')],
  [VIEW.VLOG]: [() => import('../views/HighlightView')],
};

export function preloadNextViews(view: ViewState) {
  const loaders = NEXT_VIEW_LOADERS[view];
  if (!loaders) return;
  for (const load of loaders) {
    void load().catch(() => {
      /* 预热失败不影响正常流程，进入视图时会重新加载 */
    });
  }
}
