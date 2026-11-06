# TrailLens

AI 户外轨迹记录应用：实时记录徒步轨迹，分析行程安全，自动生成高光时刻与 Vlog。

**运行形态**：纯客户端单页应用（SPA），没有自建后端。同一套 Web 代码经 Capacitor 封装进 Android WebView，配合原生插件使用高德 Android SDK 地图。

## 功能

- **轨迹记录**：实时定位、里程/配速/海拔统计，按路段类型（爬升、平路、风险、观景、休息）分段
- **安全分析**：风险点回溯、心率与体温模拟、风险提示与 AI 建议
- **行程总结**：接入 Gemini 生成行程名称、安全评级与 Vlog 文案
- **高光与 Vlog**：轨迹高光时刻查看、AI 剪辑模板选择与视频预览
- **历史记录**：行程列表、详情与回放

## 技术栈

React 19 · TypeScript · Vite 6 · Tailwind（CDN）· lottie-react · @google/genai · Capacitor 8（Android）· 高德地图

## 架构与运行形态

```
浏览器 / Android WebView
  └─ React SPA（dist/ 静态产物）
       ├─ App.tsx        视图状态机：view 变量决定渲染哪一屏（无 router）
       ├─ views/*        页面级组件，全部懒加载
       ├─ lib/*          纯逻辑：导航常量、地理计算、模拟数据、动画加载、资源前缀
       └─ 能力层
            ├─ Web 端  → 运行时注入高德 JS API（window.AMap）
            └─ Android → Capacitor 插件 AMapPlugin（TS 契约）→ 原生 Java（AMap SDK）
```

- **导航**：没有 `react-router`，`VIEW` 常量 + `if (view === ...)` 平铺分支就是路由表，跳转即 `setView(...)`。原生 App 没有 URL 概念，状态机比路由更直接。
- **状态**：集中在 `App`（`useState`），通过 props 传给各视图；分享弹窗等局部状态下沉到视图内部。后续可用 `useReducer` + Context 收敛。
- **数据**：没有后端，轨迹/生理指标来自 `constants.ts` 与 `lib/simulation.ts` 的模拟，AI 文案在配置了 `GEMINI_API_KEY` 时由 Gemini 生成，否则用内置默认值。
- **地图**：`GaodeMap.tsx` 是唯一入口，用 `Capacitor.isNativePlatform()` 分流到 Web JS API 或原生插件，因此一个地图能力对应三个文件（组件 / TS 插件契约 / Java 实现）。

## 目录结构

```
├─ App.tsx                # 主应用：视图状态机 + 记录/分析/个人中心等视图
├─ index.tsx              # 入口
├─ index.html / index.css # HTML 模板与全局基础样式
├─ GaodeMap.tsx           # 地图组件（Capacitor 原生 / Web JS API 双实现）
├─ AMapPlugin.ts          # Capacitor 原生地图插件桥接定义
├─ constants.ts           # 模拟数据（轨迹、风险点）
├─ types.ts               # 领域类型（含 AnalysisResult / SavedTrip 等聚合类型）
├─ components/            # 通用 UI、底部导航、按需加载的 Lottie 封装
│  ├─ ui.tsx              # Card / Badge / 骨架屏 / 全局样式
│  ├─ TabNav.tsx          # 底部导航（受控组件）
│  └─ LazyLottie.tsx      # Lottie 播放器与动画数据按需加载
├─ views/                 # 页面级视图（全部懒加载）
│  ├─ HomeView.tsx        # 首页
│  ├─ AnalyzingView.tsx   # 解析中过渡页
│  ├─ SummaryView.tsx     # 行程总结（含分享弹窗）
│  ├─ ReplayView.tsx      # 轨迹回放
│  ├─ SafetyView.tsx      # 安全分析
│  ├─ HighlightView.tsx   # 高光时刻
│  └─ AITemplateView.tsx  # AI 剪辑模板与预览
├─ lib/
│  ├─ navigation.ts       # VIEW 常量 / ViewState / TabKey
│  ├─ preload.ts          # 下一屏 chunk 预热表
│  ├─ asset.ts            # 静态资源前缀（支持子路径部署）
│  ├─ geo.ts              # 距离计算与范围约束
│  ├─ simulation.ts       # 生理指标 / 高光 / 告警模拟
│  └─ animations.ts       # Lottie 动画按需加载器
├─ img/                   # Lottie 动画 JSON（源码引用）
├─ public/img/            # 静态图片 / 视频（原样复制到 dist）
├─ dist/                  # 构建产物（git 忽略，需要时生成）
└─ android/               # Capacitor Android 原生工程（gradle 项目，非产物）
```

## 环境准备

- Node.js ≥ 20（推荐 20 LTS 或 22）
- npm ≥ 10
- 可选：Android Studio（打包 APK 时需要）、JDK 17+

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

`.env.local` 至少填 `VITE_AMAP_KEY`，否则 Web 端地图区域为空白（控制台会有明确 warning）。

## 开发

```bash
npm run dev          # http://localhost:3000，支持热更新
```

- 登录页任意账号 + 任意密码即可进入（没有真实鉴权）
- 手机同局域网调试：服务已监听 `0.0.0.0`，手机访问 `http://<电脑内网IP>:3000`
- 改样式时注意：当前 Tailwind 走 CDN，浏览器需要能访问 `cdn.tailwindcss.com`

## 构建与本地预览

```bash
npm run build        # 产物输出到 dist/，控制台会打印每个 chunk 的 raw / gzip 体积
npm run preview      # http://localhost:4173，用生产产物起本地静态服务
```

`preview` 是验证分包效果的正确方式（dev 模式下每个文件单独请求，看不到真实拆分）：

1. 打开 DevTools → Network，刷新：只应加载 `index`、`vendor-react`、`vendor-icons`、`vendor-capacitor` 4 个 JS
2. 登录进首页：此时才加载 `vendor-lottie` 与 `CharacterWalking`（动画）
3. 结束行程进总结页：加载 `SummaryView-*.js`
4. 点「查看 Vlog」：加载 `AITemplateView-*.js`

## 部署

### 1. 任意静态托管（根路径）

`dist/` 目录即全部产物，上传到 Nginx / OSS / Vercel / Netlify 的站点根目录即可。SPA 没有前端路由，**不需要** rewrite 到 `index.html`。

Nginx 参考：

```nginx
server {
  listen 80;
  root /var/www/trail-lens/dist;
  index index.html;
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  location /assets/ {           # 带 hash 的产物可长期缓存
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
```

### 2. 子路径部署（GitHub Pages 项目页 / `https://host/repo/`）

```bash
VITE_BASE=/trail-lens/ npm run build
```

- PowerShell：`$env:VITE_BASE='/trail-lens/'; npm run build`
- 产物中的 JS/CSS 与代码内引用的图片都会自动带上 `/trail-lens/` 前缀（`lib/asset.ts` 统一处理）
- 把 `dist/` 内容推到 `gh-pages` 分支（或 GitHub Actions 上传 artifact 后部署）

### 3. Android

```bash
npm run cap:sync     # = npm run build + npx cap sync android（把 dist 拷进原生工程）
npm run cap:open     # Android Studio 打开 android/
```

在 Android Studio 里 Run 到真机，或 `Build > Generate Signed Bundle / APK` 出包。

## 产物说明

| 路径 | 是什么 | 是否提交仓库 |
| --- | --- | --- |
| `dist/` | Web 构建产物，**主包在这里**：`dist/assets/js/index-*.js` 是入口 chunk（约 69 KB），其余为按需 chunk | 否（`gitignore`） |
| `dist/assets/js/` | 入口 + vendor + 各页面 chunk | 否 |
| `dist/assets/css/` | 样式产物 | 否 |
| `android/` | Capacitor 生成的 **原生工程源码**（Gradle + Java），不是产物 | 是 |
| `android/app/src/main/assets/public/` | `cap sync` 把 `dist/` 复制到的中转目录 | 否 |
| `android/app/build/outputs/apk/**` | 真正的 Android 产物（`.apk`），由 Gradle 生成 | 否 |

> 结论：**Web 主包 = `dist/assets/js/index-*.js`**；**Android 产物是 APK，不是 `android/` 目录**，`android/` 只是产出 APK 的工程。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（3000） |
| `npm run build` | 生产构建（输出到 `dist/`） |
| `npm run preview` | 本地预览构建产物（4173） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run cap:sync` | 构建并同步到 Android 工程 |
| `npm run cap:open` | 用 Android Studio 打开 `android/` |

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_AMAP_KEY` | Web 端必填 | 高德地图 Web JS API Key，未配置时 Web 地图不加载 |
| `VITE_AMAP_SECURITY_CODE` | 否 | 高德地图 `securityJsCode` |
| `GEMINI_API_KEY` | 否 | Gemini API Key，未配置时行程总结使用内置默认文案 |
| `VITE_BASE` | 否 | 部署基础路径，仅构建时使用，如 `/trail-lens/` |

> 密钥只放在 `.env.local`（已被 `.gitignore` 忽略）。`VITE_*` 变量与 `GEMINI_API_KEY` 都会被打进客户端产物，**不要使用有写入权限或计费额度的高权限 Key**。

## 分包与性能策略

构建产物按「运行时依赖 / 页面视图 / 动画数据」三层拆分，首屏只加载 Home 所需代码：

- **vendor 拆分**：`vite.config.ts` 中 `manualChunks` 将 react、lucide 图标、lottie 播放器、@google/genai、Capacitor 分别拆为独立 chunk，利用浏览器并行加载与长期缓存
- **页面级懒加载**：除记录中/个人中心外的页面都拆到 `views/`，通过 `React.lazy` + `Suspense` 在进入时加载；视图之间用 `onNavigate(view)` 回调通信，`VIEW` 常量集中在 `lib/navigation.ts`，避免视图反向依赖 App
- **下一屏预热**：`lib/preload.ts` 在进入某屏后预取最可能跳转的 chunk（如分析中 → 总结页），点击时零等待
- **局部状态下沉**：分享弹窗/Toast 等只属于单页的状态已移入对应视图
- **动画按需加载**：Lottie JSON 不进入主包，`components/LazyLottie.tsx` 在渲染时动态 `import()` 动画数据与播放器，并做模块级缓存
- **动画体积治理**：对 10 个在用动画做了数值精度（3 位小数）与冗余字段（`nm`/`mn`/`meta`）精简，共 794 KB → 748 KB（-5.8%）
- **大依赖延迟加载**：`@google/genai` 在真正调用 AI 时动态导入
- **资源路径统一**：所有 `/img/...` 引用走 `lib/asset.ts`，构建时自动带上 `BASE_URL`

参考构建结果（gzip 为 level 9 实测）：

| 项目 | 优化前 | 当前 |
| --- | --- | --- |
| 首屏 JS（raw） | 1776（单 chunk） | 276（入口 69.1 + react 189.3 + icons 9.5 + capacitor 8） |
| 首屏 JS（gzip） | — | **84.3 KB** |
| 首屏 CSS | 15.6 | 0.3（gzip 0.22） |
| 按需：页面视图 | — | 33 KB（Summary 10.6 / AITemplate 5.9 / Safety 5.3 / Home 3.4 / Analyzing 3 / Highlight 3 / Replay 2.3） |
| 按需：动画数据 | — | 约 357 KB（`CharacterWalking` 387 单独计，含 24 张内嵌 WebP） |
| 按需：lottie 播放器 | — | 309.8（gzip 79.8） |
| `App.tsx` 行数 | 3487 | 约 2060 |

## 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 地图区域空白，控制台有 `未配置 VITE_AMAP_KEY` | `.env.local` 缺 `VITE_AMAP_KEY`，填好后重启 `npm run dev` |
| 控制台 `FlyDataAuthTask error: INVALID_USER_DOMAIN` | 当前域名不在高德 Key 白名单，不影响本地渲染；上线前在高德控制台加白名单 |
| 子路径部署后图片 404 | 用 `VITE_BASE=/repo/ npm run build` 重新构建；勿手工改 `dist` 内路径 |
| `npm run build` 报 `safe-delete` 失败 | IDE 的文件保护拦截了删除旧 `dist/`，手动删除 `dist/` 后重试 |
| 首页动画很大 | `CharacterWalking.json` 是 24 帧 WebP 序列（387 KB / gzip 232 KB），属当前最大单点资源 |

## 已知事项

- 样式依赖 Tailwind CDN（`index.html`），生产环境建议改为构建期接入 `tailwindcss`（需新增 devDependencies，见下）
- `App.tsx` 仍保留记录中 / 个人中心 / 历史记录三类视图与 40+ 个 `useState`：需先做状态收敛（`useReducer` + Context）再拆分
- `android/app/src/main/AndroidManifest.xml` 里的高德 Android SDK Key 仍是明文，建议改为 Gradle `manifestPlaceholders` 从 `android/local.properties`（已忽略）注入

## License

未指定。如需开源请自行补充 LICENSE。
