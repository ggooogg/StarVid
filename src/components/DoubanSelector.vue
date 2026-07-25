<!-- 豆瓣分类筛选器：一级/二级分类 + 多级筛选，向上抛出选择 -->
<script setup>
import { computed } from 'vue'
import CapsuleSwitch from './CapsuleSwitch.vue'
import MultiLevelFilter from './MultiLevelFilter.vue'

const props = defineProps({
  type: { type: String, required: true }, // 内容类型：movie/tv/anime/show
  primarySelection: { type: String, default: '' }, // 一级分类当前选中值
  secondarySelection: { type: String, default: '' }, // 二级分类当前选中值
})
const emit = defineEmits(['primary-change', 'secondary-change', 'multi-level-change'])

// 各内容类型对应的一级/二级分类选项
const moviePrimary = [
  { label: '全部', value: '全部' },
  { label: '热门电影', value: '热门' },
  { label: '最新电影', value: '最新' },
  { label: '豆瓣高分', value: '豆瓣高分' },
  { label: '冷门佳片', value: '冷门佳片' },
]
const movieSecondary = [
  { label: '全部', value: '全部' },
  { label: '华语', value: '华语' },
  { label: '欧美', value: '欧美' },
  { label: '韩国', value: '韩国' },
  { label: '日本', value: '日本' },
]
const tvPrimary = [
  { label: '全部', value: '全部' },
  { label: '最近热门', value: '最近热门' },
]
const tvSecondary = [
  { label: '全部', value: 'tv' },
  { label: '国产', value: 'tv_domestic' },
  { label: '欧美', value: 'tv_american' },
  { label: '日本', value: 'tv_japanese' },
  { label: '韩国', value: 'tv_korean' },
  { label: '动漫', value: 'tv_animation' },
  { label: '纪录片', value: 'tv_documentary' },
]
const animePrimary = [
  { label: '番剧', value: '番剧' },
  { label: '剧场版', value: '剧场版' },
]
const showPrimary = [
  { label: '全部', value: '全部' },
  { label: '最近热门', value: '最近热门' },
]
const showSecondary = [
  { label: '全部', value: 'show' },
  { label: '国内', value: 'show_domestic' },
  { label: '国外', value: 'show_foreign' },
]

// 当前类型对应的一级分类选项
const primaryOptions = computed(() => {
  if (props.type === 'movie') return moviePrimary
  if (props.type === 'tv') return tvPrimary
  if (props.type === 'anime') return animePrimary
  if (props.type === 'show') return showPrimary
  return []
})

// 当前类型对应的二级分类选项
const secondaryOptions = computed(() => {
  if (props.type === 'movie') return movieSecondary
  if (props.type === 'tv') return tvSecondary
  if (props.type === 'show') return showSecondary
  return []
})

// 是否展示二级胶囊开关（依赖一级选择）
const showSecondaryCapsule = computed(() => {
  if (props.type === 'movie') return props.primarySelection !== '全部'
  if (props.type === 'tv' || props.type === 'show')
    return props.primarySelection === '最近热门'
  return false
})

// 是否展示多级筛选器（动漫始终展示；其余在选择「全部」时展示）
const showMultiLevel = computed(() => {
  if (props.type === 'anime') return true
  return props.primarySelection === '全部'
})

// 传给多级筛选器的内容类型（动漫需区分番剧/剧场版）
const multiLevelContentType = computed(() => {
  if (props.type === 'anime')
    return props.primarySelection === '剧场版' ? 'anime-movie' : 'anime-tv'
  return props.type
})

// 二级分类的标签文案（电影为「地区」，其余为「类型」）
const secondaryLabel = computed(() =>
  props.type === 'movie' ? '地区' : '类型'
)
</script>

<template>
  <div class="douban-selector">
    <div class="selector-row">
      <span class="selector-label">分类</span>
      <div class="selector-scroll">
        <CapsuleSwitch
          :key="`primary-${type}`"
          :options="primaryOptions"
          :model-value="primarySelection"
          @update:model-value="(v) => emit('primary-change', v)"
        />
      </div>
    </div>

    <div v-if="showSecondaryCapsule" class="selector-row">
      <span class="selector-label">{{ secondaryLabel }}</span>
      <div class="selector-scroll">
        <CapsuleSwitch
          :key="`secondary-${type}-${primarySelection}`"
          :options="secondaryOptions"
          :model-value="secondarySelection"
          @update:model-value="(v) => emit('secondary-change', v)"
        />
      </div>
    </div>

    <div v-if="showMultiLevel" class="selector-row">
      <span class="selector-label">筛选</span>
      <div class="selector-scroll">
        <MultiLevelFilter
          :key="`ml-${type}-${primarySelection}`"
          :content-type="multiLevelContentType"
          @change="(v) => emit('multi-level-change', v)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.douban-selector {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 639px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

.selector-label {
  flex-shrink: 0;
  min-width: 48px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.selector-scroll {
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
