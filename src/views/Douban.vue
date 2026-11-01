<!-- 豆瓣内容页：分类筛选 + 无限滚动列表 -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import DoubanSelector from '../components/DoubanSelector.vue'
import VideoCard from '../components/VideoCard.vue'
import { getDoubanCategories, getDoubanRecommends } from '../lib/douban'

const route = useRoute()

const type = computed(() => String(route.query.type || 'movie')) // 内容类型：movie/tv/anime/show

const pageTitle = computed(() => {
  switch (type.value) {
    case 'movie': return '电影'
    case 'tv': return '剧集'
    case 'anime': return '动漫'
    case 'show': return '综艺'
    default: return '自定义'
  }
})

const primarySelection = ref('') // 一级分类选中值
const secondarySelection = ref('') // 二级分类选中值
const multiLevelValues = ref({ // 多级筛选聚合值
  type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T',
})

// 各内容类型的默认（一级、二级）选中值
function defaultSelections() {
  if (type.value === 'movie') return ['热门', '全部']
  if (type.value === 'tv') return ['最近热门', 'tv']
  if (type.value === 'show') return ['最近热门', 'show']
  if (type.value === 'anime') return ['番剧', '全部']
  return ['', '全部']
}

const doubanData = ref([]) // 当前已加载的豆瓣列表
const loading = ref(true) // 首屏加载态
const currentPage = ref(0) // 已加载页数
const hasMore = ref(true) // 是否还有更多
const isLoadingMore = ref(false) // 加载更多状态
const skeletonData = Array.from({ length: 25 }, (_, i) => i) // 骨架屏占位

let requestSeq = 0 // 请求序号，用于丢弃过期响应
let debounceTimer = null // 筛选变更防抖计时器

// 动漫与「全部」一级走推荐接口，其余走热门分类接口
async function fetchPage(pageStart) {
  const t = type.value
  const primary = primarySelection.value
  const secondary = secondarySelection.value
  const ml = multiLevelValues.value

  if (t === 'anime') {
    return getDoubanRecommends({
      kind: primary === '番剧' ? 'tv' : 'movie',
      pageLimit: 25,
      pageStart,
      category: '动画',
      format: primary === '番剧' ? '电视剧' : '',
      region: ml.region || '',
      year: ml.year || '',
      platform: ml.platform || '',
      sort: ml.sort || '',
      label: ml.label || '',
    })
  }

  if (primary === '全部') {
    return getDoubanRecommends({
      kind: t === 'show' ? 'tv' : t,
      pageLimit: 25,
      pageStart,
      category: ml.type || '',
      format: t === 'show' ? '综艺' : t === 'tv' ? '电视剧' : '',
      region: ml.region || '',
      year: ml.year || '',
      platform: ml.platform || '',
      sort: ml.sort || '',
      label: ml.label || '',
    })
  }

  if (t === 'tv' || t === 'show') {
    return getDoubanCategories({
      kind: 'tv', category: t, type: secondary, pageLimit: 25, pageStart,
    })
  }
  return getDoubanCategories({
    kind: t, category: primary, type: secondary, pageLimit: 25, pageStart,
  })
}

async function loadInitial() {
  const seq = ++requestSeq
  loading.value = true
  doubanData.value = []
  currentPage.value = 0
  hasMore.value = true
  isLoadingMore.value = false

  try {
    const data = await fetchPage(0)
    if (seq !== requestSeq) return
    if (data.code === 200) {
      doubanData.value = data.list
      hasMore.value = data.list.length !== 0
    }
  } catch (err) {
    console.error(err)
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      nextTick(setupObserver)
    }
  }
}

// 追加下一页，requestSeq 变化时丢弃结果
async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return
  const seq = requestSeq
  isLoadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    const data = await fetchPage(nextPage * 25)
    if (seq !== requestSeq) return
    if (data.code === 200) {
      doubanData.value = [...doubanData.value, ...data.list]
      hasMore.value = data.list.length !== 0
      currentPage.value = nextPage
    }
  } catch (err) {
    console.error(err)
  } finally {
    if (seq === requestSeq) isLoadingMore.value = false
  }
}

// 筛选变更后防抖重载
function scheduleLoad() {
  if (debounceTimer) clearTimeout(debounceTimer)
  loading.value = true
  debounceTimer = setTimeout(loadInitial, 100)
}

function onPrimaryChange(v) {
  if (v === primarySelection.value) return
  primarySelection.value = v
  if (type.value === 'tv' && v === '最近热门') secondarySelection.value = 'tv'
  if (type.value === 'show' && v === '最近热门') secondarySelection.value = 'show'
  multiLevelValues.value = {
    type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T',
  }
  scheduleLoad()
}

function onSecondaryChange(v) {
  if (v === secondarySelection.value) return
  secondarySelection.value = v
  scheduleLoad()
}

function onMultiLevelChange(values) {
  if (JSON.stringify(values) === JSON.stringify(multiLevelValues.value)) return
  multiLevelValues.value = values
  scheduleLoad()
}

// 内容类型变化时，重置各级选中值并重新加载
watch(
  type,
  () => {
    const [p, s] = defaultSelections()
    primarySelection.value = p
    secondarySelection.value = s
    multiLevelValues.value = {
      type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T',
    }
    scheduleLoad()
  },
  { immediate: true }
)

const sentinelRef = ref(null) // 无限滚动哨兵元素
let observer = null

// 哨兵进入视口时加载更多
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value && !loading.value) {
        loadMore()
      }
    },
    { threshold: 0.1 }
  )
  observer.observe(sentinelRef.value)
}

onMounted(() => nextTick(setupObserver))
onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (debounceTimer) clearTimeout(debounceTimer)
  requestSeq++ // 使进行中的请求失效
})
</script>

<template>
  <div class="douban-page">
    <div class="page-head">
      <h1>{{ pageTitle }}</h1>
      <p>来自豆瓣的精选内容</p>
    </div>

    <div class="selector-card">
      <DoubanSelector
        :type="type"
        :primary-selection="primarySelection"
        :secondary-selection="secondarySelection"
        @primary-change="onPrimaryChange"
        @secondary-change="onSecondaryChange"
        @multi-level-change="onMultiLevelChange"
      />
    </div>

    <div class="grid-wrap">
      <div class="card-grid">
        <template v-if="loading">
          <div v-for="n in skeletonData" :key="`sk-${n}`" class="skeleton-card">
            <div class="skeleton-poster" />
            <div class="skeleton-line" />
          </div>
        </template>
        <template v-else>
          <VideoCard
            v-for="(item, i) in doubanData"
            :key="`${item.title}-${i}`"
            :id="item.id"
            :title="item.title"
            :poster="item.poster"
            :rate="item.rate"
            :year="item.year"
            :douban_id="item.id"
            :type="item.type"
            from="douban"
            class="grid-card"
          />
        </template>
      </div>

      <div v-if="hasMore && !loading" ref="sentinelRef" class="load-more">
        <template v-if="isLoadingMore">
          <span class="spinner" />
          <span>加载中...</span>
        </template>
      </div>

      <div v-if="!hasMore && doubanData.length > 0" class="tip">已加载全部内容</div>
      <div v-if="!loading && doubanData.length === 0" class="tip">暂无相关内容</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.douban-page {
  padding: 16px;

  @media (min-width: 640px) {
    padding: 32px 40px;
  }
}

.page-head {
  margin-bottom: 20px;

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 4px;

    @media (min-width: 640px) {
      font-size: 30px;
    }
  }

  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.selector-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(8px);
  margin-bottom: 24px;

  @media (min-width: 640px) {
    padding: 20px 24px;
  }
}

.grid-wrap {
  max-width: 95%;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  justify-items: center;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 32px 16px;
  }
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
  padding: 32px 0;
  color: var(--text-secondary);
  font-size: 14px;
  min-height: 40px;
}

.spinner {
  width: 22px;
  height: 22px;
}

.tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 32px 0;
}
</style>
