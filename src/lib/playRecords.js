/**
 * 播放记录与跳过片头片尾配置的本地存储（键以 `source+id` 唯一标识影片）。 */

const RECORDS_KEY = 'starvid_play_records'
const SKIP_KEY = 'starvid_skip_configs'

// 影片唯一存储键：source+id
export function generateStorageKey(source, id) {
  return `${source}+${id}`
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {}
  } catch (e) {
    return {}
  }
}

function writeJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj))
}

export function getAllPlayRecords() {
  return readJSON(RECORDS_KEY)
}

// 保存/更新播放记录。
export function savePlayRecord(source, id, record) {
  const all = readJSON(RECORDS_KEY)
  all[generateStorageKey(source, id)] = record
  writeJSON(RECORDS_KEY, all)
}

// 获取播放记录（不存在返回 null）。
export function getPlayRecord(source, id) {
  return readJSON(RECORDS_KEY)[generateStorageKey(source, id)] || null
}

// 删除播放记录。
export function deletePlayRecord(source, id) {
  const all = readJSON(RECORDS_KEY)
  delete all[generateStorageKey(source, id)]
  writeJSON(RECORDS_KEY, all)
}

// 获取跳过片头片尾配置（不存在返回 null）。
export function getSkipConfig(source, id) {
  return readJSON(SKIP_KEY)[generateStorageKey(source, id)] || null
}

// 保存/更新跳过配置。
export function saveSkipConfig(source, id, config) {
  const all = readJSON(SKIP_KEY)
  all[generateStorageKey(source, id)] = config
  writeJSON(SKIP_KEY, all)
}

// 删除跳过配置。
export function deleteSkipConfig(source, id) {
  const all = readJSON(SKIP_KEY)
  delete all[generateStorageKey(source, id)]
  writeJSON(SKIP_KEY, all)
}
