<!-- 胶囊式分段切换开关（滑动高亮块，支持 v-model） -->
<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  options: { type: Array, required: true }, // 选项列表 [{ label, value }]
  modelValue: { type: String, required: true }, // 当前选中的 value
})
const emit = defineEmits(['update:modelValue', 'change'])

const containerRef = ref(null)
const btnRefs = ref([]) // 各选项按钮的 DOM 引用
const indicator = ref({ left: 0, width: 0 }) // 高亮指示块的位置与宽度

/**
 * 根据当前选中项，计算并更新高亮指示块的位置和宽度。
 */
function updateIndicator() {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  const btn = btnRefs.value[idx]
  const container = containerRef.value
  if (btn && container) {
    indicator.value = {
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    }
  }
}

/**
 * 选中某个选项，向父组件同步值并触发 change 事件。
 * @param {string} value 选中项的值
 */
function select(value) {
  emit('update:modelValue', value)
  emit('change', value)
}

// 挂载后与选中项变化时更新指示块位置
onMounted(async () => {
  await nextTick()
  updateIndicator()
})
watch(() => props.modelValue, () => updateIndicator())
</script>

<template>
  <div ref="containerRef" class="capsule">
    <span
      v-if="indicator.width"
      class="capsule-indicator"
      :style="{ left: indicator.left + 'px', width: indicator.width + 'px' }"
    />
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      ref="btnRefs"
      class="capsule-btn"
      :class="{ active: opt.value === modelValue }"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.capsule {
  position: relative;
  display: inline-flex;
  background: var(--skeleton);
  border-radius: 999px;
  padding: 4px;

  @media (max-width: 639px) {
    padding: 3px;
  }
}

.capsule-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: var(--bg-elevated);
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease-out;
  z-index: 0;
}

.capsule-btn {
  position: relative;
  z-index: 1;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 999px;
  color: var(--text-secondary);
  transition: color 0.2s ease;
  white-space: nowrap;

  @media (max-width: 639px) {
    padding: 4px 12px;
    font-size: 12px;
  }

  &.active {
    color: var(--text);
  }

  &:hover:not(.active) {
    color: var(--text);
  }
}
</style>
