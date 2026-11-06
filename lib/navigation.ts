// 视图状态机常量：所有页面级组件共用同一份定义

export const VIEW = {
  HOME: 'HOME',
  TRACKING: 'TRACKING',
  ANALYZING: 'ANALYZING',
  SUMMARY: 'SUMMARY',
  REPLAY: 'REPLAY',
  VLOG: 'VLOG',
  SAFETY: 'SAFETY',
  PROFILE: 'PROFILE',
  DEVICES: 'DEVICES',
  HISTORY_LIST: 'HISTORY_LIST',     // 历史记录列表
  HISTORY_DETAIL: 'HISTORY_DETAIL', // 历史记录详情
} as const;

export type ViewState = typeof VIEW[keyof typeof VIEW];

/** 底部导航的标签 key */
export type TabKey = 'home' | 'trips' | 'vlog' | 'safety' | 'profile';
