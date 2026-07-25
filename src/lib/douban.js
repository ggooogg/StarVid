/**
 * 豆瓣数据获取模块（CMLiussss CDN 镜像 / CORS 代理 / 自定义代理以规避跨域）。
 */

import {
  CORS_PROXY_ZWEI,
  CORS_PROXY_ZSC,
  DEFAULT_DOUBAN_DATA_PROXY,
} from './doubanProxies'

// 豆瓣移动端接口主机与 CMLiussss CDN 镜像（域名替换即可直连，免跨域）
const DOUBAN_HOST = 'https://m.douban.com'
const DOUBAN_CDN_TENCENT = 'https://m.douban.cmliussss.net'
const DOUBAN_CDN_ALI = 'https://m.douban.cmliussss.com'

// 豆瓣接口超时（毫秒），统一从 .env 的 VITE_DOUBAN_TIMEOUT 读取。
const DOUBAN_TIMEOUT = Number(import.meta.env.VITE_DOUBAN_TIMEOUT) || 10000

// 读取豆瓣数据代理配置（类型 + 自定义地址）。
function getProxyConfig() {
  return {
    proxyType: localStorage.getItem('doubanProxyType') || DEFAULT_DOUBAN_DATA_PROXY,
    proxyUrl: localStorage.getItem('doubanProxyUrl') || '',
  }
}

// 按当前配置将目标地址包装为最终请求地址。
// CDN 镜像为域名替换直连；zwei / zsc 为「前缀 + 原始 URL」直拼。
function buildDataProxyUrl(targetUrl) {
  const { proxyType, proxyUrl } = getProxyConfig()
  switch (proxyType) {
    case 'cmliussss-cdn-ali':
      return targetUrl.replace(DOUBAN_HOST, DOUBAN_CDN_ALI)
    case 'cors-proxy-zwei':
      return `${CORS_PROXY_ZWEI}${targetUrl}`
    case 'cors-proxy-zsc':
      return `${CORS_PROXY_ZSC}${targetUrl}`
    case 'custom':
      if (proxyUrl) return `${proxyUrl}${encodeURIComponent(targetUrl)}`
    // 未填写前缀时回退默认腾讯云 CDN
    // eslint-disable-next-line no-fallthrough
    case 'cmliussss-cdn-tencent':
    default:
      return targetUrl.replace(DOUBAN_HOST, DOUBAN_CDN_TENCENT)
  }
}

// 带超时的 fetch：自动按当前代理配置包装目标地址。
async function fetchWithTimeout(targetUrl, headers = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOUBAN_TIMEOUT)

  try {
    const response = await fetch(buildDataProxyUrl(targetUrl), {
      signal: controller.signal,
      headers,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// 获取豆瓣「最近热门」分类数据（首页分类展示）。
async function fetchDoubanCategories(params) {
  const { kind, category, type, pageLimit = 25, pageStart = 0 } = params
  const target = `${DOUBAN_HOST}/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`

  const response = await fetchWithTimeout(target)
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)

  const data = await response.json()
  return {
    code: 200,
    message: '获取成功',
    list: (data.items || []).map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '', // 副标题中提取年份
      type: item.type === 'tv' ? 'tv' : 'movie',
    })),
  }
}

// 对外暴露：获取豆瓣热门分类数据（自动应用代理策略）。
export function getDoubanCategories(params) {
  return fetchDoubanCategories(params)
}

// 获取豆瓣「个性化推荐」数据，支持类型/形式/地区/年份/平台/排序多维筛选。
async function fetchDoubanRecommends(params) {
  const { kind, pageLimit = 25, pageStart = 0 } = params
  let { category, format, region, year, platform, sort, label } = params
  // 「全部」等占位值归一化为空字符串
  if (category === 'all') category = ''
  if (format === 'all') format = ''
  if (label === 'all') label = ''
  if (region === 'all') region = ''
  if (year === 'all') year = ''
  if (platform === 'all') platform = ''
  if (sort === 'T') sort = ''

  const selectedCategories = { 类型: category }
  if (format) selectedCategories['形式'] = format
  if (region) selectedCategories['地区'] = region

  const tags = []
  if (category) tags.push(category)
  if (!category && format) tags.push(format)
  if (label) tags.push(label)
  if (region) tags.push(region)
  if (year) tags.push(year)
  if (platform) tags.push(platform)

  const reqParams = new URLSearchParams()
  reqParams.append('refresh', '0')
  reqParams.append('start', String(pageStart))
  reqParams.append('count', String(pageLimit))
  reqParams.append('selected_categories', JSON.stringify(selectedCategories))
  reqParams.append('uncollect', 'false')
  reqParams.append('score_range', '0,10')
  reqParams.append('tags', tags.join(','))
  if (sort) reqParams.append('sort', sort)

  const target = `${DOUBAN_HOST}/rexxar/api/v2/${kind}/recommend?${reqParams.toString()}`

  const response = await fetchWithTimeout(target)
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)

  const data = await response.json()
  return {
    code: 200,
    message: '获取成功',
    // 仅保留电影/剧集
    list: (data.items || [])
      .filter((item) => item.type === 'movie' || item.type === 'tv')
      .map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.pic?.normal || item.pic?.large || '',
        rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
        year: item.year,
        type: item.type === 'tv' ? 'tv' : 'movie',
      })),
  }
}

// 对外暴露：获取豆瓣个性化推荐数据（自动应用代理策略）。
export function getDoubanRecommends(params) {
  return fetchDoubanRecommends(params)
}
