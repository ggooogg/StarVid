/**
 * 视频搜索与详情获取模块（经代理请求各资源站，聚合去重后返回统一结构）。
 */
import { buildProxyUrl, API_SITES, API_CONFIG } from '../data/apiSites'

// 资源站 API 超时（毫秒），统一从 .env 的 VITE_API_TIMEOUT 读取。
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000

// 发起请求并解析 JSON，支持超时与外部中断信号（用于取消搜索）。
async function fetchJson(url, headers, timeout, externalSignal = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const onExternalAbort = () => controller.abort()
  // 关联外部中断信号，支持外部主动取消请求
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort)
    }
  }
  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch (e) {
    return null
  } finally {
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
    clearTimeout(timeoutId)
  }
}

// 经代理 / 云函数获取资源站接口数据（始终服务端转发，规避跨域；返回小体积 JSON）。
async function fetchViaProxy(apiUrl, headers, timeout = API_TIMEOUT, externalSignal = null) {
  return fetchJson(buildProxyUrl(apiUrl), headers, timeout, externalSignal)
}

// 解析播放地址：源以 `$$$` 分隔，集以 `#` 分隔，标题与地址以 `$` 分隔；优先 m3u8 源。
function parsePlayUrl(playUrl) {
  if (!playUrl || typeof playUrl !== 'string') return { urls: [], titles: [] }
  const groups = playUrl.split('$$$')
  let best = groups[0] || ''
  for (const g of groups) {
    if (g.includes('.m3u8')) {
      best = g
      break
    }
  }
  const urls = []
  const titles = []
  best.split('#').forEach((seg) => {
    if (!seg) return
    const parts = seg.split('$')
    const name = parts.length > 1 ? parts[0] : ''
    const url = parts.length > 1 ? parts[1] : parts[0]
    if (url && /^https?:\/\//i.test(url.trim())) {
      titles.push((name || `第${urls.length + 1}集`).trim())
      urls.push(url.trim())
    }
  })
  return { urls, titles }
}

// 清洗 HTML：去标签、解码常见实体、合并空白。
function cleanHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/<[^>]+>/g, '\n') // 标签换换行
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n+/g, '\n') // 合并换行
    .replace(/[ \t]+/g, ' ') // 合并空格
    .replace(/^\n+|\n+$/g, '')
    .trim()
}

// 将资源站单条数据标准化为项目内部统一结构。
function normalizeItem(item, sourceKey) {
  const { urls, titles } = parsePlayUrl(item.vod_play_url)
  return {
    id: String(item.vod_id),
    title: item.vod_name || '',
    poster: item.vod_pic || '',
    year: item.vod_year ? String(item.vod_year) : '',
    type_name: item.type_name || '',
    remarks: item.vod_remarks || '',
    class: item.vod_class || '',
    desc: cleanHtml(item.vod_content || ''),
    douban_id: item.vod_douban_id ? Number(item.vod_douban_id) : 0,
    source: String(sourceKey),
    source_name: API_SITES[sourceKey]?.name || '',
    episodes: urls.length,
    episodes_urls: urls,
    episodes_titles: titles,
  }
}

// 在指定资源站按关键词搜索，自动翻页（受 maxPages 限制）。
export async function searchByAPIAndKeyWord(sourceKey, query, signal = null) {
  const site = API_SITES[sourceKey]
  if (!site) return []
  const apiBaseUrl = site.api
  const headers = API_CONFIG.search.headers

  const firstUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query)
  const data = await fetchViaProxy(firstUrl, headers, API_TIMEOUT, signal)
  if (!data || !Array.isArray(data.list) || data.list.length === 0) return []

  const results = data.list.map((item) => normalizeItem(item, sourceKey))

  const pageCount = data.pagecount || 1
  const pagesToFetch = Math.min(pageCount - 1, API_CONFIG.search.maxPages - 1)
  if (pagesToFetch > 0) {
    const promises = []
    for (let page = 2; page <= pagesToFetch + 1; page++) {
      const pageUrl =
        apiBaseUrl +
        API_CONFIG.search.pagePath
          .replace('{query}', encodeURIComponent(query))
          .replace('{page}', page)
      promises.push(
        fetchViaProxy(pageUrl, headers, API_TIMEOUT, signal).then((pageData) => {
          if (!pageData || !Array.isArray(pageData.list)) return []
          return pageData.list.map((item) => normalizeItem(item, sourceKey))
        })
      )
    }
    const additional = await Promise.all(promises)
    additional.forEach((arr) => arr.length && results.push(...arr))
  }

  return results
}

// 并发搜索多个资源站并去重（按「来源_ID」）。
export async function aggregatedSearch(query, sourceKeys, signal = null) {
  const keys = (sourceKeys && sourceKeys.length ? sourceKeys : Object.keys(API_SITES)).filter(
    (k) => API_SITES[k]
  )
  if (keys.length === 0) return []

  const resultsArray = await Promise.all(
    keys.map((key) => searchByAPIAndKeyWord(key, query, signal))
  )

  let all = []
  resultsArray.forEach((arr) => {
    if (Array.isArray(arr) && arr.length) all = all.concat(arr)
  })

  const seen = new Set()
  const unique = []
  all.forEach((item) => {
    const key = `${item.source}_${item.id}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  })

  return unique
}

// 获取单部影片详情。
export async function getVideoDetail(sourceKey, id, signal = null) {
  const site = API_SITES[sourceKey]
  if (!site) return null
  const url = site.api + API_CONFIG.detail.path + encodeURIComponent(id)
  const data = await fetchViaProxy(url, API_CONFIG.detail.headers, API_TIMEOUT, signal)
  if (!data || !Array.isArray(data.list) || data.list.length === 0) return null
  return normalizeItem(data.list[0], sourceKey)
}
