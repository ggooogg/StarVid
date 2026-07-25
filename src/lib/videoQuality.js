/**
 * 视频质量与网络测速模块（用 hls.js 加载 m3u8，测量分辨率/速度/延迟）。
 */
import Hls from 'hls.js'

// 从 m3u8 探测画质、下载速度与网络延迟（测量后自动销毁临时元素）。
export function getVideoResolutionFromM3u8(m3u8Url) {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'metadata'

      // HEAD 请求测量网络延迟（ping）
      const pingStart = performance.now()
      let pingTime = 0
      fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          pingTime = performance.now() - pingStart
        })
        .catch(() => {
          pingTime = performance.now() - pingStart
        })

      const hls = new Hls()

      // 4 秒超时保护
      const timeout = setTimeout(() => {
        hls.destroy()
        video.remove()
        reject(new Error('Timeout loading video metadata'))
      }, 4000)

      video.onerror = () => {
        clearTimeout(timeout)
        hls.destroy()
        video.remove()
        reject(new Error('Failed to load video metadata'))
      }

      let actualLoadSpeed = '未知'
      let hasSpeedCalculated = false
      let hasMetadataLoaded = false
      let fragmentStartTime = 0

      // 元数据和速度都就绪时计算画质并返回
      const checkAndResolve = () => {
        if (hasMetadataLoaded && (hasSpeedCalculated || actualLoadSpeed !== '未知')) {
          clearTimeout(timeout)
          const width = video.videoWidth
          hls.destroy()
          video.remove()

          if (width && width > 0) {
            // 按宽度映射画质档位
            const quality =
              width >= 3840
                ? '4K'
                : width >= 2560
                ? '2K'
                : width >= 1920
                ? '1080p'
                : width >= 1280
                ? '720p'
                : width >= 854
                ? '480p'
                : 'SD'
            resolve({
              quality,
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            })
          } else {
            // webkit 无法获取宽度时画质返回未知
            resolve({
              quality: '未知',
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            })
          }
        }
      }

      hls.on(Hls.Events.FRAG_LOADING, () => {
        fragmentStartTime = performance.now()
      })

      // 用首个分片大小与耗时计算下载速度
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        if (fragmentStartTime > 0 && data && data.payload && !hasSpeedCalculated) {
          const loadTime = performance.now() - fragmentStartTime
          const size = data.payload.byteLength || 0
          if (loadTime > 0 && size > 0) {
            const speedKBps = size / 1024 / (loadTime / 1000)
            actualLoadSpeed =
              speedKBps >= 1024
                ? `${(speedKBps / 1024).toFixed(1)} MB/s`
                : `${speedKBps.toFixed(1)} KB/s`
            hasSpeedCalculated = true
            checkAndResolve()
          }
        }
      })

      hls.loadSource(m3u8Url)
      hls.attachMedia(video)

      // 致命错误时终止
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data && data.fatal) {
          clearTimeout(timeout)
          hls.destroy()
          video.remove()
          reject(new Error(`HLS播放失败: ${data.type}`))
        }
      })

      video.onloadedmetadata = () => {
        hasMetadataLoaded = true
        checkAndResolve()
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
