/**
 * 豆瓣图片代理：按用户配置将 doubanio 防盗链图片替换为可用 CDN / 代理地址。
 * 与数据代理相互独立，使用 doubanImageProxyType / doubanImageProxyUrl 配置。
 */
import { DEFAULT_DOUBAN_IMAGE_PROXY } from './doubanProxies'

// 读取图片代理配置（类型 + 自定义地址）。
function getImageProxyConfig() {
  return {
    proxyType:
      localStorage.getItem('doubanImageProxyType') || DEFAULT_DOUBAN_IMAGE_PROXY,
    proxyUrl: localStorage.getItem('doubanImageProxyUrl') || '',
  }
}

// 将豆瓣图片地址按配置替换为代理/CDN 地址；非豆瓣图片原样返回。
export function processImageUrl(originalUrl) {
  if (!originalUrl) return originalUrl
  // 仅处理豆瓣图片（含镜像域名），其余不变
  if (!originalUrl.includes('doubanio')) {
    return originalUrl
  }

  const { proxyType, proxyUrl } = getImageProxyConfig()
  switch (proxyType) {
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      )
    case 'custom':
      if (proxyUrl) return `${proxyUrl}${encodeURIComponent(originalUrl)}`
    // 未填写前缀时回退默认腾讯云 CDN
    // eslint-disable-next-line no-fallthrough
    case 'cmliussss-cdn-tencent':
    default:
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      )
  }
}
