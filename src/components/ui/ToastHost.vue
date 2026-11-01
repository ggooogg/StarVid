<!-- 轻量全局提示，替代组件库的消息弹窗 -->
<script setup>
import { toasts } from '../../lib/toast'
</script>

<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <div v-for="item in toasts" :key="item.id" class="toast" :class="item.type">
          {{ item.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toast-host {
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  max-width: 80vw;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  font-size: 13px;
  box-shadow: var(--shadow);

  &.success {
    border-color: var(--primary);
    color: var(--primary);
  }

  &.warning {
    border-color: #f59e0b;
    color: #f59e0b;
  }

  &.error {
    border-color: #ef4444;
    color: #ef4444;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
