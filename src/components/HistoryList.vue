<!-- 观看历史：row 横向 / grid 网格，支持续播、删除、清空 -->
<script setup>
import { useRouter } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'
import ScrollableRow from './ScrollableRow.vue'
import VideoCard from './VideoCard.vue'
import { onMounted, onActivated } from 'vue'
import { useHistoryStore } from '../stores/history'

const props = defineProps({
  variant: { type: String, default: 'grid' }, // 展示形态：'row' 横向 / 'grid' 网格
})

const router = useRouter()
const history = useHistoryStore()

// 组件挂载及被 keep-alive 激活时刷新历史记录
onMounted(history.refresh)
onActivated(history.refresh)

/**
 * 继续观看：跳转到播放页并携带来源、ID 与标题。
 * @param {Object} rec 历史记录项
 */
function resume(rec) {
  router.push(
    `/play?source=${encodeURIComponent(rec.source)}&id=${encodeURIComponent(
      rec.id
    )}&title=${encodeURIComponent(rec.title)}`
  )
}
</script>

<template>
  <div class="history-list">
    <template v-if="history.records.length">
      <div class="section-head">
        <h2>{{ variant === 'row' ? '继续观看' : '观看历史' }}</h2>
        <button class="clear-btn" @click="history.clearAll()">清空</button>
      </div>

      <ScrollableRow v-if="variant === 'row'">
        <VideoCard
          v-for="rec in history.records"
          :key="rec.key"
          :id="rec.id"
          :source="rec.source"
          :title="rec.title"
          :poster="rec.cover"
          :year="rec.year"
          :source_name="rec.source_name"
          :episodes="rec.total_episodes"
          :currentEpisode="rec.index"
          :progress="rec.total_time ? Math.round((rec.play_time / rec.total_time) * 100) : 0"
          from="history"
          @remove="history.remove($event.source, $event.id)"
        />
      </ScrollableRow>

      <div v-else class="history-grid">
        <div v-for="rec in history.records" :key="rec.key" class="history-item">
          <VideoCard
            :id="rec.id"
            :source="rec.source"
            :title="rec.title"
            :poster="rec.cover"
            :year="rec.year"
            :source_name="rec.source_name"
            :episodes="rec.total_episodes"
            :currentEpisode="rec.index"
            :progress="rec.total_time ? Math.round((rec.play_time / rec.total_time) * 100) : 0"
            from="history"
            @remove="history.remove($event.source, $event.id)"
          />

          <button class="resume-btn" @click="resume(rec)">
            <el-icon :size="16"><Clock /></el-icon>
            继续观看
          </button>
        </div>
      </div>
    </template>

    <div v-else-if="variant === 'grid'" class="empty">
      <el-icon :size="40"><Clock /></el-icon>
      <p>暂无观看记录</p>
      <span>开始观看后，这里会记录你的进度</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
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

.clear-btn {
  font-size: 13px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: #ef4444;
  }
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 8px;
  padding: 0 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 24px 32px;
  }
}

.history-item {
  position: relative;

  &:hover .resume-btn {
    opacity: 1;
    transform: none;
  }
}

.resume-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-6px);
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);

  &:hover {
    background: var(--primary-hover);
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 0;
  color: var(--text-secondary);

  p {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  span {
    font-size: 13px;
  }
}
</style>
