/**
 * 豆瓣代理选项配置（数据与图片各自独立设置）。
 * - 数据代理：localStorage.doubanProxyType / doubanProxyUrl
 * - 图片代理：localStorage.doubanImageProxyType / doubanImageProxyUrl
 * value 与 douban.js / imageProxy.js 中的分支保持一致。
 */

/** CORS 代理 By Zwei（前缀 + 原始 URL 直拼，如 https://ciao-cors.is-an.org/https://xxx） */
export const CORS_PROXY_ZWEI = 'https://ciao-cors.is-an.org/'

/** cors-proxy-zwei 的镜像（zsc5566 部署，用法完全一致） */
export const CORS_PROXY_ZSC = 'https://p.zsc5566.dpdns.org/'

const THANKS_CMLIUSSSS = { text: 'Thanks to @CMLiussss', url: 'https://github.com/cmliu' }
const THANKS_ZWEI = { text: 'Thanks to @Zwei', url: 'https://github.com/bestzwei' }

/** 豆瓣数据代理默认值 */
export const DEFAULT_DOUBAN_DATA_PROXY = 'cmliussss-cdn-tencent'

/** 豆瓣图片代理默认值 */
export const DEFAULT_DOUBAN_IMAGE_PROXY = 'cmliussss-cdn-tencent'

/** 豆瓣数据代理列表（接口请求转发方式） */
export const DOUBAN_DATA_PROXIES = [
  {
    value: 'cmliussss-cdn-tencent',
    label: '腾讯云 CDN（CMLiussss，推荐）',
    desc: '数据走 CMLiussss 腾讯云镜像 m.douban.cmliussss.net，免跨域直连',
    thanks: THANKS_CMLIUSSSS,
  },
  {
    value: 'cmliussss-cdn-ali',
    label: '阿里云 CDN（CMLiussss）',
    desc: '数据走 CMLiussss 阿里云镜像 m.douban.cmliussss.com，免跨域直连',
    thanks: THANKS_CMLIUSSSS,
  },
  {
    value: 'cors-proxy-zwei',
    label: 'CORS 代理 By Zwei',
    desc: '数据经 ciao-cors.is-an.org 转发',
    thanks: THANKS_ZWEI,
  },
  {
    value: 'cors-proxy-zsc',
    label: 'CORS 代理镜像（zsc5566）',
    desc: 'cors-proxy-zwei 的镜像站点，功能一致',
    thanks: THANKS_ZWEI,
  },
  {
    value: 'custom',
    label: '自定义代理',
    desc: '数据走你填写的代理前缀（前缀 + encodeURIComponent(目标地址)）',
  },
]

/** 豆瓣图片代理列表（doubanio 防盗链图片替换方式） */
export const DOUBAN_IMAGE_PROXIES = [
  {
    value: 'cmliussss-cdn-tencent',
    label: '腾讯云 CDN（CMLiussss，推荐）',
    desc: '图片走 CMLiussss 腾讯云镜像，免跨域、各环境通用',
    thanks: THANKS_CMLIUSSSS,
  },
  {
    value: 'cmliussss-cdn-ali',
    label: '阿里云 CDN（CMLiussss）',
    desc: '图片走 CMLiussss 阿里云镜像',
    thanks: THANKS_CMLIUSSSS,
  },
  {
    value: 'custom',
    label: '自定义代理',
    desc: '图片走你填写的代理前缀（前缀 + encodeURIComponent(图片地址)）',
  },
]
