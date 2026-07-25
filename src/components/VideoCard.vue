<!-- 影片卡片：海报/评分/进度，收藏/删除，按来源跳转 -->
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { VideoPlay, Link, Star, Delete } from '@element-plus/icons-vue'
import { useFavoritesStore } from '../stores/favorites'
import { processImageUrl } from '../lib/imageProxy'

const props = defineProps({
  id: { type: String, default: '' },
  title: { type: String, default: '' },
  poster: { type: String, default: '' },
  rate: { type: [String, Number], default: '' },
  year: { type: String, default: '' },
  source: { type: String, default: '' },
  source_name: { type: String, default: '' },
  douban_id: { type: [String, Number], default: '' },
  type: { type: String, default: '' },
  episodes: { type: Number, default: 0 },
  currentEpisode: { type: Number, default: 0 },
  from: { type: String, default: 'douban' },
  progress: { type: Number, default: 0 },
})

const emit = defineEmits(['remove'])

const router = useRouter()
const favStore = useFavoritesStore()
const faved = computed(() => (props.id ? favStore.isFav(props.id) : false)) // 是否已收藏
const loaded = ref(false) // 海报是否加载完成（控制骨架屏）

/**
 * 删除按钮回调：阻止冒泡并向父组件上抛 remove 事件（用于删除历史记录）。
 * @param {MouseEvent} e
 */
function onRemove(e) {
  e.stopPropagation()
  if (!props.id) return
  emit('remove', { source: props.source, id: props.id })
}

// 经代理处理后的海报地址
const posterUrl = computed(() => processImageUrl(props.poster))

/**
 * 点击卡片跳转播放页。
 * 豆瓣来源按标题+类型搜索播放；其余来源直接按来源与 ID 播放。
 */
function onClick() {
  if (props.from === 'douban') {
    const stype = props.type === 'tv' ? 'tv' : 'movie'
    router.push(`/play?title=${encodeURIComponent(props.title)}&stype=${stype}`)
  } else if (props.id) {
    router.push(`/play?source=${props.source}&id=${props.id}&title=${encodeURIComponent(props.title)}`)
  }
}

/**
 * 切换收藏状态：阻止冒泡后调用收藏 store 的 toggle。
 * @param {MouseEvent} e
 */
function toggleFav(e) {
  e.stopPropagation()
  if (!props.id) return
  favStore.toggle({
    id: props.id,
    title: props.title,
    poster: props.poster,
    year: props.year,
    source: props.source,
    source_name: props.source_name,
    total_episodes: props.episodes || 1,
  })
}
</script>

<template>
  <div class="video-card" @click="onClick">
    <div class="poster">
      <div v-if="!loaded" class="skeleton" />
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :alt="title"
        referrerpolicy="no-referrer"
        loading="lazy"
        @load="loaded = true"
      />

      <div class="overlay" />

      <div class="play-btn">
        <el-icon :size="48"><VideoPlay /></el-icon>
      </div>

      <div v-if="from === 'history'" class="card-actions">
        <button class="action" @click="onRemove">
          <el-icon :size="18"><Delete /></el-icon>
        </button>
      </div>

      <div v-else-if="from !== 'douban'" class="card-actions">
        <button class="action" :class="{ faved }" @click="toggleFav">
          <el-icon :size="18"><Star /></el-icon>
        </button>
      </div>

      <div v-if="from === 'history' && progress > 0" class="progress">
        <div class="progress-fill" :style="{ width: Math.min(100, progress) + '%' }" />
      </div>

      <div v-if="rate" class="badge rate">{{ rate }}</div>

      <div v-if="episodes > 1" class="badge eps">
        {{ currentEpisode ? `${currentEpisode}/${episodes}` : episodes }}
      </div>

      <a
        v-if="from === 'douban' && douban_id"
        class="badge douban"
        :href="`https://movie.douban.com/subject/${douban_id}`"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        <el-icon :size="14"><Link /></el-icon>
      </a>
    </div>

    <div class="meta">
      <div class="title" :title="title">{{ title }}</div>
      <div v-if="source_name && from !== 'douban'" class="source">{{ source_name }}</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-card {
  flex-shrink: 0;
  width: 96px;
  cursor: pointer;
  transition: transform 0.3s ease;

  @media (min-width: 768px) {
    width: 176px;
  }

  &:hover {
    transform: scale(1.05);
    z-index: 5;
  }
}

.poster {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: var(--skeleton);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--skeleton) 25%, var(--bg-hover) 50%, var(--skeleton) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.05) 50%, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.play-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;

  &:hover :deep(svg) {
    color: var(--primary);
  }
}

.card-actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.3s ease;
}

@media (hover: none), (max-width: 767px) {
  .card-actions {
    opacity: 1;
    transform: none;
  }
}

.action {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: #f87171;
  }

  &.faved {
    color: #f43f5e;
  }
}

.badge {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  z-index: 2;
}

.rate {
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #ec4899;
}

.eps {
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--primary);
  font-size: 12px;
}

.douban {
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--primary);
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
}

.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.45);
  z-index: 3;

  .progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 0 2px 2px 0;
  }
}

.video-card:hover {
  .overlay,
  .play-btn,
  .card-actions {
    opacity: 1;
    transform: none;
  }

  .douban {
    opacity: 1;
    transform: none;
  }
}

.meta {
  margin-top: 8px;
  text-align: center;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source {
  margin-top: 2px;
  display: inline-block;
  font-size: 11px;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 8px;
}
</style>
