/**
 * 收藏夹 store（自动同步到 localStorage）。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref(JSON.parse(localStorage.getItem('starvid_favorites') || '[]'))

  watch(
    items,
    (v) => localStorage.setItem('starvid_favorites', JSON.stringify(v)),
    { deep: true }
  )

  // 是否已收藏
  function isFav(id) {
    return items.value.some((f) => f.id === id)
  }

  // 切换收藏：已收藏则移除，否则添加到列表首部（记录收藏时间）
  function toggle(fav) {
    const idx = items.value.findIndex((f) => f.id === fav.id)
    if (idx >= 0) {
      items.value.splice(idx, 1)
    } else {
      items.value.unshift({ ...fav, save_time: Date.now() })
    }
    return !items.value.some((f) => f.id === fav.id)
  }

  // 清空全部收藏
  function clearAll() {
    items.value = []
  }

  return { items, isFav, toggle, clearAll }
})
