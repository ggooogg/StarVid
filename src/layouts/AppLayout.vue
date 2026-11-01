<!-- 整体布局：桌面端侧边栏 + 顶栏，移动端底部导航 -->
<script setup>
import SideMenu from '../components/SideMenu.vue'
import TopBar from '../components/TopBar.vue'
import NoticeBar from '../components/NoticeBar.vue'
import Icon from '../components/ui/Icon.vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const ui = useUiStore()

const bottomNav = [
  { label: '首页', icon: 'house', to: '/' },
  { label: '搜索', icon: 'search', to: '/search' },
  { label: '收藏', icon: 'star', to: '/favorites' },
  { label: '历史', icon: 'clock', to: '/history' },
]
</script>

<template>
  <div class="app-layout">
    <SideMenu class="app-sidebar" />

    <div class="app-main">
      <TopBar />
      <NoticeBar />
      <main class="app-content">
        <slot />
      </main>
    </div>

    <nav class="app-bottom-nav">
      <router-link
        v-for="item in bottomNav"
        :key="item.label"
        :to="item.to"
        class="bottom-item"
        :class="{ active: route.path === item.to }"
      >
        <Icon :name="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </router-link>
      <button class="bottom-item" @click="ui.openSettings()">
        <Icon name="setting" :size="20" />
        <span>设置</span>
      </button>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  padding-bottom: calc(3.5rem + env(safe-area-inset-bottom));
}

.app-bottom-nav {
  display: none;
}

@media (max-width: 767px) {
  .app-sidebar {
    display: none;
  }

  .app-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    height: calc(3.5rem + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(12px);

    .bottom-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 11px;

      &.active,
      &:hover {
        color: var(--primary);
      }
    }
  }
}
</style>
