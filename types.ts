// 全局变量定义

// 1. 枚举与基础类型定义

// 路段类型：决定了地图上轨迹线的颜色(路径模块)
export type SegmentType = 
  | 'scenic'    // 观光路段 (例如：绿色)
  | 'rest'      // 休息路段 (例如：蓝色)
  | 'viewpoint' // 观景台/风景点 (例如：紫色)
  | 'risk'      // 危险路段 (例如：红色)
  | 'normal';   // 普通路段 (例如：灰色)

// 轨迹点：统一使用 SegmentType 表达路段语义
export interface TrackPoint {
  id: string;        // 唯一标识符 (UUID)
  lat: number;       // 纬度
  lng: number;       // 经度
  timestamp: number; // 时间戳 (毫秒)
  elevation?: number; // 海拔 (米)
  speed?: number;     // 速度 (km/h)
  type?: SegmentType; // 路段类型
  riskDescription?: string; // 风险描述 (可选)
  riskLevel?: SafetyLevel; // 风险等级 (1=黄色提示, 2=红色危险)
  riskMedia?: string[]; // 风险关键帧 (可选)
}

// 安全等级：决定了警报的紧急程度和UI颜色(安全模块)
export type SafetyLevel = 
  | 1  // 警告 (Warning) - 黄色，提醒用户注意
  | 2; // 危险 (Critical) - 红色，伴随强烈的视觉/听觉提示

// 2. 核心事件结构 (三个并列的节点类型)

// 基础事件接口：所有地图节点共有的属性
interface BaseEvent {
  id: string;        // 唯一标识符 (UUID)，用于 React 渲染列表的 key
  lat: number;       // 纬度 (Latitude)，用于地图定位
  lng: number;       // 经度 (Longitude)，用于地图定位
  timestamp: number; // 时间戳 (毫秒)，用于排序和回放定位
}

/** 
 * 类型一：关键节点 (KeyNode)
 * 触发机制：当路段状态发生改变时触发 (逻辑确定性)
 * 场景：从“观光”走进“危险”路段的交界处
 */
export interface KeyNode extends BaseEvent {
  eventType: 'KEY_NODE'; // 事件类型标识，用于 UI 判断渲染哪种图标
  
  /** 状态变更详情 */
  changeType: {
    from: SegmentType; // 变更前的路段类型
    to: SegmentType;   // 变更后的路段类型
  };

  /** 节点的元数据描述 */
  metadata: {
    segmentName: string; // 路段名称 (例如："西山北坡-碎石区")
    description: string; // 文字描述 (例如："进入陡峭路段，请注意防滑")
    avgSpeed?: number;   // (可选) 上一路段的平均速度，单位 km/h
  };
  
  /** 缩略图 (可选) */
  thumbnail?: string;    // 该路段起点的环境缩略图 URL
}

/** 
 * 类型二：高光时刻 (HighlightMoment)
 * 触发机制：由随机概率算法触发 (逻辑随机性)
 * 场景：系统判定当前风景极好，自动抓拍
 */
export interface HighlightMoment extends BaseEvent {
  eventType: 'HIGHLIGHT'; // 事件类型标识
  
  /** 视觉评分 (0.0 - 1.0) */
  visualScore: number;    // 分数越高，UI展示时星星越多或光圈越大
  
  /** 媒体资源包 */
  media: {
    keyframes: string[];  // 关键帧图片 URL 数组 (用于侧边栏九宫格展示)
    videoClip: string;    // 短视频 URL (用于弹窗播放)
    caption: string;      // AI 生成的短标题 (例如："绝美的日落瞬间")
  };
}

/** 
 * 类型三：安全提示点 (SafetyAlert)
 * 触发机制：当生理数据或环境数据超过阈值时触发 (监控逻辑)
 * 场景：心率飙升或体温过高
 */
export interface SafetyAlert extends BaseEvent {
  eventType: 'SAFETY'; // 事件类型标识
  
  /** 安全等级 */
  level: SafetyLevel;  // 1=普通警告, 2=严重危险
  
  /** 警报描述信息 */
  message: string;     // (例如："检测到心率持续过高，建议立即休息")
  
  /** 触发时的生物/环境数据快照 */
  biometrics: {
    elevation: number; // 当时海拔 (米)
    bodyTemp: number;  // 当时体温 (摄氏度)
    heartRate: number; // 当时心率 (次/分)
  };
}

/** 统一事件类型：用于侧边栏列表渲染，包含了以上三种情况 */
export type TripEvent = KeyNode | HighlightMoment | SafetyAlert;

// ==========================================
// 3. 实时状态与路径配置
// ==========================================

/** 实时状态数据 (HUD 仪表盘用) */
export interface LiveStats {
  currentSegment: SegmentType; // 当前所处的路段类型
  heartRate: number;           // 实时心率 (bpm)
  bodyTemp: number;            // 实时体温 (°C)
  elevation: number;           // 实时海拔 (m)
  isDeviating: boolean;        // 是否偏离了推荐路线 (true=偏离，需弹窗)
}

// ==========================================
// 4. 业务聚合类型（跨组件复用）
// ==========================================

/** 安全评级 */
export type SafetyRating = 'S' | 'A' | 'B' | 'C' | 'D';

/** AI 行程分析结果 */
export interface AnalysisResult {
  name: string;
  safetyRating: SafetyRating;
  summary: string;
  vlogCaption: string;
  highlights: TrackPoint[];
  risks: TrackPoint[];
}

/** 已保存的行程快照 */
export interface SavedTrip {
  id: number;
  name: string;
  path: TrackPoint[];
  risks: TrackPoint[];
  safetyRating: SafetyRating;
  createdAt: number;
}

/** 结束行程后冻结的统计快照 */
export interface TrackingStatsSnapshot {
  durationLabel: string;
  distanceKm: string;
  speedKmh: string;
  heartRate: number;
  bodyTemp: number;
  elevation: number;
}

/** 地图点位弹窗数据 */
export interface MapPopupData {
  kind: 'highlight' | 'safety';
  origin: 'tracking' | 'summary' | 'safety';
  point: TrackPoint;
  title: string;
  description?: string;
  locationLabel: string;
  timeLabel: string;
  stats?: { heartRate: number; bodyTemp: number; elevation: number };
  warning?: string;
  photoUrl?: string;
  level?: SafetyLevel;
}

/** 推荐路线选项 (开始前的选择弹窗用) */
export interface RouteOption {
  id: 'easy' | 'hard';         // 路线ID
  name: string;                // 路线名称 (例如："休闲观光线")
  difficulty: string;          // 难度描述 (例如："简单 - 适合新手")
  path: [number, number][];    // 预设的经纬度数组，用于地图画半透明参考线
  color: string;               // 路线代表色 (例如："#10b981")
}
