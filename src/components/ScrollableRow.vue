<!-- 横向滚动行容器：悬停显示左右箭头，按滚动位置控显隐 -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  scrollDistance: { type: Number, default: 1000 }, // 单次点击箭头滚动的距离(px)
})

const containerRef = ref(null)
const showLeft = ref(false) // 是否显示左箭头
const showRight = ref(false) // 是否显示右箭头
const hovered = ref(false) // 鼠标是否悬停

/**
 * 根据当前滚动位置判断左右箭头是否需要显示。
 */
function check() {
  const el = containerRef.value
  if (!el) return
  const threshold = 1
  showRight.value = el.scrollWidth - (el.scrollLeft + el.clientWidth) > threshold
  showLeft.value = el.scrollLeft > threshold
}

/**
 * 按方向平滑滚动容器。
 * @param {number} dir 方向：-1 向左，1 向右
 */
function scrollBy(dir) {
  containerRef.value?.scrollBy({ left: dir * props.scrollDistance, behavior: 'smooth' })
}

let ro // ResizeObserver 实例
onMounted(() => {
  check()
  window.addEventListener('resize', check)
  // 监听容器尺寸变化，动态更新箭头显隐
  if (containerRef.value) {
    ro = new ResizeObserver(() => check())
    ro.observe(containerRef.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', check)
  ro?.disconnect()
})
</script>

<template>
  <div
    class="scroll-row"
    @mouseenter="hovered = true; check()"
    @mouseleave="hovered = false"
  >
    <div ref="containerRef" class="scroll-track scrollbar-hide" @scroll="check()">
      <slot />
    </div>

    <button
      v-if="showLeft"
      class="scroll-arrow left"
      :class="{ shown: hovered }"
      @click="scrollBy(-1)"
    >
      <el-icon :size="24"><ArrowLeft /></el-icon>
    </button>
    <button
      v-if="showRight"
      class="scroll-arrow right"
      :class="{ shown: hovered }"
      @click="scrollBy(1)"
    >
      <el-icon :size="24"><ArrowRight /></el-icon>
    </button>
  </div>
</template>

<style scoped lang="scss">
.scroll-row {
  position: relative;
}

.scroll-track {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 4px 16px 52px;
  scroll-behavior: smooth;
}

.scroll-arrow {
  display: none;
  position: absolute;
  top: 0;
  bottom: 52px;
  width: 64px;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: var(--text-secondary);

  &.shown {
    opacity: 1;
  }

  &:hover {
    color: var(--text);
  }

  &.left {
    left: 0;
    background: linear-gradient(to right, var(--bg) 30%, transparent);
  }

  &.right {
    right: 0;
    background: linear-gradient(to left, var(--bg) 30%, transparent);
  }
}

@media (min-width: 768px) {
  .scroll-arrow {
    display: flex;
  }
}
</style>
