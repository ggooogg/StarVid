// 播放记录与跳过配置的本地存储，键为 `source+id`

const RECORDS_KEY = 'starvid_play_records'
const SKIP_KEY = 'starvid_skip_configs'

// 影片唯一存储键：source+id
function generateStorageKey(source, id) {
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

export function savePlayRecord(source, id, record) {
  const all = readJSON(RECORDS_KEY)
  all[generateStorageKey(source, id)] = record
  writeJSON(RECORDS_KEY, all)
}

export function getPlayRecord(source, id) {
  return readJSON(RECORDS_KEY)[generateStorageKey(source, id)] || null
}

export function deletePlayRecord(source, id) {
  const all = readJSON(RECORDS_KEY)
  delete all[generateStorageKey(source, id)]
  writeJSON(RECORDS_KEY, all)
}

export function getSkipConfig(source, id) {
  return readJSON(SKIP_KEY)[generateStorageKey(source, id)] || null
}

export function saveSkipConfig(source, id, config) {
  const all = readJSON(SKIP_KEY)
  all[generateStorageKey(source, id)] = config
  writeJSON(SKIP_KEY, all)
}

export function deleteSkipConfig(source, id) {
  const all = readJSON(SKIP_KEY)
  delete all[generateStorageKey(source, id)]
  writeJSON(SKIP_KEY, all)
}
