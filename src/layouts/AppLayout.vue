<!-- 整体布局：桌面端侧边栏+顶栏，移动端底部导航 -->
<script setup>
import SideMenu from '../components/SideMenu.vue'
import TopBar from '../components/TopBar.vue'
import { useUiStore } from '../stores/ui'

// UI store：用于控制设置抽屉的打开
const ui = useUiStore()
</script>

<template>
  <div class="app-layout">
    <SideMenu class="app-sidebar" />

    <div class="app-main">
      <TopBar />
      <main class="app-content">
        <slot />
      </main>
    </div>

    <nav class="app-bottom-nav">
      <router-link to="/" class="bottom-item" exact-active-class="active">
        <el-icon><House /></el-icon>
        <span>首页</span>
      </router-link>
      <router-link to="/search" class="bottom-item" active-class="active">
        <el-icon><Search /></el-icon>
        <span>搜索</span>
      </router-link>
      <router-link to="/favorites" class="bottom-item" active-class="active">
        <el-icon><Star /></el-icon>
        <span>收藏</span>
      </router-link>
      <router-link to="/history" class="bottom-item" active-class="active">
        <el-icon><Clock /></el-icon>
        <span>历史</span>
      </router-link>
      <button class="bottom-item" @click="ui.openSettings()">
        <el-icon><Setting /></el-icon>
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

      .el-icon {
        font-size: 20px;
      }

      &.active,
      &:hover {
        color: var(--primary);
      }
    }
  }
}
</style>
