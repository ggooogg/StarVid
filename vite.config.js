import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发环境专用代理中间件（仅 dev / preview 生效，不进入生产产物）。
// 拦截 /proxy/<encodeURIComponent(targetUrl)>，在服务端转发以规避浏览器跨域限制；
// 生产环境统一走 edge-functions/e 云函数（/e/ 路由，即复刻 mtv 的全局代理）。

// m3u8 改写：相对/绝对 URI 先解析到原始域名。
// 与 edge-functions/e 行为保持一致：嵌套播放列表（.m3u8）与 #EXT-X-KEY 密钥继续经 /proxy/ 转发，
// ts / fMP4 等分片改写为原始绝对地址由浏览器直连，减轻代理流量。
function rewriteM3u8(content, baseUrl, proxy) {
  const resolve = (uri) => {
    try {
      return new URL(uri, baseUrl).href
    } catch {
      return uri
    }
  }
  // 判断该 URI 是否需要继续走代理
  const needProxy = (line, absoluteUrl) =>
    line.startsWith('#EXT-X-KEY') || /\.m3u8($|\?)/i.test(absoluteUrl)
  return content
    .split('\n')
    .map((line) => {
      if (!line.includes('URI=')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const abs = resolve(trimmed)
          return needProxy(line, abs) ? proxy(abs) : abs
        }
        return line
      }
      return line.replace(/URI="([^"]*)"/g, (_m, uri) => {
        const abs = resolve(uri)
        return `URI="${needProxy(line, abs) ? proxy(abs) : abs}"`
      })
    })
    .join('\n')
}

function proxyMiddleware({ proxyUA }) {
  const handler = (server) => {
    server.middlewares.use('/proxy/', async (req, res) => {
      try {
        const encoded = req.url.replace(/^\//, '')
        if (!encoded) {
          res.statusCode = 400
          res.end('Missing target url')
          return
        }
        let target = decodeURIComponent(encoded)
        if (!/^https?:\/\//i.test(target)) {
          res.statusCode = 400
          res.end('Invalid target url')
          return
        }

        const upstream = await fetch(target, {
          headers: {
            'User-Agent': proxyUA,
            Accept: '*/*',
            Referer: new URL(target).origin,
          },
          redirect: 'follow',
        })

        // m3u8 播放列表：改写内部 URI（嵌套列表/密钥走 /proxy/，分片直连）
        const upstreamContentType = upstream.headers.get('content-type') || ''
        const isM3u8 =
          /\.m3u8($|\?)/i.test(target) ||
          /mpegurl|vnd\.apple\.mpegurl/i.test(upstreamContentType)
        if (isM3u8) {
          const text = await upstream.text()
          const rewritten = rewriteM3u8(
            text,
            target,
            (abs) => '/proxy/' + encodeURIComponent(abs)
          )
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
          res.setHeader('Content-Length', Buffer.byteLength(rewritten))
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')
          res.end(rewritten)
          return
        }

        const buf = Buffer.from(await upstream.arrayBuffer())
        res.statusCode = upstream.status
        res.setHeader(
          'Content-Type',
          upstreamContentType || 'application/octet-stream'
        )
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', '*')
        res.end(buf)
      } catch (e) {
        res.statusCode = 502
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end('Proxy error: ' + (e?.message || 'unknown'))
      }
    })
  }
  return {
    name: 'starvid-proxy-middleware',
    configureServer: handler,
    configurePreviewServer: handler,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载 .env；第三个参数 '' 表示同时加载不带 VITE_ 前缀的变量（如 DEV_PORT）
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.DEV_PORT) || 5173
  const base = env.BASE || '/'
  const proxyUA =
    env.VITE_PROXY_UA ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

  return {
    base,
    plugins: [vue(), proxyMiddleware({ proxyUA })],
    server: {
      host: true,
      port: devPort,
    },
    preview: {
      port: devPort,
    },
  }
})
