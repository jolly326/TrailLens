import { useEffect, useState, type CSSProperties, type ComponentType } from 'react';
import type { AnimationLoader } from '../lib/animations';

interface LazyLottieProps {
  /** 稳定的动画加载函数（定义在模块作用域，避免重复请求） */
  src: AnimationLoader;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
  className?: string;
  renderer?: 'svg' | 'canvas' | 'html';
}

interface LottieLikeProps {
  animationData: unknown;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
  className?: string;
  renderer?: 'svg' | 'canvas' | 'html';
}

type LottieComponent = ComponentType<LottieLikeProps>;

const animationCache = new WeakMap<AnimationLoader, unknown>();
let lottieComponentPromise: Promise<LottieComponent> | null = null;

/** lottie 播放器本身也按需加载，进一步压缩首屏体积 */
function loadLottieComponent() {
  if (!lottieComponentPromise) {
    lottieComponentPromise = import('lottie-react').then((mod) => mod.default as unknown as LottieComponent);
  }
  return lottieComponentPromise;
}

/**
 * 按需加载 Lottie 动画。
 * 动画 JSON 通过 dynamic import 拆分为独立 chunk，首屏不再解析全部动画数据。
 */
export default function LazyLottie({ src, loop = true, autoplay = true, style, className, renderer }: LazyLottieProps) {
  const [data, setData] = useState<unknown>(() => animationCache.get(src));
  const [LottieComponent, setLottieComponent] = useState<LottieComponent | null>(null);

  useEffect(() => {
    let active = true;

    const animationPromise: Promise<{ default: unknown }> = animationCache.has(src)
      ? Promise.resolve({ default: animationCache.get(src) })
      : src();

    Promise.all([loadLottieComponent(), animationPromise])
      .then(([component, animation]) => {
        animationCache.set(src, animation.default);
        if (!active) return;
        setLottieComponent(() => component);
        setData(animation.default);
      })
      .catch((err) => console.error('Lottie 动画加载失败:', err));

    return () => {
      active = false;
    };
  }, [src]);

  if (!LottieComponent || !data) {
    // 占位元素保持原有布局尺寸，避免加载完成时抖动
    return <div className={className} style={style} aria-hidden="true" />;
  }

  return (
    <LottieComponent
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      style={style}
      className={className}
      renderer={renderer}
    />
  );
}
