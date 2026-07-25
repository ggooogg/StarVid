# StarVid

基于 **Vue 3 + Vite + Pinia + Element Plus** 的在线视频聚合播放 Web 应用。
通过代理聚合多个资源站（CMS 采集接口）进行搜索，并接入豆瓣热门/推荐数据，提供流畅的电影、剧集、动漫、综艺播放体验。

## 功能特性

- **多源聚合搜索**：并发搜索已选资源站，实时流式展示结果，自动按（来源+ID）去重。
- **聚合视图**：将同名同年的「单集=电影 / 多集=剧集」条目按来源合并为一组。
- **豆瓣内容**：电影 / 剧集 / 动漫 / 综艺的豆瓣热门与推荐，支持分类、地区、年代、平台、排序等多级筛选，无限滚动加载。
- **播放器**：基于 ArtPlayer + hls.js 播放 m3u8，支持选集、换源。
- **画质与测速优选**：探测各片源分辨率、下载速度与网络延迟，自动优选最佳播放源（可开关）。
- **跳过片头片尾**：可视化设置片头/片尾时间点，播放时自动跳过。
- **播放记忆**：记录每一部的观看进度、集数，支持「继续观看」与进度条展示。
- **收藏夹 / 观看历史**：本地持久化，随时回看。
- **主题切换**：浅色 / 深色主题，跟随系统偏好可切换。
- **图片 / 数据代理**：内置多种豆瓣图片与数据镜像代理，规避防盗链与跨域限制。
- **键盘快捷键**：`←/→` 快退快进、`↑/↓` 音量、`空格` 播放暂停、`F` 全屏、`Alt+←/→` 切集。

## 目录结构

```
StarVid/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js                # 应用入口：注册 Pinia / Router / Element Plus
    ├── App.vue               # 根组件：布局 + 设置抽屉
    ├── style.scss            # 全局样式与 CSS 变量（主题）
    ├── router/
    │   └── index.js         # 路由配置（懒加载）
    ├── layouts/
    │   └── AppLayout.vue     # 整体布局（侧边菜单 + 顶栏 + 底部导航）
    ├── stores/               # Pinia 状态管理
    │   ├── settings.js       # 主题、代理、开关等设置
    │   ├── favorites.js      # 收藏夹
    │   ├── history.js        # 观看历史
    │   ├── ui.js             # 设置抽屉开关
    │   └── doubanSource.js  # 豆瓣代理源列表
    ├── data/
    │   └── apiSites.js      # 资源站配置与选源读写
    ├── lib/                  # 纯逻辑工具库
    │   ├── videoSearch.js    # 搜索 / 详情 / 解析播放地址
    │   ├── videoQuality.js    # 画质探测与测速
    │   ├── douban.js         # 豆瓣热门 / 推荐数据获取
    │   ├── doubanProxies.js # 豆瓣代理选项
    │   ├── imageProxy.js     # 豆瓣图片代理处理
    │   └── playRecords.js    # 播放记录 / 跳过配置持久化
    ├── components/           # 可复用组件
    │   ├── SideMenu.vue / TopBar.vue / ThemeToggle.vue
    │   ├── CapsuleSwitch.vue / MultiLevelFilter.vue
    │   ├── ScrollableRow.vue / VideoCard.vue
    │   ├── EpisodeSelector.vue / DoubanSelector.vue
    │   ├── FavoritesList.vue / HistoryList.vue
    │   └── SettingsDrawer.vue
    └── views/                # 页面视图
        ├── Home.vue           # 首页（热门分区 + 继续观看）
        ├── Search.vue         # 搜索
        ├── Favorites.vue      # 收藏夹
        ├── History.vue        # 观看历史
        ├── Douban.vue        # 豆瓣内容（分类 / 无限滚动）
        ├── Play.vue          # 播放页（核心）
        └── play.scss         # 播放页专用样式
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

## 部署说明

- **部署平台**：本项目部署在 **腾讯云 EdgeOne Pages**（静态站点 + 边缘函数）。
- **资源站 API 请求（始终走代理）**：与 LibreTV、MoonTV 等同类项目一致，搜索/详情等小体积 JSON 请求始终经服务端代理转发（浏览器从不直连资源站域名），避免部分站点无 CORS 头导致的控制台跨域报错：
  - **开发环境**（`npm run dev`）：走本地 `/proxy/` 代理，由 `vite.config.js` 中的 `proxyMiddleware` 中间件在服务端转发。
  - **生产环境**（EdgeOne）：走本项目 e 云函数 `/e/`（源码见 `edge-functions/e`）。浏览器端会把目标地址中的 `https://` 转写为 `ht-tps://`、`http://` 转写为 `ht-tp://` 后再 `encodeURIComponent` 拼到 `/e/` 路径之后（如 `/e/ht-tps%3A%2F%2F...`）；边缘函数收到后再还原为 `https://` / `http://` 并发起请求，从而规避平台对明文协议头的拦截。
  - 切换逻辑由 `src/data/apiSites.js` 的 `buildProxyUrl()` 根据 `import.meta.env.DEV` 自动判断；也可通过 `.env` 的 `VITE_PROXY_MODE`（`proxy` / `function`）强制覆盖，或通过 `VITE_FUNC_URL` 自定义云函数路径。
- **m3u8 播放代理**：m3u8 播放列表经代理获取并改写（嵌套列表与 `#EXT-X-KEY` 密钥体积小，继续走代理）；**ts 等分片改写为原始绝对地址由浏览器直连**，不再经云函数中转，避免视频流量全部经过云函数而触发平台安全预警。
- **边缘函数目录**：EdgeOne Pages 的边缘函数需放在约定的 `edge-functions/`（或项目指定的函数目录）下，且文件路径对应路由。当前函数实现位于 `edge-functions/e/[[default]].js`，对应线上 `/e/*` 路由；部署时请确保该目录随项目一同发布，以保证 `/e/` 路由生效。
- **豆瓣数据**：可通过「设置 → 豆瓣数据镜像」选择不同的代理/镜像源。
- **用户偏好**：主题、收藏、历史、选源等均保存在浏览器 `localStorage`，无需后端即可使用。
