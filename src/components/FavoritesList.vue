<!-- 收藏列表：网格展示 VideoCard，支持清空 -->
<script setup>
import VideoCard from './VideoCard.vue'
import { useFavoritesStore } from '../stores/favorites'

// 收藏 store：提供收藏列表与清空方法
const favStore = useFavoritesStore()
</script>

<template>
  <div class="fav-list">
    <div class="section-head">
      <h2>我的收藏</h2>
      <button v-if="favStore.items.length" class="clear-btn" @click="favStore.clearAll()">
        清空
      </button>
    </div>

    <div v-if="favStore.items.length" class="fav-grid">
      <VideoCard
        v-for="item in favStore.items"
        :key="item.id"
        :id="item.id"
        :title="item.title"
        :poster="item.poster"
        :year="item.year"
        :source="item.source"
        :source_name="item.source_name"
        :episodes="item.total_episodes"
        from="favorite"
      />
    </div>
    <div v-else class="empty">暂无收藏内容</div>
  </div>
</template>

<style scoped lang="scss">
.fav-list {
  max-width: 95%;
  margin: 0 auto;
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

.clear-btn {
  font-size: 13px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--text);
  }
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 8px;
  padding: 0 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 16px 32px;
  }
}

.empty {
  text-align: center;
  padding: 32px 0;
  color: var(--text-secondary);
}
</style>
