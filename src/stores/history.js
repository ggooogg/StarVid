/**
 * 观看历史 store（从 localStorage 整理为按时间倒序的列表）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAllPlayRecords, deletePlayRecord } from '../lib/playRecords'

export const useHistoryStore = defineStore('history', () => {
  const records = ref([])

  // 刷新历史列表：拆分 `source+id` 键并按保存时间倒序
  function refresh() {
    const all = getAllPlayRecords() || {}
    records.value = Object.entries(all)
      .map(([key, rec]) => {
        const idx = key.indexOf('+')
        const source = idx >= 0 ? key.slice(0, idx) : key
        const id = idx >= 0 ? key.slice(idx + 1) : ''
        return { key, source, id, ...rec }
      })
      .sort((a, b) => (b.save_time || 0) - (a.save_time || 0))
  }

  // 删除单条并刷新
  function remove(source, id) {
    deletePlayRecord(source, id)
    refresh()
  }

  // 清空全部
  function clearAll() {
    records.value.forEach((r) => deletePlayRecord(r.source, r.id))
    records.value = []
  }

  return { records, refresh, remove, clearAll }
})
