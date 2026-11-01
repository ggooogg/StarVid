// 视频资源站（CMS 采集接口）配置与选源工具

// 代理模式：dev 走本地 /proxy/ 中间件，build 走云函数 /e/（见 edge-functions/e）。
// 可用 .env 的 VITE_PROXY_MODE 强制覆盖为 'proxy' 或 'function'。
const PROXY_MODE =
  import.meta.env.VITE_PROXY_MODE || (import.meta.env.DEV ? 'proxy' : 'function')

/** 开发环境代理前缀（vite.config.js 的 proxyMiddleware，需以 / 结尾） */
const DEV_PROXY_URL = import.meta.env.VITE_PROXY_URL || '/proxy/'

/** 生产环境云函数路径（/e/<encodeURIComponent(url)>） */
const FUNC_URL = import.meta.env.VITE_FUNC_URL || '/e/'

/** 腾讯云 CDN 通用代理前缀；配置后资源站请求默认走此代理，为空则回退云函数/本地代理 */
const CDN_PROXY_URL = (import.meta.env.VITE_CDN_PROXY_URL || '').trim()

// 统一出口：腾讯云 CDN > 云函数 /e/（生产）> 本地 /proxy/（开发）。
export function buildProxyUrl(apiUrl) {
  if (CDN_PROXY_URL) {
    const prefix = CDN_PROXY_URL.endsWith('/') ? CDN_PROXY_URL : CDN_PROXY_URL + '/'
    return prefix + encodeURIComponent(apiUrl)
  }
  if (PROXY_MODE === 'function') {
    // 协议占位符编码（https→ht-tps, http→ht-tp），规避平台对明文协议头的拦截
    const transformed = String(apiUrl)
      .replace(/^https:\/\//i, 'ht-tps://')
      .replace(/^http:\/\//i, 'ht-tp://')
    return FUNC_URL + encodeURIComponent(transformed)
  }
  const prefix = DEV_PROXY_URL.endsWith('/') ? DEV_PROXY_URL : DEV_PROXY_URL + '/'
  return prefix + encodeURIComponent(apiUrl)
}

/** 资源站 API 请求 User-Agent（统一从 .env 读取） */
const PROXY_UA =
  import.meta.env.VITE_PROXY_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'

// 可用资源站列表：键为来源标识，值为 { api, name }。
export const API_SITES = {
  0: { api: `https://iqiyizyapi.com/api.php/provide/vod`, name: `爱奇艺` },
  1: { api: `http://caiji.dyttzyapi.com/api.php/provide/vod`, name: `电影天堂` },
  2: { api: `https://cj.lziapi.com/api.php/provide/vod`, name: `量子资源` },
  3: { api: `https://api.maoyanapi.top/api.php/provide/vod`, name: `猫眼资源` },
  4: { api: `https://jszyapi.com/api.php/provide/vod`, name: `极速资源` },
  5: { api: `https://api.zuidapi.com/api.php/provide/vod`, name: `最大资源` },
  6: { api: `https://bfzyapi.com/api.php/provide/vod`, name: `暴风资源` },
  7: { api: `https://ffzy5.tv/api.php/provide/vod`, name: `非凡资源` },
  8: { api: `https://api.xinlangapi.com/xinlangapi.php/provide/vod`, name: `新浪资源` },
  9: { api: `https://subocaiji.com/api.php/provide/vod`, name: `速播资源` },
  10: { api: `https://www.huyaapi.com/api.php/provide/vod`, name: `虎牙资源` },
  11: { api: `https://jyzyapi.com/provide/vod/from/jinyingyun/at/json`, name: `金鹰资源` },
  12: { api: `https://p2100.net/api.php/provide/vod`, name: `飘零资源` },
  13: { api: `https://360zyzz.com/api.php/provide/vod`, name: `360资源` },
  14: { api: `https://www.mdzyapi.com/api.php/provide/vod`, name: `魔都资源` },
  15: { api: `https://jinyingzy.com/api.php/provide/vod`, name: `金鹰点播` },
  16: { api: `https://api.ukuapi88.com/api.php/provide/vod`, name: `U酷影视` },
  17: { api: `https://api.guangsuapi.com/api.php/provide/vod`, name: `光速资源` },
  18: { api: `https://www.hongniuzy2.com/api.php/provide/vod`, name: `红牛资源` },
  19: { api: `https://caiji.moduapi.cc/api.php/provide/vod`, name: `魔都动漫` },
  20: { api: `https://hhzyapi.com/api.php/provide/vod`, name: `豪华资源` },
  21: { api: `https://api.apibdzy.com/api.php/provide/vod`, name: `百度云zy` },
  22: { api: `https://lovedan.net/api.php/provide/vod`, name: `艾旦影视` },
}

// 接口请求配置：search（搜索/分页）、detail（按 ID 详情）。
export const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=', // 关键词搜索路径
    pagePath: '?ac=videolist&wd={query}&pg={page}', // 分页路径模板
    maxPages: 3, // 单个资源站最多抓取的页数
    headers: {
      'User-Agent': PROXY_UA,
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=', // 按 ID 获取详情路径
    headers: {
      'User-Agent': PROXY_UA,
      Accept: 'application/json',
    },
  },
}

export const ALL_SOURCE_KEYS = Object.keys(API_SITES)
export const API_SITE_OPTIONS = ALL_SOURCE_KEYS.map((key) => ({ key, name: API_SITES[key].name }))

const SELECTED_APIS_KEY = 'starvid_selected_apis'

// 读取已选资源站，无效或缺失时回退全部。
export function getSelectedSources() {
  try {
    const stored = JSON.parse(localStorage.getItem(SELECTED_APIS_KEY) || 'null')
    if (Array.isArray(stored) && stored.length) return stored.map(String)
  } catch (e) {
    // 解析失败则回退全部
  }
  return [...ALL_SOURCE_KEYS]
}

// 持久化已选资源站。
export function setSelectedSources(keys) {
  localStorage.setItem(SELECTED_APIS_KEY, JSON.stringify(keys.map(String)))
}
