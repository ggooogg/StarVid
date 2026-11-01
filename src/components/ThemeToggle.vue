<!-- 主题切换按钮（太阳/月亮） -->
<script setup>
import { computed } from 'vue'
import Icon from './ui/Icon.vue'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()

const isDark = computed(() => settings.theme === 'dark')
</script>

<template>
  <button
    class="ui-btn icon"
    :aria-label="isDark ? '切换到白天模式' : '切换到夜间模式'"
    @click="settings.toggleTheme()"
  >
    <Icon :name="isDark ? 'sunny' : 'moon'" :size="20" />
  </button>
</template>
