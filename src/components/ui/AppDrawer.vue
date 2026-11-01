<!-- 右侧抽屉：遮罩 + 滑入面板，Esc / 点击遮罩关闭 -->
<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  width: { type: String, default: '440px' },
  ariaLabel: { type: String, default: '' },
})
const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

// 打开时锁定页面滚动并监听 Esc
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-root">
        <div class="drawer-overlay" @click="emit('close')" />
        <aside
          class="drawer-panel"
          :style="{ '--drawer-width': width }"
          role="dialog"
          aria-modal="true"
          :aria-label="ariaLabel"
        >
          <slot />
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--drawer-width);
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.18);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;

  .drawer-panel {
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;

  .drawer-panel {
    transform: translateX(100%);
  }
}
</style>
