<!-- 多级下拉筛选器：类型/地区/年代/平台/排序，聚合后上抛 -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  contentType: { type: String, default: 'movie' }, // 内容类型：movie/tv/show/anime-tv/anime-movie
})
const emit = defineEmits(['change'])

const values = ref({}) // 各维度当前选中的值
const activeCategory = ref(null) // 当前展开的维度 key
const dropdownPos = ref({ x: 0, y: 0, width: 0 }) // 下拉面板定位
const btnRefs = ref({}) // 各维度按钮引用
const dropdownRef = ref(null)

const baseAll = [{ label: '全部', value: 'all' }] // 各维度共用的「全部」选项

/**
 * 获取指定内容类型的「类型」维度选项。
 * @param {string} t 内容类型
 * @returns {Array<{label: string, value: string}>}
 */
function getTypeOptions(t) {
  switch (t) {
    case 'movie':
      return [...baseAll,
        { label: '喜剧', value: 'comedy' }, { label: '爱情', value: 'romance' },
        { label: '动作', value: 'action' }, { label: '科幻', value: 'sci-fi' },
        { label: '悬疑', value: 'suspense' }, { label: '犯罪', value: 'crime' },
        { label: '惊悚', value: 'thriller' }, { label: '冒险', value: 'adventure' },
        { label: '音乐', value: 'music' }, { label: '历史', value: 'history' },
        { label: '奇幻', value: 'fantasy' }, { label: '恐怖', value: 'horror' },
        { label: '战争', value: 'war' }, { label: '传记', value: 'biography' },
        { label: '歌舞', value: 'musical' }, { label: '武侠', value: 'wuxia' },
        { label: '灾难', value: 'disaster' }, { label: '西部', value: 'western' },
        { label: '纪录片', value: 'documentary' }, { label: '短片', value: 'short' },
      ]
    case 'tv':
      return [...baseAll,
        { label: '喜剧', value: 'comedy' }, { label: '爱情', value: 'romance' },
        { label: '悬疑', value: 'suspense' }, { label: '武侠', value: 'wuxia' },
        { label: '古装', value: 'costume' }, { label: '家庭', value: 'family' },
        { label: '犯罪', value: 'crime' }, { label: '科幻', value: 'sci-fi' },
        { label: '恐怖', value: 'horror' }, { label: '历史', value: 'history' },
        { label: '战争', value: 'war' }, { label: '动作', value: 'action' },
        { label: '冒险', value: 'adventure' }, { label: '传记', value: 'biography' },
        { label: '剧情', value: 'drama' }, { label: '奇幻', value: 'fantasy' },
        { label: '惊悚', value: 'thriller' }, { label: '灾难', value: 'disaster' },
        { label: '歌舞', value: 'musical' }, { label: '音乐', value: 'music' },
      ]
    case 'show':
      return [...baseAll,
        { label: '真人秀', value: 'reality' }, { label: '脱口秀', value: 'talkshow' },
        { label: '音乐', value: 'music' }, { label: '歌舞', value: 'musical' },
      ]
    default:
      return baseAll
  }
}

/**
 * 获取动漫类型的「类型」维度选项（番剧/剧场版专用标签）。
 * @param {string} t 内容类型（anime-movie/anime-tv）
 * @returns {Array<{label: string, value: string}>}
 */
function getLabelOptions(t) {
  switch (t) {
    case 'anime-movie':
      return [...baseAll,
        { label: '定格动画', value: 'stop_motion' }, { label: '传记', value: 'biography' },
        { label: '美国动画', value: 'us_animation' }, { label: '爱情', value: 'romance' },
        { label: '黑色幽默', value: 'dark_humor' }, { label: '歌舞', value: 'musical' },
        { label: '儿童', value: 'children' }, { label: '二次元', value: 'anime' },
        { label: '动物', value: 'animal' }, { label: '青春', value: 'youth' },
        { label: '历史', value: 'history' }, { label: '励志', value: 'inspirational' },
        { label: '恶搞', value: 'parody' }, { label: '治愈', value: 'healing' },
        { label: '运动', value: 'sports' }, { label: '人性', value: 'human_nature' },
        { label: '悬疑', value: 'suspense' }, { label: '恋爱', value: 'love' },
        { label: '魔幻', value: 'fantasy' }, { label: '科幻', value: 'sci_fi' },
      ]
    case 'anime-tv':
      return [...baseAll,
        { label: '黑色幽默', value: 'dark_humor' }, { label: '历史', value: 'history' },
        { label: '歌舞', value: 'musical' }, { label: '励志', value: 'inspirational' },
        { label: '恶搞', value: 'parody' }, { label: '治愈', value: 'healing' },
        { label: '运动', value: 'sports' }, { label: '国漫', value: 'chinese_anime' },
        { label: '人性', value: 'human_nature' }, { label: '悬疑', value: 'suspense' },
        { label: '恋爱', value: 'love' }, { label: '魔幻', value: 'fantasy' },
        { label: '科幻', value: 'sci_fi' },
      ]
    default:
      return baseAll
  }
}

/**
 * 获取「地区」维度选项。
 * @param {string} t 内容类型
 * @returns {Array<{label: string, value: string}>}
 */
function getRegionOptions(t) {
  if (t === 'movie' || t === 'anime-movie') {
    return [...baseAll,
      { label: '华语', value: 'chinese' }, { label: '欧美', value: 'western' },
      { label: '韩国', value: 'korean' }, { label: '日本', value: 'japanese' },
      { label: '中国大陆', value: 'mainland_china' }, { label: '美国', value: 'usa' },
      { label: '中国香港', value: 'hong_kong' }, { label: '中国台湾', value: 'taiwan' },
      { label: '英国', value: 'uk' }, { label: '法国', value: 'france' },
      { label: '德国', value: 'germany' }, { label: '意大利', value: 'italy' },
      { label: '西班牙', value: 'spain' }, { label: '印度', value: 'india' },
      { label: '泰国', value: 'thailand' }, { label: '俄罗斯', value: 'russia' },
      { label: '加拿大', value: 'canada' }, { label: '澳大利亚', value: 'australia' },
    ]
  }
  return [...baseAll,
    { label: '华语', value: 'chinese' }, { label: '欧美', value: 'western' },
    { label: '国外', value: 'foreign' }, { label: '韩国', value: 'korean' },
    { label: '日本', value: 'japanese' }, { label: '中国大陆', value: 'mainland_china' },
    { label: '中国香港', value: 'hong_kong' }, { label: '美国', value: 'usa' },
    { label: '英国', value: 'uk' }, { label: '泰国', value: 'thailand' },
    { label: '中国台湾', value: 'taiwan' }, { label: '意大利', value: 'italy' },
    { label: '法国', value: 'france' }, { label: '德国', value: 'germany' },
    { label: '西班牙', value: 'spain' }, { label: '俄罗斯', value: 'russia' },
    { label: '印度', value: 'india' }, { label: '加拿大', value: 'canada' },
    { label: '澳大利亚', value: 'australia' },
  ]
}

/**
 * 获取「平台」维度选项（仅剧集/综艺/番剧适用）。
 * @param {string} t 内容类型
 * @returns {Array<{label: string, value: string}>}
 */
function getPlatformOptions(t) {
  if (t === 'tv' || t === 'show' || t === 'anime-tv') {
    return [...baseAll,
      { label: '腾讯视频', value: 'tencent' }, { label: '爱奇艺', value: 'iqiyi' },
      { label: '优酷', value: 'youku' }, { label: '湖南卫视', value: 'hunan_tv' },
      { label: 'Netflix', value: 'netflix' }, { label: 'HBO', value: 'hbo' },
      { label: 'BBC', value: 'bbc' }, { label: 'NHK', value: 'nhk' },
      { label: 'CBS', value: 'cbs' }, { label: 'NBC', value: 'nbc' },
      { label: 'tvN', value: 'tvn' },
    ]
  }
  return baseAll
}

// 根据内容类型动态组装全部筛选维度（类型/地区/年代/平台/排序）
const categories = computed(() => {
  const t = props.contentType
  const list = []
  if (t !== 'anime-tv' && t !== 'anime-movie') {
    list.push({ key: 'type', label: '类型', options: getTypeOptions(t) })
  } else {
    list.push({ key: 'label', label: '类型', options: getLabelOptions(t) })
  }
  list.push({ key: 'region', label: '地区', options: getRegionOptions(t) })
  list.push({
    key: 'year',
    label: '年代',
    options: [
      { label: '全部', value: 'all' },
      { label: '2020年代', value: '2020s' },
      { label: '2025', value: '2025' }, { label: '2024', value: '2024' },
      { label: '2023', value: '2023' }, { label: '2022', value: '2022' },
      { label: '2021', value: '2021' }, { label: '2020', value: '2020' },
      { label: '2019', value: '2019' },
      { label: '2010年代', value: '2010s' }, { label: '2000年代', value: '2000s' },
      { label: '90年代', value: '1990s' }, { label: '80年代', value: '1980s' },
      { label: '70年代', value: '1970s' }, { label: '60年代', value: '1960s' },
      { label: '更早', value: 'earlier' },
    ],
  })
  if (t === 'tv' || t === 'show' || t === 'anime-tv') {
    list.push({ key: 'platform', label: '平台', options: getPlatformOptions(t) })
  }
  list.push({
    key: 'sort',
    label: '排序',
    options: [
      { label: '综合排序', value: 'T' },
      { label: '近期热度', value: 'U' },
      { label: t === 'tv' || t === 'show' ? '首播时间' : '首映时间', value: 'R' },
      { label: '高分优先', value: 'S' },
    ],
  })
  return list
})

// 当前展开维度的选项列表
const activeOptions = computed(
  () => categories.value.find((c) => c.key === activeCategory.value)?.options || []
)

/**
 * 判断某维度是否处于默认值（未做筛选）。
 * @param {string} key 维度 key
 * @returns {boolean}
 */
function isDefaultValue(key) {
  const v = values.value[key]
  return !v || v === 'all' || (key === 'sort' && v === 'T')
}

/**
 * 判断某维度的某个选项是否被选中。
 * @param {string} key 维度 key
 * @param {string} val 选项值
 * @returns {boolean}
 */
function isSelected(key, val) {
  let v = values.value[key]
  if (v === undefined) v = key === 'sort' ? 'T' : 'all' // 未选择时的默认值
  return v === val
}

/**
 * 计算维度按钮上展示的文案：默认值时显示维度名，否则显示已选项名称。
 * @param {Object} cat 维度对象
 * @returns {string}
 */
function displayText(cat) {
  if (isDefaultValue(cat.key)) return cat.label
  const opt = cat.options.find((o) => o.value === values.value[cat.key])
  return opt?.label || cat.label
}

/**
 * 展开/收起某维度的下拉面板，并计算面板定位（含移动端边界处理）。
 * @param {string} key 维度 key
 */
function toggleCategory(key) {
  if (activeCategory.value === key) {
    activeCategory.value = null
    return
  }
  activeCategory.value = key
  const el = btnRefs.value[key]
  if (el) {
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    let width = Math.max(rect.width, 300)
    let x = rect.left
    if (vw < 768) {
      width = Math.min(width, vw - 32)
      if (x + width > vw - 16) x = vw - width - 16
      if (x < 16) x = 16
    }
    dropdownPos.value = { x, y: rect.bottom + 4, width }
  }
}

/**
 * 选择某维度的选项，聚合所有维度的结果并通过 change 事件上抛。
 * 注意：排序维度传值，其余维度传中文标签（供豆瓣接口筛选使用）。
 * @param {string} key 维度 key
 * @param {string} val 选项值
 */
function selectOption(key, val) {
  values.value = { ...values.value, [key]: val }

  // 汇总各维度的最终筛选结果（默认值不参与）
  const result = { type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T' }
  Object.entries(values.value).forEach(([k, v]) => {
    if (v && v !== 'all' && (k !== 'sort' || v !== 'T')) {
      const cat = categories.value.find((c) => c.key === k)
      const opt = cat?.options.find((o) => o.value === v)
      if (opt) result[k] = k === 'sort' ? opt.value : opt.label
    }
  })
  emit('change', result)
  activeCategory.value = null
}

/**
 * 点击下拉面板与触发按钮之外的区域时，关闭下拉面板。
 * @param {MouseEvent} e
 */
function onClickOutside(e) {
  if (
    dropdownRef.value && !dropdownRef.value.contains(e.target) &&
    !Object.values(btnRefs.value).some((el) => el && el.contains(e.target))
  ) {
    activeCategory.value = null
  }
}

// 挂载/卸载时绑定与解绑「点击外部关闭」监听
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="ml-filter">
    <button
      v-for="cat in categories"
      :key="cat.key"
      :ref="(el) => (btnRefs[cat.key] = el)"
      class="filter-btn"
      :class="{ picked: !isDefaultValue(cat.key), open: activeCategory === cat.key }"
      @click="toggleCategory(cat.key)"
    >
      <span>{{ displayText(cat) }}</span>
      <el-icon class="arrow" :class="{ rotate: activeCategory === cat.key }" :size="12">
        <ArrowDown />
      </el-icon>
    </button>

    <Teleport to="body">
      <div
        v-if="activeCategory"
        ref="dropdownRef"
        class="ml-dropdown"
        :style="{ left: dropdownPos.x + 'px', top: dropdownPos.y + 'px', minWidth: dropdownPos.width + 'px' }"
      >
        <div class="ml-options">
          <button
            v-for="opt in activeOptions"
            :key="opt.value"
            class="ml-option"
            :class="{ selected: isSelected(activeCategory, opt.value) }"
            @click="selectOption(activeCategory, opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.ml-filter {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  color: var(--text-secondary);
  transition: color 0.2s ease;
  white-space: nowrap;

  @media (max-width: 639px) {
    padding: 5px 10px;
    font-size: 12px;
  }

  &:hover {
    color: var(--text);
  }

  &.picked {
    color: var(--primary);
  }

  .arrow {
    transition: transform 0.2s ease;

    &.rotate {
      transform: rotate(180deg);
    }
  }
}
</style>

<style lang="scss">
.ml-dropdown {
  position: fixed;
  z-index: 9999;
  max-width: 600px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}

.ml-options {
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.ml-option {
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 8px;
  color: var(--text);
  text-align: left;
  transition: all 0.2s ease;
  white-space: nowrap;

  @media (max-width: 639px) {
    padding: 6px 8px;
    font-size: 12px;
  }

  &:hover {
    background: var(--bg-hover);
  }

  &.selected {
    background: var(--primary-soft);
    color: var(--primary);
    border-color: var(--primary);
  }
}
</style>
