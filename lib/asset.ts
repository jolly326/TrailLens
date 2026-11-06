/**
 * 静态资源路径前缀。
 * - 开发 / 根路径部署时 BASE_URL 为 `/`
 * - 部署到子路径（如 GitHub Pages 项目页）时通过 `VITE_BASE=/repo/` 构建，BASE_URL 为 `/repo/`
 *
 * 用法：asset('img/1.jpg')、asset(`img/${index}.jpg`)
 */
const BASE_URL = import.meta.env.BASE_URL;

export const asset = (path: string) => `${BASE_URL}${path.replace(/^\/+/, '')}`;
