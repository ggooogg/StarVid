<!-- 主题切换按钮（太阳/月亮） -->
<script setup>
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settings'

// 设置 store：提供当前主题与切换方法
const settings = useSettingsStore()
</script>

<template>
  <el-button
    class="icon-btn"
    text
    circle
    :aria-label="settings.theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'"
    @click="settings.toggleTheme()"
  >
    <el-icon :size="20">
      <component :is="settings.theme === 'dark' ? Sunny : Moon" />
    </el-icon>
  </el-button>
</template>

<style scoped lang="scss">
.icon-btn {
  color: var(--text-secondary);

  &:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
}
</style>
