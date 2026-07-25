<!-- 顶部栏：移动端标题 + 主题切换 + 设置入口 -->
<script setup>
import ThemeToggle from './ThemeToggle.vue'
import { useUiStore } from '../stores/ui'

// UI store：用于打开设置抽屉
const ui = useUiStore()
</script>

<template>
  <header class="top-bar">
    <div class="top-title mobil-only gradient-text">StarVid</div>

    <div class="top-actions">
      <ThemeToggle />
      <el-button
        class="icon-btn"
        text
        circle
        aria-label="设置"
        @click="ui.openSettings()"
      >
        <el-icon :size="20"><Setting /></el-icon>
      </el-button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: var(--bg-sidebar);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.top-title {
  font-size: 18px;
  font-weight: 800;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.icon-btn {
  color: var(--text-secondary);

  &:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
}

.mobil-only {
  display: none;
}

@media (max-width: 767px) {
  .mobil-only {
    display: block;
  }
}
</style>
