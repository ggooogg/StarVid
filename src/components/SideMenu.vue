<!-- 桌面端侧边导航菜单，高亮当前页 -->
<script setup>
import { useRoute } from 'vue-router'
import { Star, Film, Monitor, Coffee, Microphone, Compass, Search, Clock } from '@element-plus/icons-vue'

const route = useRoute()

// 导航菜单项：label(名称)、icon(图标)、to(目标路由)
const menuItems = [
  { label: '首页', icon: Compass, to: '/' },
  { label: '搜索', icon: Search, to: '/search' },
  { label: '收藏', icon: Star, to: '/favorites' },
  { label: '历史', icon: Clock, to: '/history' },
  { label: '电影', icon: Film, to: '/douban?type=movie' },
  { label: '剧集', icon: Monitor, to: '/douban?type=tv' },
  { label: '动漫', icon: Coffee, to: '/douban?type=anime' },
  { label: '综艺', icon: Microphone, to: '/douban?type=show' },
]

/**
 * 判断菜单项是否为当前激活项（豆瓣页需同时匹配 path 与 type 查询参数）。
 * @param {Object} item 菜单项
 * @returns {boolean}
 */
function isActive(item) {
  const [path, queryStr] = item.to.split('?')
  if (route.path !== path) return false
  if (!queryStr) return true
  const type = new URLSearchParams(queryStr).get('type')
  return String(route.query.type || '') === type
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
        <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <span class="text-secondary">v0.0.0</span>
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
    font-size: 18px;
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
  padding: 12px 14px;
  font-size: 12px;

  .text-secondary {
    color: var(--text-secondary);
  }
}
</style>
