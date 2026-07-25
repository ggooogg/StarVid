/**
 * 全局 UI 状态（控制设置抽屉显隐）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const settingsOpen = ref(false)

  function openSettings() {
    settingsOpen.value = true
  }
  function closeSettings() {
    settingsOpen.value = false
  }

  return { settingsOpen, openSettings, closeSettings }
})
