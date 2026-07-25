<!-- 播放页（核心）：聚合片源 + ArtPlayer/hls.js，选集/换源/优选/记忆/跳过/快捷键 -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Artplayer from 'artplayer'
import Hls from 'hls.js'
import {
  Search,
  Lightning,
  Film,
  VideoPlay,
  ArrowRight,
  Link,
  Star,
  StarFilled,
} from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settings'
import { useFavoritesStore } from '../stores/favorites'
import { aggregatedSearch, getVideoDetail } from '../lib/videoSearch'
import { getVideoResolutionFromM3u8 } from '../lib/videoQuality'
import { processImageUrl } from '../lib/imageProxy'
import {
  getPlayRecord,
  savePlayRecord,
  deletePlayRecord,
  getSkipConfig,
  saveSkipConfig,
  deleteSkipConfig,
} from '../lib/playRecords'
import { getSelectedSources } from '../data/apiSites'
import EpisodeSelector from '../components/EpisodeSelector.vue'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const favStore = useFavoritesStore()

// 请求取消相关：abortController 用于中断搜索请求，isCancelled 标记组件是否已被卸载
let abortController = null
let isCancelled = false

// 初始化阶段的状态
const loading = ref(true) // 是否处于整体加载态
const loadingStage = ref('searching') // 加载阶段：searching/fetching/preferring/ready
const loadingMessage = ref('正在搜索播放源...') // 加载提示文案
const error = ref('') // 错误信息
const detail = ref(null) // 当前播放影片的详情对象

// 来自路由参数的影片信息
const videoTitle = ref(String(route.query.title || ''))
const videoYear = ref(String(route.query.year || ''))
const videoCover = ref('')
const videoDoubanId = ref(0)
const currentSource = ref(String(route.query.source || ''))
const currentId = ref(String(route.query.id || ''))
const searchType = String(route.query.stype || '') // 限定类型：tv(多集) / movie(单集)
const needPrefer = ref(String(route.query.prefer || '') === 'true') // 是否强制优选最佳源

const currentEpisodeIndex = ref(0) // 当前集索引（从 0 开始）
const videoUrl = ref('') // 当前集播放地址

const availableSources = ref([]) // 全部可用片源
const sourceSearchLoading = ref(false) // 换源搜索加载态
const sourceSearchError = ref('') // 换源搜索错误

const precomputedVideoInfo = ref(new Map()) // 各片源已测得的画质/测速信息（优选时写入）

const isVideoLoading = ref(true) // 视频（单集）加载态
const videoLoadingStage = ref('initing') // 视频加载阶段文案

const isSelectorCollapsed = ref(false) // 右侧选集/换源面板是否收起

// 总集数（取播放地址数量）
const totalEpisodes = computed(() => detail.value?.episodes_urls?.length || 0)
const favorited = computed(() => (currentId.value ? favStore.isFav(currentId.value) : false)) // 是否已收藏

const artRef = ref(null) // 播放器容器 DOM
let artPlayer = null // ArtPlayer 实例
const resumeTimeRef = { current: null } // 续播时间点（秒）
let lastVolume = 0.7 // 上次音量（用于跨集恢复）
let lastPlaybackRate = 1.0 // 上次倍速
let lastSaveTime = 0 // 上次保存进度时间戳
let lastSkipCheck = 0 // 上次跳过检查时间戳
let wakeLock = null // 屏幕常亮锁

// 跳过片头片尾配置：enable(总开关) / intro_time(片头秒) / outro_time(片尾负值，表示距结尾秒数)
const skipConfig = ref({ enable: false, intro_time: 0, outro_time: 0 })

// 将秒数格式化为 mm:ss 或 hh:mm:ss
function formatTime(seconds) {
  if (!seconds) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h === 0 ? `${mm}:${ss}` : `${String(h).padStart(2, '0')}:${mm}:${ss}`
}

// 过滤 m3u8 中带 DISCONTINUITY 标记的广告分片
function filterAdsFromM3U8(content) {
  if (!content) return ''
  return content
    .split('\n')
    .filter((line) => !line.includes('#EXT-X-DISCONTINUITY'))
    .join('\n')
}

/**
 * 自定义 hls.js 加载器：在 manifest/level 加载成功后拦截并去除广告分片。
 */
class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config)
    const load = this.load.bind(this)
    this.load = function (context, cfg, callbacks) {
      if (context.type === 'manifest' || context.type === 'level') {
        const onSuccess = callbacks.onSuccess
        callbacks.onSuccess = function (response, stats, ctx) {
          if (response.data && typeof response.data === 'string') {
            response.data = filterAdsFromM3U8(response.data)
          }
          return onSuccess(response, stats, ctx, null)
        }
      }
      load(context, cfg, callbacks)
    }
  }
}

// 综合得分（满分 100）：画质 40% + 速度 40% + 延迟 20%
function calculateSourceScore(testResult, maxSpeed, minPing, maxPing) {
  let score = 0
  const qualityScore =
    { '4K': 100, '2K': 85, '1080p': 75, '720p': 60, '480p': 40, SD: 20 }[testResult.quality] || 0
  score += qualityScore * 0.4
  const speedScore = (() => {
    const m = String(testResult.loadSpeed).match(/^([\d.]+)\s*(KB\/s|MB\/s)$/)
    if (!m) return 30
    const speedKBps = m[2] === 'MB/s' ? parseFloat(m[1]) * 1024 : parseFloat(m[1])
    return Math.min(100, Math.max(0, (speedKBps / maxSpeed) * 100))
  })()
  score += speedScore * 0.4
  const pingScore = (() => {
    const ping = testResult.pingTime
    if (ping <= 0) return 0
    if (maxPing === minPing) return 100
    return Math.min(100, Math.max(0, ((maxPing - ping) / (maxPing - minPing)) * 100))
  })()
  score += pingScore * 0.2
  return Math.round(score * 100) / 100
}

// 优选综合得分最高的片源：分批并发测速，结果写入 precomputedVideoInfo 后按分排序
async function preferBestSource(sources) {
  if (sources.length === 1) return sources[0]

  const batchSize = Math.ceil(sources.length / 2)
  const allResults = []
  for (let start = 0; start < sources.length; start += batchSize) {
    const batch = sources.slice(start, start + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (source) => {
        try {
          const urls = source.episodes_urls || []
          if (urls.length === 0) return null
          const episodeUrl = urls.length > 1 ? urls[1] : urls[0]
          // m3u8 直连测速（复刻 mtv：视频流不经代理）
          const testResult = await getVideoResolutionFromM3u8(episodeUrl)
          return { source, testResult }
        } catch (e) {
          return null
        }
      })
    )
    allResults.push(...batchResults)
  }

  const infoMap = new Map()
  allResults.forEach((result) => {
    if (result) {
      infoMap.set(`${result.source.source}-${result.source.id}`, result.testResult)
    }
  })
  precomputedVideoInfo.value = infoMap

  const successful = allResults.filter(Boolean)
  if (successful.length === 0) return sources[0]

  const validSpeeds = successful
    .map((r) => {
      const m = String(r.testResult.loadSpeed).match(/^([\d.]+)\s*(KB\/s|MB\/s)$/)
      if (!m) return 0
      return m[2] === 'MB/s' ? parseFloat(m[1]) * 1024 : parseFloat(m[1])
    })
    .filter((v) => v > 0)
  const maxSpeed = validSpeeds.length ? Math.max(...validSpeeds) : 1024

  const validPings = successful.map((r) => r.testResult.pingTime).filter((p) => p > 0)
  const minPing = validPings.length ? Math.min(...validPings) : 50
  const maxPing = validPings.length ? Math.max(...validPings) : 1000

  const withScore = successful.map((r) => ({
    ...r,
    score: calculateSourceScore(r.testResult, maxSpeed, minPing, maxPing),
  }))
  withScore.sort((a, b) => b.score - a.score)
  return withScore[0].source
}

// 按标题聚合搜索全部资源站，过滤出与当前影片（标题/年份/类型/有播放地址）匹配的片源
async function fetchSourcesData(query, signal) {
  sourceSearchLoading.value = true
  try {
    const results = await aggregatedSearch(query.trim(), getSelectedSources(), signal)
    const filtered = results.filter(
      (r) =>
        r.title.replaceAll(' ', '').toLowerCase() ===
          videoTitle.value.replaceAll(' ', '').toLowerCase() &&
        (videoYear.value ? r.year.toLowerCase() === videoYear.value.toLowerCase() : true) &&
        (searchType
          ? (searchType === 'tv' && r.episodes > 1) ||
            (searchType === 'movie' && r.episodes === 1)
          : true) &&
        (r.episodes_urls?.length || 0) > 0
    )
    availableSources.value = filtered
    return filtered
  } catch (e) {
    sourceSearchError.value = e?.message || '搜索失败'
    availableSources.value = []
    return []
  } finally {
    sourceSearchLoading.value = false
  }
}

// 按来源+ID 直接拉取单部影片详情，命中返回长度为 1 的片源数组
async function fetchSourceDetail(source, id, signal) {
  try {
    const d = await getVideoDetail(source, id, signal)
    if (!d) return []
    availableSources.value = [d]
    return [d]
  } catch (e) {
    return []
  } finally {
    sourceSearchLoading.value = false
  }
}

// 初始化播放页：解析路由参数 → 搜索/获取片源 → 优选或定位目标 → 恢复进度/跳过配置 → 重写路由
async function initAll() {
  if (isCancelled) return
  if (!currentSource.value && !currentId.value && !videoTitle.value) {
    error.value = '缺少必要参数'
    loading.value = false
    return
  }
  loading.value = true
  const hasTarget = currentSource.value && currentId.value
  loadingStage.value = hasTarget ? 'fetching' : 'searching'
  loadingMessage.value = hasTarget ? '正在获取视频详情...' : '正在搜索播放源...'

  abortController = new AbortController()
  const signal = abortController.signal

  let sourcesInfo = videoTitle.value ? await fetchSourcesData(videoTitle.value, signal) : []
  if (isCancelled) return
  if (
    hasTarget &&
    !sourcesInfo.some((s) => s.source === currentSource.value && s.id === currentId.value)
  ) {
    const detailInfo = await fetchSourceDetail(currentSource.value, currentId.value, signal)
    if (isCancelled) return
    if (detailInfo.length) {
      sourcesInfo = sourcesInfo.length ? [...detailInfo, ...sourcesInfo] : detailInfo
      availableSources.value = sourcesInfo
      if (!videoTitle.value && detailInfo[0].title) {
        videoTitle.value = detailInfo[0].title
        fetchSourcesData(detailInfo[0].title, signal).then((more) => {
          if (isCancelled) return
          if (more.length) {
            const seen = new Set(sourcesInfo.map((s) => `${s.source}_${s.id}`))
            availableSources.value = [
              ...sourcesInfo,
              ...more.filter((m) => !seen.has(`${m.source}_${m.id}`)),
            ]
          } else {
            availableSources.value = sourcesInfo
          }
        })
      }
    }
  }
  if (isCancelled) return
  if (sourcesInfo.length === 0) {
    error.value = '未找到匹配结果'
    loading.value = false
    return
  }

  let detailData = sourcesInfo[0]
  if (hasTarget && !needPrefer.value) {
    const target = sourcesInfo.find(
      (s) => s.source === currentSource.value && s.id === currentId.value
    )
    if (target) {
      detailData = target
    } else {
      error.value = '未找到匹配结果'
      loading.value = false
      return
    }
  }

  if ((!hasTarget || needPrefer.value) && settings.optimization) {
    loadingStage.value = 'preferring'
    loadingMessage.value = '正在优选最佳播放源...'
    detailData = await preferBestSource(sourcesInfo)
    if (isCancelled) return
  }

  needPrefer.value = false
  currentSource.value = detailData.source
  currentId.value = detailData.id
  videoYear.value = detailData.year
  videoTitle.value = detailData.title || videoTitle.value
  videoCover.value = detailData.poster
  videoDoubanId.value = detailData.douban_id || 0
  detail.value = detailData

  const record = getPlayRecord(detailData.source, detailData.id)
  if (record) {
    const targetIndex = (record.index || 1) - 1
    if (targetIndex >= 0 && targetIndex < detailData.episodes_urls.length) {
      currentEpisodeIndex.value = targetIndex
    }
    resumeTimeRef.current = record.play_time || 0
  }
  if (currentEpisodeIndex.value >= detailData.episodes_urls.length) {
    currentEpisodeIndex.value = 0
  }

  const cfg = getSkipConfig(detailData.source, detailData.id)
  if (cfg) skipConfig.value = cfg

  if (isCancelled) return
  router.replace({
    path: '/play',
    query: {
      source: detailData.source,
      id: detailData.id,
      title: detailData.title,
      year: detailData.year || undefined,
    },
  })

  loadingStage.value = 'ready'
  loadingMessage.value = '准备就绪，即将开始播放...'
  setTimeout(() => {
    if (isCancelled) return
    loading.value = false
  }, 600)
}

// 处理换源：清理旧片源记录，切换新片源并同步路由与状态
async function handleSourceChange(newSource, newId, newTitle) {
  try {
    videoLoadingStage.value = 'sourceChanging'
    isVideoLoading.value = true

    const currentPlayTime = artPlayer?.currentTime || 0

    if (currentSource.value && currentId.value) {
      deletePlayRecord(currentSource.value, currentId.value)
      deleteSkipConfig(currentSource.value, currentId.value)
      saveSkipConfig(newSource, newId, skipConfig.value)
    }

    const newDetail = availableSources.value.find(
      (s) => s.source === newSource && s.id === newId
    )
    if (!newDetail) {
      error.value = '未找到匹配结果'
      return
    }

    let targetIndex = currentEpisodeIndex.value
    if (!newDetail.episodes_urls || targetIndex >= newDetail.episodes_urls.length) {
      targetIndex = 0
    }
    if (targetIndex !== currentEpisodeIndex.value) {
      resumeTimeRef.current = 0
    } else if ((!resumeTimeRef.current || resumeTimeRef.current === 0) && currentPlayTime > 1) {
      resumeTimeRef.current = currentPlayTime
    }

    router.replace({
      path: '/play',
      query: {
        source: newSource,
        id: newId,
        title: newDetail.title || newTitle,
        year: newDetail.year || undefined,
      },
    })

    videoTitle.value = newDetail.title || newTitle
    videoYear.value = newDetail.year
    videoCover.value = newDetail.poster
    videoDoubanId.value = newDetail.douban_id || 0
    currentSource.value = newSource
    currentId.value = newId
    detail.value = newDetail
    currentEpisodeIndex.value = targetIndex
  } catch (e) {
    isVideoLoading.value = false
    error.value = e?.message || '换源失败'
  }
}

// 切换集数（来自选集面板）
function handleEpisodeChange(index) {
  if (index >= 0 && index < totalEpisodes.value) {
    if (artPlayer && !artPlayer.paused) saveCurrentPlayProgress()
    currentEpisodeIndex.value = index
  }
}

/** 播放下一集（若有） */
function handleNextEpisode() {
  if (detail.value && currentEpisodeIndex.value < totalEpisodes.value - 1) {
    if (artPlayer && !artPlayer.paused) saveCurrentPlayProgress()
    currentEpisodeIndex.value += 1
  }
}

/** 播放上一集（若有） */
function handlePreviousEpisode() {
  if (detail.value && currentEpisodeIndex.value > 0) {
    if (artPlayer && !artPlayer.paused) saveCurrentPlayProgress()
    currentEpisodeIndex.value -= 1
  }
}

// 保存当前播放进度到本地（每 5 秒或暂停/切集时触发）
function saveCurrentPlayProgress() {
  if (!artPlayer || !currentSource.value || !currentId.value || !detail.value) return
  const currentTime = artPlayer.currentTime || 0
  const duration = artPlayer.duration || 0
  if (currentTime < 1 || !duration) return
  savePlayRecord(currentSource.value, currentId.value, {
    title: videoTitle.value,
    source_name: detail.value.source_name || '',
    year: detail.value.year || '',
    cover: detail.value.poster || '',
    index: currentEpisodeIndex.value + 1,
    total_episodes: totalEpisodes.value || 1,
    play_time: Math.floor(currentTime),
    total_time: Math.floor(duration),
    save_time: Date.now(),
  })
  lastSaveTime = Date.now()
}

/** 切换当前影片的收藏状态 */
function handleToggleFavorite() {
  if (!detail.value || !currentId.value) return
  favStore.toggle({
    id: currentId.value,
    title: videoTitle.value,
    poster: detail.value.poster || '',
    year: detail.value.year || '',
    source: currentSource.value,
    source_name: detail.value.source_name || '',
    total_episodes: totalEpisodes.value || 1,
  })
}

// 更新并持久化「跳过片头片尾」配置（全为空时删除）
function handleSkipConfigChange(newConfig) {
  if (!currentSource.value || !currentId.value) return
  skipConfig.value = newConfig
  if (!newConfig.enable && !newConfig.intro_time && !newConfig.outro_time) {
    deleteSkipConfig(currentSource.value, currentId.value)
  } else {
    saveSkipConfig(currentSource.value, currentId.value, newConfig)
  }
}

/** 请求屏幕常亮锁（Wake Lock），播放时保持屏幕不熄灭 */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
    }
  } catch (e) {
  }
}

/** 释放屏幕常亮锁 */
async function releaseWakeLock() {
  try {
    if (wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch (e) {
  }
}

/** 销毁 ArtPlayer 实例与内部 hls.js 实例，释放资源 */
function cleanupPlayer() {
  if (artPlayer) {
    try {
      if (artPlayer.video && artPlayer.video.hls) artPlayer.video.hls.destroy()
      artPlayer.destroy()
    } catch (e) {
    }
    artPlayer = null
  }
}

// 确保 <video> 内有指向目标 url 的 <source>，并开启 AirPlay
function ensureVideoSource(video, url) {
  if (!video || !url) return
  const sources = Array.from(video.getElementsByTagName('source'))
  if (!sources.some((s) => s.src === url)) {
    sources.forEach((s) => s.remove())
    const el = document.createElement('source')
    el.src = url
    video.appendChild(el)
  }
  video.disableRemotePlayback = false
  if (video.hasAttribute('disableRemotePlayback')) {
    video.removeAttribute('disableRemotePlayback')
  }
}

// 创建/重建 ArtPlayer：非 WebKit 直接切换 url，WebKit 新建实例并挂载 hls.js 自定义加载器及各项逻辑
function createPlayer() {
  if (!videoUrl.value || loading.value || !artRef.value) return
  if (
    !detail.value ||
    currentEpisodeIndex.value >= totalEpisodes.value ||
    currentEpisodeIndex.value < 0
  ) {
    error.value = `选集索引无效，当前共 ${totalEpisodes.value} 集`
    return
  }

  const isWebkit = typeof window.webkitConvertPointFromNodeToPage === 'function'

  if (!isWebkit && artPlayer) {
    artPlayer.switch = videoUrl.value
    artPlayer.title = `${videoTitle.value} - 第${currentEpisodeIndex.value + 1}集`
    artPlayer.poster = videoCover.value
    if (artPlayer.video) ensureVideoSource(artPlayer.video, videoUrl.value)
    return
  }

  cleanupPlayer()

  try {
    Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
    Artplayer.USE_RAF = true

    artPlayer = new Artplayer({
      container: artRef.value,
      url: videoUrl.value,
      poster: videoCover.value,
      volume: 0.7,
      isLive: false,
      muted: false,
      autoplay: true,
      pip: true,
      autoSize: false,
      autoMini: false,
      screenshot: false,
      setting: true,
      loop: false,
      flip: false,
      playbackRate: true,
      aspectRatio: false,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: false,
      miniProgressBar: false,
      mutex: true,
      playsInline: true,
      autoPlayback: false,
      airplay: true,
      theme: '#22c55e',
      lang: 'zh-cn',
      hotkey: false,
      fastForward: true,
      autoOrientation: true,
      lock: true,
      moreVideoAttr: { crossOrigin: 'anonymous' },
      customType: {
        m3u8: function (video, url) {
          if (video.hls) video.hls.destroy()
          const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: 30,
            backBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000,
            loader: settings.adFilter ? CustomHlsJsLoader : Hls.DefaultConfig.loader,
          })
          hls.loadSource(url)
          hls.attachMedia(video)
          video.hls = hls
          ensureVideoSource(video, url)
          hls.on(Hls.Events.ERROR, function (_event, data) {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError()
                  break
                default:
                  hls.destroy()
                  break
              }
            }
          })
        },
      },
      settings: [
        {
          html: '去广告',
          icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">AD</text>',
          tooltip: settings.adFilter ? '已开启' : '已关闭',
          onClick() {
            const newVal = !settings.adFilter
            settings.adFilter = newVal
            return newVal ? '当前开启' : '当前关闭'
          },
        },
        {
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipConfig.value.enable,
          onSwitch: function (item) {
            handleSkipConfigChange({ ...skipConfig.value, enable: !item.switch })
            return !item.switch
          },
        },
        {
          html: '删除跳过配置',
          onClick: function () {
            handleSkipConfigChange({ enable: false, intro_time: 0, outro_time: 0 })
            return ''
          },
        },
        {
          name: '设置片头',
          html: '设置片头',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L17 12" stroke="#ffffff" stroke-width="2"/><path d="M17 6L17 18" stroke="#ffffff" stroke-width="2"/></svg>',
          tooltip:
            skipConfig.value.intro_time === 0
              ? '设置片头时间'
              : formatTime(skipConfig.value.intro_time),
          onClick: function () {
            const t = artPlayer?.currentTime || 0
            if (t > 0) {
              handleSkipConfigChange({ ...skipConfig.value, intro_time: t })
              return formatTime(t)
            }
          },
        },
        {
          name: '设置片尾',
          html: '设置片尾',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="#ffffff" stroke-width="2"/><path d="M7 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
          tooltip:
            skipConfig.value.outro_time >= 0
              ? '设置片尾时间'
              : `-${formatTime(-skipConfig.value.outro_time)}`,
          onClick: function () {
            const outro = -((artPlayer?.duration || 0) - (artPlayer?.currentTime || 0)) || 0
            if (outro < 0) {
              handleSkipConfigChange({ ...skipConfig.value, outro_time: outro })
              return `-${formatTime(-outro)}`
            }
          },
        },
      ],
      controls: [
        {
          position: 'left',
          index: 13,
          html: '<i class="art-icon" style="display:flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
          tooltip: '播放下一集',
          click: function () {
            handleNextEpisode()
          },
        },
      ],
    })

    artPlayer.on('ready', () => {
      error.value = ''
      if (artPlayer && !artPlayer.paused) requestWakeLock()
    })

    artPlayer.on('play', requestWakeLock)

    artPlayer.on('pause', () => {
      releaseWakeLock()
      saveCurrentPlayProgress()
    })

    artPlayer.on('video:volumechange', () => {
      lastVolume = artPlayer.volume
    })
    artPlayer.on('video:ratechange', () => {
      lastPlaybackRate = artPlayer.playbackRate
    })

    artPlayer.on('video:canplay', () => {
      if (resumeTimeRef.current && resumeTimeRef.current > 0) {
        try {
          const duration = artPlayer.duration || 0
          let target = resumeTimeRef.current
          if (duration && target >= duration - 2) target = Math.max(0, duration - 5)
          artPlayer.currentTime = target
        } catch (e) {
        }
      }
      resumeTimeRef.current = null

      setTimeout(() => {
        if (!artPlayer) return
        if (Math.abs(artPlayer.volume - lastVolume) > 0.01) {
          artPlayer.volume = lastVolume
        }
        if (Math.abs(artPlayer.playbackRate - lastPlaybackRate) > 0.01 && isWebkit) {
          artPlayer.playbackRate = lastPlaybackRate
        }
        artPlayer.notice.show = ''
      }, 0)

      isVideoLoading.value = false
    })

    artPlayer.on('video:timeupdate', () => {
      const now = Date.now()
      if (now - lastSaveTime > 5000) {
        saveCurrentPlayProgress()
        lastSaveTime = now
      }

      if (!skipConfig.value.enable) return
      if (now - lastSkipCheck < 1500) return
      lastSkipCheck = now

      const currentTime = artPlayer.currentTime || 0
      const duration = artPlayer.duration || 0

      if (skipConfig.value.intro_time > 0 && currentTime < skipConfig.value.intro_time) {
        artPlayer.currentTime = skipConfig.value.intro_time
        artPlayer.notice.show = `已跳过片头 (${formatTime(skipConfig.value.intro_time)})`
      }

      if (
        skipConfig.value.outro_time < 0 &&
        duration > 0 &&
        currentTime > duration + skipConfig.value.outro_time
      ) {
        if (currentEpisodeIndex.value < totalEpisodes.value - 1) {
          handleNextEpisode()
        } else {
          artPlayer.pause()
        }
        artPlayer.notice.show = `已跳过片尾 (${formatTime(skipConfig.value.outro_time)})`
      }
    })

    artPlayer.on('video:ended', () => {
      releaseWakeLock()
      if (detail.value && currentEpisodeIndex.value < totalEpisodes.value - 1) {
        setTimeout(() => {
          currentEpisodeIndex.value += 1
        }, 1000)
      }
    })

    if (artPlayer?.video) ensureVideoSource(artPlayer.video, videoUrl.value)
  } catch (e) {
    console.error('创建播放器失败:', e)
    error.value = '播放器初始化失败'
  }
}

// 影片详情或集数变化时，更新当前播放地址
watch(
  [detail, currentEpisodeIndex],
  ([d, idx]) => {
    if (!d || !d.episodes_urls || idx >= d.episodes_urls.length) {
      videoUrl.value = ''
      return
    }
    // m3u8 播放地址直连（复刻 mtv：hls.js 直接加载原始地址，内部 key/分片同样直连）
    const newUrl = d.episodes_urls[idx] || ''
    if (newUrl !== videoUrl.value) videoUrl.value = newUrl
  },
  { immediate: true }
)

// 播放地址就绪且整体加载完成后，创建播放器
watch([videoUrl, loading], async ([url, isLoading]) => {
  if (!url || isLoading) return
  await nextTick()
  createPlayer()
})

// 广告过滤开关变化时，销毁并以新配置重建播放器（保留当前进度）
watch(
  () => settings.adFilter,
  async () => {
    if (!artPlayer) return
    resumeTimeRef.current = artPlayer.currentTime
    cleanupPlayer()
    await nextTick()
    createPlayer()
  }
)

/**
 * 全局键盘快捷键：
 *  Alt+←/→ 切上/下一集；←/→ 快退/快进 10s；↑/↓ 音量；空格 播放/暂停；f 全屏。
 * 在输入框内不触发（除 Alt 组合）。
 */
function handleKeyboardShortcuts(e) {
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.altKey && e.key === 'ArrowLeft') {
    handlePreviousEpisode()
    e.preventDefault()
    return
  }
  if (e.altKey && e.key === 'ArrowRight') {
    handleNextEpisode()
    e.preventDefault()
    return
  }
  if (!artPlayer) return
  if (e.key === 'ArrowLeft' && artPlayer.currentTime > 5) {
    artPlayer.currentTime -= 10
    e.preventDefault()
  } else if (e.key === 'ArrowRight' && artPlayer.currentTime < artPlayer.duration - 5) {
    artPlayer.currentTime += 10
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    if (artPlayer.volume < 1) {
      artPlayer.volume = Math.round((artPlayer.volume + 0.1) * 10) / 10
      artPlayer.notice.show = `音量: ${Math.round(artPlayer.volume * 100)}`
    }
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    if (artPlayer.volume > 0) {
      artPlayer.volume = Math.round((artPlayer.volume - 0.1) * 10) / 10
      artPlayer.notice.show = `音量: ${Math.round(artPlayer.volume * 100)}`
    }
    e.preventDefault()
  } else if (e.key === ' ') {
    artPlayer.toggle()
    e.preventDefault()
  } else if (e.key === 'f' || e.key === 'F') {
    artPlayer.fullscreen = !artPlayer.fullscreen
    e.preventDefault()
  }
}

/** 页面卸载前：保存进度、释放锁、销毁播放器 */
function handleBeforeUnload() {
  saveCurrentPlayProgress()
  releaseWakeLock()
  cleanupPlayer()
}

/** 页面可见性变化：隐藏时保存进度并释放锁，恢复可见且播放时重新申请锁 */
function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    saveCurrentPlayProgress()
    releaseWakeLock()
  } else if (document.visibilityState === 'visible') {
    if (artPlayer && !artPlayer.paused) requestWakeLock()
  }
}

onMounted(() => {
  // 绑定全局事件并启动初始化流程
  document.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  initAll()
})

onBeforeUnmount(() => {
  // 标记取消、中断搜索请求、解绑事件并清理播放器
  isCancelled = true
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  saveCurrentPlayProgress()
  releaseWakeLock()
  cleanupPlayer()
})

/** 错误态下的返回：有标题跳搜索，否则返回上一页 */
function goBackOrSearch() {
  if (videoTitle.value) {
    router.push(`/search?q=${encodeURIComponent(videoTitle.value)}`)
  } else {
    router.back()
  }
}
</script>

<template>
  <div class="play-page">
    <div v-if="loading" class="full-state">
      <div class="stage-icon" :class="loadingStage">
        <el-icon v-if="loadingStage === 'searching'" :size="36"><Search /></el-icon>
        <el-icon v-else-if="loadingStage === 'preferring'" :size="36"><Lightning /></el-icon>
        <el-icon v-else-if="loadingStage === 'fetching'" :size="36"><Film /></el-icon>
        <el-icon v-else :size="36"><VideoPlay /></el-icon>
        <span class="halo" />
      </div>
      <div class="progress-dots">
        <span :class="{ on: true, big: loadingStage === 'searching' || loadingStage === 'fetching' }" />
        <span :class="{ on: loadingStage === 'preferring' || loadingStage === 'ready', big: loadingStage === 'preferring' }" />
        <span :class="{ on: loadingStage === 'ready', big: loadingStage === 'ready' }" />
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{
            width:
              loadingStage === 'searching' || loadingStage === 'fetching'
                ? '33%'
                : loadingStage === 'preferring'
                ? '66%'
                : '100%',
          }"
        />
      </div>
      <p class="loading-msg">{{ loadingMessage }}</p>
    </div>

    <div v-else-if="error" class="full-state">
      <el-result icon="error" title="哎呀，出现了一些问题" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="goBackOrSearch">
            {{ videoTitle ? '返回搜索' : '返回上页' }}
          </el-button>
          <el-button @click="() => $router.go(0)">重新尝试</el-button>
        </template>
      </el-result>
    </div>

    <template v-else>
      <div class="title-row">
        <h1>
          {{ videoTitle || '影片标题' }}
          <span v-if="totalEpisodes > 1" class="ep-indicator">
            &gt; 第 {{ currentEpisodeIndex + 1 }} 集
          </span>
        </h1>
      </div>

      <div class="collapse-row">
        <button
          class="collapse-btn"
          :title="isSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'"
          @click="isSelectorCollapsed = !isSelectorCollapsed"
        >
          <el-icon :size="13" :class="{ rotated: isSelectorCollapsed }"><ArrowRight /></el-icon>
          <span>{{ isSelectorCollapsed ? '显示' : '隐藏' }}</span>
          <i class="dot" :class="{ collapsed: isSelectorCollapsed }" />
        </button>
      </div>

      <div class="player-grid" :class="{ collapsed: isSelectorCollapsed }">
        <div class="player-wrap">
          <div ref="artRef" class="art-container" />

          <div v-if="isVideoLoading" class="video-loading-mask">
            <div class="mask-inner">
              <div class="stage-icon">
                <el-icon :size="36"><Film /></el-icon>
                <span class="halo" />
              </div>
              <p class="loading-msg light">
                {{ videoLoadingStage === 'sourceChanging' ? '切换播放源...' : '视频加载中...' }}
              </p>
            </div>
          </div>
        </div>

        <div class="selector-wrap" :class="{ hidden: isSelectorCollapsed }">
          <EpisodeSelector
            :total-episodes="totalEpisodes"
            :episodes-titles="detail?.episodes_titles || []"
            :value="currentEpisodeIndex + 1"
            :current-source="currentSource"
            :current-id="currentId"
            :video-title="videoTitle"
            :available-sources="availableSources"
            :source-search-loading="sourceSearchLoading"
            :source-search-error="sourceSearchError"
            :precomputed-video-info="precomputedVideoInfo"
            @change="handleEpisodeChange"
            @source-change="handleSourceChange"
          />
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-poster">
          <div class="poster-box">
            <img
              v-if="videoCover"
              :src="processImageUrl(videoCover)"
              :alt="videoTitle"
              referrerpolicy="no-referrer"
            />
            <span v-else class="poster-empty">封面图片</span>
            <a
              v-if="videoDoubanId"
              class="douban-link"
              :href="`https://movie.douban.com/subject/${videoDoubanId}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              <el-icon :size="14"><Link /></el-icon>
            </a>
          </div>
        </div>

        <div class="detail-text">
          <h2 class="detail-title">
            {{ videoTitle || '影片标题' }}
            <button class="fav-btn" :class="{ faved: favorited }" @click.stop="handleToggleFavorite">
              <el-icon :size="24"><StarFilled v-if="favorited" /><Star v-else /></el-icon>
            </button>
          </h2>
          <div class="meta-row">
            <span v-if="detail?.class" class="meta-class">{{ detail.class }}</span>
            <span v-if="detail?.year || videoYear">{{ detail?.year || videoYear }}</span>
            <span v-if="detail?.source_name" class="meta-source">{{ detail.source_name }}</span>
            <span v-if="detail?.type_name">{{ detail.type_name }}</span>
            <span v-if="detail?.remarks">{{ detail.remarks }}</span>
          </div>
          <div v-if="detail?.desc" class="desc">{{ detail.desc }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use './play' as *;
</style>
