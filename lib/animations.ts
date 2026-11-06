// 动画资源按需加载：每个 JSON 会被 Vite 拆成独立 chunk，避免打进首屏包
export type AnimationLoader = () => Promise<{ default: unknown }>;

export const walkingAvocadoAnimation: AnimationLoader = () => import('../img/WalkingAvocado.json');
export const characterWalkingAnimation: AnimationLoader = () => import('../img/CharacterWalking.json');
export const liveChatbotAnimation: AnimationLoader = () => import('../img/Livechatbot.json');
export const squirrelRunningAnimation: AnimationLoader = () => import('../img/Squirrelrunning.json');
export const sandyLoadingAnimation: AnimationLoader = () => import('../img/Sandy Loading.json');
export const editAnimation: AnimationLoader = () => import('../img/edit.json');
export const emojiWinkAnimation: AnimationLoader = () => import('../img/EmojiWink.json');
export const cameraAnimation: AnimationLoader = () => import('../img/camera animation-option-1.json');
export const protectedAnimation: AnimationLoader = () => import('../img/Protected.json');
export const videoEditingAnimation: AnimationLoader = () => import('../img/video editings.json');
