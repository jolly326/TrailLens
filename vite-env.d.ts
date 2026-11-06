declare module "*.mp4" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  /** 构建时注入的资源前缀（部署子路径时使用） */
  readonly BASE_URL: string;
  /** 当前构建模式 */
  readonly MODE: string;
  /** 高德地图 Web JS API Key */
  readonly VITE_AMAP_KEY?: string;
  /** 高德地图安全密钥（securityJsCode） */
  readonly VITE_AMAP_SECURITY_CODE?: string;
  /** 部署基础路径，如 /trail-lens/ */
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
