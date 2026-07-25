<!-- 选集 / 换源面板：分页选集 + 片源优选测速 -->
<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Sort } from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settings'
import { getVideoResolutionFromM3u8 } from '../lib/videoQuality'
import { processImageUrl } from '../lib/imageProxy'

const props = defineProps({
  totalEpisodes: { type: Number, default: 0 },
  episodesTitles: { type: Array, default: () => [] },
  episodesPerPage: { type: Number, default: 50 },
  value: { type: Number, default: 1 },
  currentSource: { type: String, default: '' },
  currentId: { type: String, default: '' },
  videoTitle: { type: String, default: '' },
  availableSources: { type: Array, default: () => [] },
  sourceSearchLoading: { type: Boolean, default: false },
  sourceSearchError: { type: String, default: '' },
  precomputedVideoInfo: { type: Map, default: () => new Map() },
})

const emit = defineEmits(['change', 'source-change'])

const router = useRouter()
const settings = useSettingsStore()

// 当前激活的标签页：多集时默认「选集」，单集时默认「换源」
const activeTab = ref(props.totalEpisodes > 1 ? 'episodes' : 'sources')
watch(
  () => props.totalEpisodes,
  (n) => {
    if (n <= 1) activeTab.value = 'sources'
  }
)

const pageCount = computed(() => Math.ceil(props.totalEpisodes / props.episodesPerPage)) // 总分页数
const currentPage = ref(Math.floor((props.value - 1) / props.episodesPerPage)) // 当前所在分页
const descending = ref(false) // 是否倒序展示

// 倒序时展示用的分页索引（与实际 currentPage 做映射）
const displayPage = computed(() =>
  descending.value ? pageCount.value - 1 - currentPage.value : currentPage.value
)

// 升序的分页区间列表，如 { start: 1, end: 50 }
const categoriesAsc = computed(() =>
  Array.from({ length: pageCount.value }, (_, i) => {
    const start = i * props.episodesPerPage + 1
    const end = Math.min(start + props.episodesPerPage - 1, props.totalEpisodes)
    return { start, end }
  })
)

// 分页区间的展示标签（随正序/倒序切换文案方向）
const categories = computed(() => {
  if (descending.value) {
    return [...categoriesAsc.value].reverse().map(({ start, end }) => `${end}-${start}`)
  }
  return categoriesAsc.value.map(({ start, end }) => `${start}-${end}`)
})

const currentStart = computed(() => currentPage.value * props.episodesPerPage + 1) // 当前页起始集号
const currentEnd = computed(() =>
  Math.min(currentStart.value + props.episodesPerPage - 1, props.totalEpisodes)
) // 当前页结束集号

// 当前页要渲染的集号列表（随正序/倒序调整顺序）
const pageEpisodes = computed(() => {
  const len = currentEnd.value - currentStart.value + 1
  if (len <= 0) return []
  return Array.from({ length: len }, (_, i) =>
    descending.value ? currentEnd.value - i : currentStart.value + i
  )
})

watch(
  () => props.value,
  (v) => {
    const page = Math.floor((v - 1) / props.episodesPerPage)
    if (page !== currentPage.value) currentPage.value = page
  }
)

const categoryContainerRef = ref(null)
const buttonRefs = ref([])
// 分页切换时，将当前分页按钮平滑滚动到可视区域中央
watch([displayPage, pageCount], async () => {
  await nextTick()
  const btn = buttonRefs.value[displayPage.value]
  const container = categoryContainerRef.value
  if (btn && container) {
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const btnLeft = btnRect.left - containerRect.left + container.scrollLeft
    const target = btnLeft - (containerRect.width - btnRect.width) / 2
    container.scrollTo({ left: target, behavior: 'smooth' })
  }
})

/**
 * 点击分页区间，切换到对应分页（考虑正序/倒序映射）。
 * @param {number} idx 展示列表中的分页索引
 */
function handleCategoryClick(idx) {
  currentPage.value = descending.value ? pageCount.value - 1 - idx : idx
}

/**
 * 计算某一集的展示文案：优先使用标题中的集号，否则用标题或集数。
 * @param {number} episodeNumber 集号（从 1 开始）
 * @returns {string|number} 展示文案
 */
function episodeLabel(episodeNumber) {
  const title = props.episodesTitles?.[episodeNumber - 1]
  if (!title) return episodeNumber
  const match = title.match(/第(\d+)集/)
  if (match) return match[1]
  return title
}

const videoInfoMap = ref(new Map()) // 缓存各片源的画质/测速信息
const attemptedSources = new Set() // 已尝试检测过的片源，避免重复检测

watch(
  () => props.precomputedVideoInfo,
  (m) => {
    if (m && m.size > 0) {
      const newMap = new Map(videoInfoMap.value)
      m.forEach((info, key) => {
        newMap.set(key, info)
        if (!info.hasError) attemptedSources.add(key)
      })
      videoInfoMap.value = newMap
    }
  },
  { immediate: true }
)

/**
 * 对单个片源进行画质/测速检测，并将结果写入 videoInfoMap。
 * 优先使用第 2 集地址检测（更能反映正片画质），失败时记录错误标记。
 * @param {Object} source 片源对象
 */
async function getVideoInfo(source) {
  const sourceKey = `${source.source}-${source.id}`
  if (attemptedSources.has(sourceKey)) return
  const urls = source.episodes_urls || []
  if (urls.length === 0) return
  const episodeUrl = urls.length > 1 ? urls[1] : urls[0]
  attemptedSources.add(sourceKey)
  try {
    const info = await getVideoResolutionFromM3u8(episodeUrl)
    videoInfoMap.value = new Map(videoInfoMap.value).set(sourceKey, info)
  } catch (e) {
    videoInfoMap.value = new Map(videoInfoMap.value).set(sourceKey, {
      quality: '错误',
      loadSpeed: '未知',
      pingTime: 0,
      hasError: true,
    })
  }
}

// 切到「换源」标签且开启优化时，分批并发检测所有未检测的片源
watch(
  [activeTab, () => props.availableSources],
  async ([tab, sources]) => {
    if (!settings.optimization) return
    if (tab !== 'sources' || !sources || sources.length === 0) return
    const pending = sources.filter(
      (s) => !attemptedSources.has(`${s.source}-${s.id}`)
    )
    if (pending.length === 0) return
    const batchSize = Math.ceil(pending.length / 2) // 分两批检测，降低瞬时并发
    for (let start = 0; start < pending.length; start += batchSize) {
      const batch = pending.slice(start, start + batchSize)
      await Promise.all(batch.map(getVideoInfo))
    }
  },
  { immediate: true }
)

// 片源列表：当前正在播放的片源置顶
const sortedSources = computed(() =>
  [...props.availableSources].sort((a, b) => {
    const ac = isCurrentSource(a)
    const bc = isCurrentSource(b)
    if (ac && !bc) return -1
    if (!ac && bc) return 1
    return 0
  })
)

/**
 * 判断某片源是否为当前正在播放的片源。
 * @param {Object} s 片源对象
 * @returns {boolean}
 */
function isCurrentSource(s) {
  return (
    String(s.source) === String(props.currentSource) &&
    String(s.id) === String(props.currentId)
  )
}

/**
 * 根据画质返回对应的样式类名（用于画质标签着色）。
 * @param {string} quality 画质等级
 * @returns {string} ultra/high/normal
 */
function qualityClass(quality) {
  if (['4K', '2K'].includes(quality)) return 'ultra'
  if (['1080p', '720p'].includes(quality)) return 'high'
  return 'normal'
}

/**
 * 点击片源进行换源（当前片源不响应）。
 * @param {Object} s 片源对象
 */
function handleSourceClick(s) {
  if (isCurrentSource(s)) return
  emit('source-change', s.source, s.id, s.title)
}

/**
 * 跳转到搜索页，按当前影片标题搜索（用于修正匹配错误）。
 */
function goSearch() {
  if (props.videoTitle) {
    router.push(`/search?q=${encodeURIComponent(props.videoTitle)}`)
  }
}
</script>

<template>
  <div class="episode-selector">
    <div class="tabs">
      <div
        v-if="totalEpisodes > 1"
        class="tab"
        :class="{ active: activeTab === 'episodes' }"
        @click="activeTab = 'episodes'"
      >
        选集
      </div>
      <div
        class="tab"
        :class="{ active: activeTab === 'sources' }"
        @click="activeTab = 'sources'"
      >
        换源
      </div>
    </div>

    <template v-if="activeTab === 'episodes'">
      <div class="category-bar">
        <div ref="categoryContainerRef" class="category-scroll">
          <div class="category-list">
            <button
              v-for="(label, idx) in categories"
              :key="label"
              :ref="(el) => (buttonRefs[idx] = el)"
              class="category-btn"
              :class="{ active: idx === displayPage }"
              @click="handleCategoryClick(idx)"
            >
              {{ label }}
              <span v-if="idx === displayPage" class="active-line" />
            </button>
          </div>
        </div>
        <button class="order-btn" title="正序/倒序" @click="descending = !descending">
          <el-icon :size="15"><Sort /></el-icon>
        </button>
      </div>

      <div class="episode-grid">
        <button
          v-for="ep in pageEpisodes"
          :key="ep"
          class="episode-btn"
          :class="{ active: ep === value }"
          @click="emit('change', ep - 1)"
        >
          {{ episodeLabel(ep) }}
        </button>
      </div>
    </template>

    <div v-else class="sources-panel">
      <div v-if="sourceSearchLoading" class="state-box">
        <span class="spinner" />
        <span class="state-text">搜索中...</span>
      </div>

      <div v-else-if="sourceSearchError" class="state-box column">
        <p class="error-text">{{ sourceSearchError }}</p>
      </div>

      <div v-else-if="availableSources.length === 0" class="state-box column">
        <p class="state-text">暂无可用的换源</p>
      </div>

      <div v-else class="source-list">
        <div
          v-for="s in sortedSources"
          :key="`${s.source}-${s.id}`"
          class="source-item"
          :class="{ current: isCurrentSource(s) }"
          @click="handleSourceClick(s)"
        >
          <div class="source-poster">
            <img
              v-if="s.poster"
              :src="processImageUrl(s.poster)"
              :alt="s.title"
              referrerpolicy="no-referrer"
              @error="(e) => (e.target.style.display = 'none')"
            />
          </div>

          <div class="source-info">
            <div class="row top">
              <h3 class="source-title" :title="s.title">{{ s.title }}</h3>
              <template v-if="videoInfoMap.get(`${s.source}-${s.id}`)">
                <div
                  v-if="videoInfoMap.get(`${s.source}-${s.id}`).hasError"
                  class="quality-badge error"
                >
                  检测失败
                </div>
                <div
                  v-else-if="videoInfoMap.get(`${s.source}-${s.id}`).quality !== '未知'"
                  class="quality-badge"
                  :class="qualityClass(videoInfoMap.get(`${s.source}-${s.id}`).quality)"
                >
                  {{ videoInfoMap.get(`${s.source}-${s.id}`).quality }}
                </div>
              </template>
            </div>

            <div class="row middle">
              <span class="source-name">{{ s.source_name }}</span>
              <span v-if="(s.episodes_urls?.length || 0) > 1" class="ep-count">
                {{ s.episodes_urls.length }} 集
              </span>
            </div>

            <div class="row bottom">
              <template v-if="videoInfoMap.get(`${s.source}-${s.id}`)">
                <template v-if="!videoInfoMap.get(`${s.source}-${s.id}`).hasError">
                  <span class="speed">{{ videoInfoMap.get(`${s.source}-${s.id}`).loadSpeed }}</span>
                  <span class="ping">{{ videoInfoMap.get(`${s.source}-${s.id}`).pingTime }}ms</span>
                </template>
                <span v-else class="no-data">无测速数据</span>
              </template>
            </div>
          </div>
        </div>

        <div class="go-search">
          <button @click="goSearch">影片匹配有误？点击去搜索</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.episode-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.tabs {
  display: flex;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-hover);
  transition: all 0.2s ease;

  &:hover {
    color: var(--primary);
  }

  &.active {
    color: var(--primary);
    background: transparent;
  }
}

.category-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.category-scroll {
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.category-list {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

.category-btn {
  position: relative;
  width: 80px;
  padding: 10px 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: var(--primary);
  }

  &.active {
    color: var(--primary);
  }
}

.active-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
}

.order-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: var(--primary);
    background: var(--bg-hover);
  }
}

.episode-grid {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
  padding: 14px 12px;
}

.episode-btn {
  height: 38px;
  min-width: 38px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: ui-monospace, monospace;
  cursor: pointer;
  white-space: nowrap;
  background: var(--skeleton);
  color: var(--text);
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-hover);
    transform: scale(1.05);
  }

  &.active {
    background: var(--primary);
    color: #fff;
    box-shadow: 0 4px 12px var(--primary-soft);
  }
}

.sources-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 8px;
}

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  gap: 8px;

  &.column {
    flex-direction: column;
  }
}

.state-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.error-text {
  font-size: 13px;
  color: #ef4444;
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid transparent;
  border-bottom-color: var(--primary);
  animation: es-spin 0.8s linear infinite;
}

@keyframes es-spin {
  to {
    transform: rotate(360deg);
  }
}

.source-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &:hover:not(.current) {
    background: var(--bg-hover);
    transform: scale(1.01);
  }

  &.current {
    background: var(--primary-soft);
    border-color: var(--primary);
    cursor: default;
  }
}

.source-poster {
  flex-shrink: 0;
  width: 48px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--skeleton);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.source-info {
  flex: 1;
  min-width: 0;
  height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.source-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quality-badge {
  flex-shrink: 0;
  min-width: 46px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--skeleton);

  &.ultra {
    color: #a855f7;
  }

  &.high {
    color: var(--primary);
  }

  &.normal {
    color: #eab308;
  }

  &.error {
    color: #ef4444;
  }
}

.source-name {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-secondary);
}

.ep-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.bottom {
  justify-content: flex-start;
  gap: 12px;
  min-height: 16px;
}

.speed {
  font-size: 11px;
  font-weight: 500;
  color: var(--primary);
}

.ping {
  font-size: 11px;
  font-weight: 500;
  color: #f97316;
}

.no-data {
  font-size: 11px;
  font-weight: 500;
  color: #ef4444;
}

.go-search {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);

  button {
    width: 100%;
    padding: 8px 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary);
    transition: color 0.2s ease;

    &:hover {
      color: var(--primary);
    }
  }
}
</style>
