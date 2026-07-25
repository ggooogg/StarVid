<!-- 首页：首页/收藏夹切换 + 继续观看 + 豆瓣热门分区 -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import CapsuleSwitch from '../components/CapsuleSwitch.vue'
import ScrollableRow from '../components/ScrollableRow.vue'
import VideoCard from '../components/VideoCard.vue'
import HistoryList from '../components/HistoryList.vue'
import FavoritesList from '../components/FavoritesList.vue'
import { getDoubanCategories } from '../lib/douban'

const tab = ref('home') // 当前顶部标签：home / favorites
const loading = ref(true) // 首页分区数据加载态

// 三个豆瓣热门分区的数据
const hotMovies = ref([])
const hotTv = ref([])
const hotVariety = ref([])

let requestSeq = 0 // 请求序号，用于忽略过期的并发响应

/**
 * 拉取单个豆瓣热门分区数据。
 * @param {string} kind movie/tv
 * @param {string} category 分类（如「热门」/tv/show）
 * @param {string} type 类型（如 全部/tv/show）
 * @returns {Promise<Array>} 影视列表
 */
async function fetchSection(kind, category, type) {
  const res = await getDoubanCategories({ kind, category, type, pageLimit: 20, pageStart: 0 })
  return res.code === 200 ? res.list : []
}

onMounted(async () => {
  const seq = ++requestSeq
  loading.value = true
  try {
    // 并发拉取电影、剧集、综艺三个分区
    const [m, tv, v] = await Promise.all([
      fetchSection('movie', '热门', '全部'),
      fetchSection('tv', 'tv', 'tv'),
      fetchSection('tv', 'show', 'show'),
    ])
    if (seq !== requestSeq) return // 已有更新的请求，丢弃本次结果
    hotMovies.value = m
    hotTv.value = tv
    hotVariety.value = v
  } catch (err) {
    console.error('获取首页推荐数据失败:', err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
})

// 组装首页分区配置（标题、查看更多路由、数据）
const sections = computed(() => [
  { title: '热门电影', more: '/douban?type=movie', data: hotMovies.value },
  { title: '热门剧集', more: '/douban?type=tv', data: hotTv.value },
  { title: '热门综艺', more: '/douban?type=show', data: hotVariety.value },
])
</script>

<template>
  <div class="home">
    <div class="tab-wrap">
      <CapsuleSwitch
        :options="[
          { label: '首页', value: 'home' },
          { label: '收藏夹', value: 'favorites' },
        ]"
        v-model="tab"
      />
    </div>

    <div class="home-body">
      <section v-if="tab === 'favorites'" class="fav-view">
        <FavoritesList />
      </section>

      <template v-else>
        <HistoryList variant="row" />

        <section v-for="s in sections" :key="s.title" class="row-section">
          <div class="section-head">
            <h2>{{ s.title }}</h2>
            <router-link :to="s.more" class="more">
              查看更多 <el-icon :size="14"><ArrowRight /></el-icon>
            </router-link>
          </div>
          <ScrollableRow>
            <template v-if="loading">
              <div v-for="n in 8" :key="n" class="skeleton-card">
                <div class="skeleton-poster" />
                <div class="skeleton-line" />
              </div>
            </template>
            <template v-else>
              <VideoCard
                v-for="item in s.data"
                :key="item.id"
                :id="item.id"
                :title="item.title"
                :poster="item.poster"
                :rate="item.rate"
                :year="item.year"
                :type="item.type"
                :douban_id="item.douban_id"
                from="douban"
              />
            </template>
          </ScrollableRow>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home {
  padding: 16px 0 24px;
}

.tab-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.home-body {
  max-width: 95%;
  margin: 0 auto;
}

.row-section {
  margin-bottom: 32px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 16px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }
}

.more {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);

  &:hover {
    color: var(--text);
  }
}

.fav-view {
  max-width: 95%;
  margin: 0 auto;
}

.skeleton-card {
  flex-shrink: 0;
  width: 96px;

  @media (min-width: 768px) {
    width: 176px;
  }
}

.skeleton-poster {
  aspect-ratio: 2 / 3;
  border-radius: 10px;
  background: var(--skeleton);
  animation: pulse 1.4s infinite;
}

.skeleton-line {
  margin-top: 8px;
  height: 14px;
  border-radius: 4px;
  background: var(--skeleton);
  animation: pulse 1.4s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
