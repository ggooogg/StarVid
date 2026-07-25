<!-- 搜索页：聚合搜索 + 历史/联想 + 流式结果 + 聚合视图 -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Close, Top } from '@element-plus/icons-vue'
import VideoCard from '../components/VideoCard.vue'
import { searchByAPIAndKeyWord } from '../lib/videoSearch'
import { getSelectedSources } from '../data/apiSites'

const route = useRoute()
const router = useRouter()

const HISTORY_KEY = 'starvid_search_history' // 搜索历史存储键

const searchQuery = ref('')
const isLoading = ref(false) // 是否正在搜索
const showResults = ref(false) // 是否展示结果区
const searchResults = ref([]) // 搜索结果（按来源展开）
const showSuggestions = ref(false) // 是否展示联想下拉
const searchHistory = ref(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')) // 历史词
const showBackToTop = ref(false)
const inputRef = ref(null)

const viewMode = ref('all') // 展示模式：all(全部) / agg(聚合)

/** 持久化搜索历史 */
function persistHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value))
}
/** 新增一条搜索历史（去重并截断到 20 条） */
function addHistory(q) {
  searchHistory.value = [q, ...searchHistory.value.filter((i) => i !== q)].slice(0, 20)
  persistHistory()
}
/** 删除单条历史 */
function deleteHistory(q) {
  searchHistory.value = searchHistory.value.filter((i) => i !== q)
  persistHistory()
}
/** 清空历史 */
function clearHistory() {
  searchHistory.value = []
  persistHistory()
}

const suggestions = ref([]) // 联想建议列表

/**
 * 输入时实时过滤历史词作为联想建议。
 */
function onInput() {
  const q = searchQuery.value.trim().toLowerCase()
  showSuggestions.value = !!q
  if (!q) {
    suggestions.value = []
    return
  }
  suggestions.value = searchHistory.value
    .filter((h) => h.toLowerCase().includes(q))
    .slice(0, 8)
}
/** 聚焦时若已有输入则触发联想 */
function onFocus() {
  if (searchQuery.value.trim()) {
    onInput()
    showSuggestions.value = suggestions.value.length > 0
  }
}
/** 选择联想建议并立即搜索 */
function selectSuggestion(s) {
  searchQuery.value = s
  showSuggestions.value = false
  submitSearch()
}

/**
 * 对结果做排序：标题精确匹配优先，其次按年份倒序，同年按标题排序。
 * @param {Array} results 待排序结果
 * @param {string} q 搜索关键词
 * @returns {Array} 排序后结果
 */
function sortResults(results, q) {
  return [...results].sort((a, b) => {
    const aExact = a.title === q
    const bExact = b.title === q
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    if (a.year === b.year) return a.title.localeCompare(b.title)
    return parseInt(a.year || 0) > parseInt(b.year || 0) ? -1 : 1
  })
}

let searchToken = 0 // 搜索令牌，用于丢弃过期请求的结果

/**
 * 基于已选资源站聚合搜索。
 * 各资源站并发请求，边收边渲染，并对（来源+ID）做即时去重。
 * @param {string} query 关键词
 */
async function fetchResults(query) {
  const sources = getSelectedSources()
  if (!sources.length) {
    ElMessage.warning('请先在设置中选择至少一个数据源')
    return
  }
  const q = query.trim()
  const token = ++searchToken
  isLoading.value = true
  showResults.value = true
  searchResults.value = []

  const seen = new Set() // 已出现（source_id）去重集合

  // 并发请求所有资源站，任一完成即合并展示
  await Promise.allSettled(
    sources.map(async (key) => {
      const arr = await searchByAPIAndKeyWord(key, q)
      if (token !== searchToken) return // 已有新搜索，丢弃
      const fresh = (arr || []).filter((item) => {
        const k = `${item.source}_${item.id}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      if (fresh.length) {
        searchResults.value = sortResults([...searchResults.value, ...fresh], q)
      }
    })
  )

  if (token === searchToken) {
    isLoading.value = false
  }
}

/**
 * 提交搜索：规整关键词、更新历史、同步路由并触发搜索。
 */
function submitSearch() {
  const trimmed = searchQuery.value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return
  searchQuery.value = trimmed
  showSuggestions.value = false
  addHistory(trimmed)
  router.push({ path: '/search', query: { q: trimmed } })
  fetchResults(trimmed)
}

/** 点击历史词直接搜索 */
function searchFromHistory(item) {
  searchQuery.value = item
  router.push({ path: '/search', query: { q: item } })
}

// 路由中的 q 变化时同步搜索（支持从外部/链接进入）
watch(
  () => route.query.q,
  (q) => {
    if (q) {
      searchQuery.value = String(q)
      showSuggestions.value = false
      addHistory(String(q))
      fetchResults(String(q))
    } else {
      showResults.value = false
      searchResults.value = []
    }
  },
  { immediate: true }
)

// 聚合结果：将同名同年的「单集=电影/多集=剧集」条目按来源合并为一组
const aggregatedResults = computed(() => {
  const map = new Map()
  searchResults.value.forEach((item) => {
    const key = `${item.title.replaceAll(' ', '')}-${item.year || 'unknown'}-${
      item.episodes === 1 ? 'movie' : 'tv'
    }`
    const arr = map.get(key) || []
    arr.push(item)
    map.set(key, arr)
  })
  const q = searchQuery.value.trim().replaceAll(' ', '')
  // 按标题是否包含关键词、年份倒序排序
  return Array.from(map.entries()).sort((a, b) => {
    const aExact = a[1][0].title.replaceAll(' ', '').includes(q)
    const bExact = b[1][0].title.replaceAll(' ', '').includes(q)
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    if (a[1][0].year === b[1][0].year) return a[0].localeCompare(b[0])
    return a[1][0].year > b[1][0].year ? -1 : 1
  })
})

/** 滚动时控制返回顶部按钮显隐 */
function onScroll() {
  showBackToTop.value = (window.scrollY || document.documentElement.scrollTop) > 300
}
/** 平滑滚动回顶部 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 点击输入框外部时收起联想下拉 */
function onClickOutside(e) {
  if (inputRef.value && !inputRef.value.contains(e.target)) {
    showSuggestions.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('mousedown', onClickOutside)
  await nextTick()
  if (!route.query.q) inputRef.value?.focus?.() // 无初始查询时聚焦输入框
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div class="search-page">
    <form class="search-form" @submit.prevent="submitSearch">
      <div class="search-box">
        <el-icon class="search-icon" :size="18"><Search /></el-icon>
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索电影、电视剧..."
          @input="onInput"
          @focus="onFocus"
        />

        <div v-if="showSuggestions && suggestions.length" class="suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            type="button"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(s)"
          >
            <el-icon :size="14"><Search /></el-icon>
            <span>{{ s }}</span>
          </button>
        </div>
      </div>
    </form>

    <div class="search-body">
      <div v-if="isLoading && searchResults.length === 0" class="loading">
        <span class="spinner" />
      </div>

      <section v-else-if="showResults" class="result-section">
        <div class="result-head">
          <h2>
            搜索结果
            <span v-if="isLoading" class="streaming-hint">
              <span class="spinner mini" />仍在搜索…
            </span>
          </h2>
          <label class="agg-switch">
            <span>聚合</span>
            <el-switch
              :model-value="viewMode === 'agg'"
              size="small"
              @update:model-value="(v) => (viewMode = v ? 'agg' : 'all')"
            />
          </label>
        </div>

        <div :key="`results-${viewMode}`" class="result-grid">
          <template v-if="viewMode === 'agg'">
            <VideoCard
              v-for="[key, group] in aggregatedResults"
              :key="`agg-${key}`"
              :id="group[0].id"
              :title="group[0].title"
              :poster="group[0].poster"
              :year="group[0].year"
              :source="group[0].source"
              :source_name="group.length > 1 ? `${group.length} 个源` : group[0].source_name"
              :episodes="group[0].episodes"
              from="search"
            />
          </template>
          <template v-else>
            <VideoCard
              v-for="item in searchResults"
              :key="`all-${item.source}-${item.id}`"
              :id="item.id"
              :title="item.title"
              :poster="item.poster"
              :year="item.year"
              :source="item.source"
              :source_name="item.source_name"
              :episodes="item.episodes"
              :douban_id="item.douban_id"
              from="search"
            />
          </template>

          <div v-if="searchResults.length === 0 && !isLoading" class="empty">
            未找到相关结果
          </div>
        </div>
      </section>

      <section v-else-if="searchHistory.length > 0" class="history-section">
        <h2>
          搜索历史
          <button class="clear-btn" @click="clearHistory">清空</button>
        </h2>
        <div class="history-list">
          <div v-for="item in searchHistory" :key="item" class="history-chip">
            <button class="chip-btn" @click="searchFromHistory(item)">{{ item }}</button>
            <button class="chip-del" aria-label="删除搜索历史" @click.stop="deleteHistory(item)">
              <el-icon :size="10"><Close /></el-icon>
            </button>
          </div>
        </div>
      </section>
    </div>

    <button
      class="back-to-top"
      :class="{ visible: showBackToTop }"
      aria-label="返回顶部"
      @click="scrollToTop"
    >
      <el-icon :size="22"><Top /></el-icon>
    </button>
  </div>
</template>

<style scoped lang="scss">
.search-page {
  padding: 16px;

  @media (min-width: 640px) {
    padding: 32px 40px;
  }
}

.search-form {
  max-width: 672px;
  margin: 0 auto 32px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  z-index: 1;
}

.search-input {
  width: 100%;
  height: 48px;
  padding: 12px 16px 12px 40px;
  font-size: 14px;
  color: var(--text);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--text-secondary);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-soft);
  }
}

.suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 6px;
}

.suggestion-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 9px 10px;
  font-size: 14px;
  color: var(--text);
  border-radius: 8px;
  text-align: left;

  .el-icon {
    color: var(--text-secondary);
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--primary);
  }
}

.search-body {
  max-width: 95%;
  margin: 24px auto 40px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
}

.spinner {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid transparent;
  border-bottom-color: var(--primary);
  animation: spin 0.8s linear infinite;

  &.mini {
    width: 14px;
    height: 14px;
    display: inline-block;
  }
}

.streaming-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }
}

.agg-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  span {
    font-size: 14px;
    color: var(--text);
  }
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 56px 8px;
  justify-items: center;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 80px 32px;
  }
}

.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-secondary);
  padding: 32px 0;
  font-size: 14px;
}

.history-section {
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 16px;
  }
}

.clear-btn {
  margin-left: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  transition: color 0.2s ease;

  &:hover {
    color: #ef4444;
  }
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-chip {
  position: relative;

  &:hover .chip-del {
    opacity: 1;
  }
}

.chip-btn {
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--text);
  background: var(--skeleton);
  border-radius: 999px;
  transition: background 0.2s ease;

  &:hover {
    background: var(--bg-hover);
  }
}

.chip-del {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 999px;
  background: var(--text-secondary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background: #ef4444;
  }
}

.back-to-top {
  position: fixed;
  right: 24px;
  bottom: 80px;
  z-index: 500;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: all 0.3s ease;

  @media (min-width: 768px) {
    bottom: 24px;
  }

  &.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  &:hover {
    background: var(--primary-hover);
  }
}
</style>
