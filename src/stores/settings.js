/**
 * 全局设置 store（主题、豆瓣数据/图片代理、优化/热门/广告过滤，均与 localStorage 同步）。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  DOUBAN_DATA_PROXIES,
  DOUBAN_IMAGE_PROXIES,
  DEFAULT_DOUBAN_DATA_PROXY,
  DEFAULT_DOUBAN_IMAGE_PROXY,
} from '../lib/doubanProxies'

// 创建与 localStorage 同步的下拉选项 ref：非法历史值自动回退默认值。
function usePersistedOption(key, options, defaultValue) {
  const valid = options.map((p) => p.value)
  let stored = localStorage.getItem(key)
  if (stored && !valid.includes(stored)) stored = null
  const state = ref(stored || defaultValue)
  // 立即写回，保证直接读 localStorage 的辅助函数取值一致
  localStorage.setItem(key, state.value)
  watch(state, (v) => localStorage.setItem(key, v))
  return state
}

// 创建与 localStorage 同步的文本 ref（自定义代理地址等）。
function usePersistedText(key) {
  const state = ref(localStorage.getItem(key) || '')
  watch(state, (v) => localStorage.setItem(key, v.trim()))
  return state
}

export const useSettingsStore = defineStore('settings', () => {
  // 首次运行做主题迁移，默认浅色
  if (!localStorage.getItem('starvid_theme_migrated')) {
    localStorage.setItem('starvid_theme_migrated', '1')
    localStorage.setItem('theme', 'light')
  }
  const theme = ref(localStorage.getItem('theme') || 'light')

  // 豆瓣数据代理（默认云函数；开发环境云函数自动回退本地 /proxy/）
  const doubanProxyType = usePersistedOption(
    'doubanProxyType',
    DOUBAN_DATA_PROXIES,
    DEFAULT_DOUBAN_DATA_PROXY
  )
  const doubanProxyUrl = usePersistedText('doubanProxyUrl')

  // 豆瓣图片代理（默认腾讯云 CDN）
  const doubanImageProxyType = usePersistedOption(
    'doubanImageProxyType',
    DOUBAN_IMAGE_PROXIES,
    DEFAULT_DOUBAN_IMAGE_PROXY
  )
  const doubanImageProxyUrl = usePersistedText('doubanImageProxyUrl')

  const optimization = ref(localStorage.getItem('enableOptimization') !== 'false')
  const doubanHot = ref(localStorage.getItem('doubanToggle') !== 'false')
  const adFilter = ref(localStorage.getItem('adFilter') !== 'false')

  // 主题变化：持久化并切换根元素 dark 类
  watch(
    theme,
    (v) => {
      localStorage.setItem('theme', v)
      document.documentElement.classList.toggle('dark', v === 'dark')
    },
    { immediate: true }
  )

  watch(optimization, (v) => localStorage.setItem('enableOptimization', String(v)))
  watch(doubanHot, (v) => localStorage.setItem('doubanToggle', String(v)))
  watch(adFilter, (v) => localStorage.setItem('adFilter', String(v)))

  // 浅色/深色主题切换
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return {
    theme,
    doubanProxyType,
    doubanProxyUrl,
    doubanImageProxyType,
    doubanImageProxyUrl,
    optimization,
    doubanHot,
    adFilter,
    toggleTheme,
  }
})
