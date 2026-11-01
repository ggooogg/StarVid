<!-- 桌面端侧边导航 -->
<script setup>
import { useRoute } from 'vue-router'
import Icon from './ui/Icon.vue'

const route = useRoute()

const menuItems = [
  { label: '首页', icon: 'compass', to: '/' },
  { label: '搜索', icon: 'search', to: '/search' },
  { label: '收藏', icon: 'star', to: '/favorites' },
  { label: '历史', icon: 'clock', to: '/history' },
  { label: '电影', icon: 'film', to: '/douban?type=movie', type: 'movie' },
  { label: '剧集', icon: 'monitor', to: '/douban?type=tv', type: 'tv' },
  { label: '动漫', icon: 'coffee', to: '/douban?type=anime', type: 'anime' },
  { label: '综艺', icon: 'microphone', to: '/douban?type=show', type: 'show' },
]

// 豆瓣页需同时匹配路径与 type 参数，其余按路径匹配
function isActive(item) {
  const path = item.to.split('?')[0]
  if (route.path !== path) return false
  return item.type ? route.query.type === item.type : true
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <span class="gradient-text">StarVid</span>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.label"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item) }"
      >
        <Icon :name="item.icon" :size="18" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/disclaimer" class="footer-link">
        <Icon name="alert" :size="13" />
        <span>免责声明</span>
      </router-link>
      <span class="ver">v0.0.0</span>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  width: 220px;
  height: 100vh;
  background: var(--bg-sidebar);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 12px;
  box-shadow: var(--shadow);
}

.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  user-select: none;
}

.sidebar-nav {
  flex: 1;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: pointer;

  .nav-icon {
    color: var(--text-secondary);
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--primary);
  }

  &.active {
    background: var(--primary-soft);
    color: var(--primary);

    .nav-icon {
      color: var(--primary);
    }
  }
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 12px 10px 4px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary);
    transition: color 0.2s ease;

    &:hover {
      color: var(--primary);
    }
  }

  .ver {
    opacity: 0.65;
  }
}
</style>
